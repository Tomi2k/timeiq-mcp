import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { zodToJsonSchema } from "zod-to-json-schema";

import { config, isConfigValid, configErrors } from "./config.js";
import readline from "readline";
import { client, TimeIQError } from "./client.js";
import { schemas } from "./schemas.js";

// Import all tools
import { timeTools } from "./tools/time.js";
import { projectTools } from "./tools/projects.js";
import { peopleTools } from "./tools/people.js";
import { reportTools } from "./tools/reports.js";
import { expenseTools } from "./tools/expenses.js";
import { serviceTools } from "./tools/services.js";
import { timesheetTools } from "./tools/timesheets.js";
import { invoiceTools } from "./tools/invoices.js";
import { notificationTools } from "./tools/notifications.js";
import { settingsTools } from "./tools/settings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Combine all tools into a single registry
const toolsRegistry: Record<string, {
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}> = {
  ...timeTools,
  ...projectTools,
  ...peopleTools,
  ...reportTools,
  ...expenseTools,
  ...serviceTools,
  ...timesheetTools,
  ...invoiceTools,
  ...notificationTools,
  ...settingsTools,
};

// Setup read-only resources
// 1. timeiq://schemas - zod-to-JSON-Schema dump
const jsonSchemas: Record<string, any> = {};
for (const [name, schema] of Object.entries(schemas)) {
  jsonSchemas[name] = zodToJsonSchema(schema, name);
}

// 2. timeiq://endpoints - markdown spec loader
let specContent = "# TimeIQ API Specification\nSpec file could not be loaded.";
try {
  const rootPath = join(__dirname, "../timeiq-api-spec.md");
  if (fs.existsSync(rootPath)) {
    specContent = fs.readFileSync(rootPath, "utf-8");
  } else {
    const parentPath = join(__dirname, "../../timeiq-api-spec.md");
    if (fs.existsSync(parentPath)) {
      specContent = fs.readFileSync(parentPath, "utf-8");
    }
  }
} catch {
  // Fallback
}

// 3. timeiq://me - cached /api/people/me (60s TTL)
let cachedMe: any = null;
let lastMeFetchTime = 0;

async function getCachedMe() {
  const now = Date.now();
  if (cachedMe && (now - lastMeFetchTime < 60000)) {
    return cachedMe;
  }
  cachedMe = await client.get("/api/people/me");
  lastMeFetchTime = now;
  return cachedMe;
}

// Initialize MCP Server
const server = new Server(
  {
    name: "timeiq-mcp",
    version: "1.3.1",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Register Tools Listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.entries(toolsRegistry).map(([name, tool]) => {
      // Convert Zod schema to JSON Schema for MCP capability details
      const jsonSchema = zodToJsonSchema(tool.inputSchema);
      // Clean up zod-to-json-schema root wrapping if present
      const cleanSchema = (jsonSchema as any).properties 
        ? jsonSchema 
        : { type: "object", properties: {}, additionalProperties: false };

      return {
        name,
        description: tool.description,
        inputSchema: cleanSchema,
      };
    }),
  };
});

// Register Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = toolsRegistry[name];

  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  try {
    // Validate arguments with Zod
    const validatedArgs = tool.inputSchema.parse(args || {});
    // Execute handler
    const result = await tool.handler(validatedArgs);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err: any) {
    let errorMsg = err.message;
    if (err instanceof TimeIQError) {
      errorMsg = `TimeIQ Error (${err.status}): ${err.message}`;
      if (err.errors) {
        errorMsg += `\nDetails: ${JSON.stringify(err.errors)}`;
      }
    } else if (err.errors) {
      // Zod Validation error
      errorMsg = `Validation Error: ${err.errors.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", ")}`;
    }

    return {
      content: [
        {
          type: "text",
          text: `❌ Error executing tool '${name}':\n${errorMsg}`,
        },
      ],
      isError: true,
    };
  }
});

// Register Resources Listing
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "timeiq://schemas",
        name: "TimeIQ Entity Schemas",
        description: "JSON Schema definitions for every primary TimeIQ entity (Person, Client, Project, TimeEntry, etc.)",
        mimeType: "application/json",
      },
      {
        uri: "timeiq://endpoints",
        name: "TimeIQ API Specifications",
        description: "The complete markdown reference of the reverse-engineered TimeIQ Angular API",
        mimeType: "text/markdown",
      },
      {
        uri: "timeiq://me",
        name: "Current Acting User Record",
        description: "Snapshot of the authenticated acting user's profile and permissions (cached 60s)",
        mimeType: "application/json",
      },
    ],
  };
});

// Register Resource Reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "timeiq://schemas") {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(jsonSchemas, null, 2),
        },
      ],
    };
  }

  if (uri === "timeiq://endpoints") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: specContent,
        },
      ],
    };
  }

  if (uri === "timeiq://me") {
    try {
      const meSnapshot = await getCachedMe();
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(meSnapshot, null, 2),
          },
        ],
      };
    } catch (err: any) {
      throw new Error(`Failed to read resource 'timeiq://me': ${err.message}`);
    }
  }

  throw new Error(`Unsupported resource URI: ${uri}`);
});

// Boot Stdio transport
async function main() {
  // Check if explicit setup is requested
  if (process.argv.includes("setup") || process.argv.includes("--setup")) {
    const { runSetup } = await import("./setup.js");
    await runSetup();
    return;
  }

  // Check if configuration validation failed
  if (!isConfigValid) {
    if (process.stdout.isTTY) {
      console.error("\x1b[31m❌ Konfigurations-Validierung fehlgeschlagen:\x1b[0m");
      configErrors.forEach((err) => {
        console.error(`  - ${err}`);
      });
      
      console.log("\n\x1b[33mEs wurden unvollständige Umgebungsvariablen gefunden.\x1b[0m");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      
      const answer = await new Promise<string>((resolve) => {
        rl.question("\x1b[1m\x1b[36mMöchtest du den interaktiven Setup-Assistenten jetzt starten? (j/n) [j]: \x1b[0m", (ans) => {
          resolve(ans.trim().toLowerCase());
        });
      });
      rl.close();

      if (answer === "n" || answer === "nein" || answer === "no") {
        console.log("Setup abgebrochen. Bitte konfiguriere die Umgebungsvariablen manuell.");
        process.exit(1);
      } else {
        const { runSetup } = await import("./setup.js");
        await runSetup();
        return;
      }
    } else {
      console.error("❌ Configuration validation failed:");
      configErrors.forEach((err) => {
        console.error(`  - ${err}`);
      });
      process.exit(1);
    }
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 TimeIQ MCP server ready");
}

main().catch((err) => {
  console.error("❌ Fatal error starting TimeIQ MCP server:", err);
  process.exit(1);
});
