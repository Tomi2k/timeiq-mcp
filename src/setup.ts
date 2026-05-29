import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI Escape Codes for beautiful styling
const C_RESET = "\x1b[0m";
const C_BOLD = "\x1b[1m";
const C_CYAN = "\x1b[36m";
const C_GREEN = "\x1b[32m";
const C_YELLOW = "\x1b[33m";
const C_RED = "\x1b[31m";

export async function runSetup() {
  const rl = readline.createInterface({ input, output });

  console.log(`\n${C_BOLD}${C_CYAN}====================================================${C_RESET}`);
  console.log(`${C_BOLD}${C_GREEN}    TimeIQ MCP Server Setup Wizard (Version 1.3.0)   ${C_RESET}`);
  console.log(`${C_BOLD}${C_CYAN}====================================================${C_RESET}\n`);
  console.log("Dieser Assistent hilft dir, die Konfiguration und das Slack User-Mapping");
  console.log("für deinen TimeIQ MCP-Server schnell und einfach einzurichten.\n");

  try {
    // 1. Tenant Subdomain
    const defaultTenant = process.env.TIMEIQ_TENANT || "";
    const tenantPrompt = defaultTenant 
      ? `1. TimeIQ-Subdomain (z.B. deinefirma) [Standard: ${defaultTenant}]: `
      : "1. TimeIQ-Subdomain (z.B. deinefirma): ";
    let tenant = await rl.question(`${C_BOLD}${C_YELLOW}${tenantPrompt}${C_RESET}`);
    tenant = tenant.trim() || defaultTenant;
    while (!tenant) {
      console.log(`${C_RED}❌ Die Subdomain ist erforderlich!${C_RESET}`);
      tenant = await rl.question(`${C_BOLD}${C_YELLOW}1. TimeIQ-Subdomain (z.B. deinefirma): ${C_RESET}`);
      tenant = tenant.trim();
    }

    // 2. Admin Email
    const defaultEmail = process.env.TIMEIQ_EMAIL || "";
    const emailPrompt = defaultEmail 
      ? `2. Admin E-Mail-Adresse bei TimeIQ [Standard: ${defaultEmail}]: `
      : "2. Admin E-Mail-Adresse bei TimeIQ: ";
    let email = await rl.question(`${C_BOLD}${C_YELLOW}${emailPrompt}${C_RESET}`);
    email = email.trim() || defaultEmail;
    while (!email || !email.includes("@")) {
      console.log(`${C_RED}❌ Bitte gib eine gültige E-Mail-Adresse ein!${C_RESET}`);
      email = await rl.question(`${C_BOLD}${C_YELLOW}2. Admin E-Mail-Adresse bei TimeIQ: ${C_RESET}`);
      email = email.trim();
    }

    // 3. Admin Password
    let password = await rl.question(`${C_BOLD}${C_YELLOW}3. TimeIQ Passwort: ${C_RESET}`);
    password = password.trim();
    while (!password) {
      console.log(`${C_RED}❌ Das Passwort darf nicht leer sein!${C_RESET}`);
      password = await rl.question(`${C_BOLD}${C_YELLOW}3. TimeIQ Passwort: ${C_RESET}`);
      password = password.trim();
    }

    // 4. Admin Slack User ID
    console.log(`\n${C_BOLD}${C_CYAN}--- Slack-ID Mapping & Sicherheitsbereich ---${C_RESET}`);
    console.log("Wir verknüpfen nun Slack User-IDs mit den jeweiligen E-Mail-Adressen.");
    console.log("Der Admin-User hat Vollzugriff, während andere User nur eigene Einträge bearbeiten dürfen.\n");

    let adminSlackId = await rl.question(`${C_BOLD}${C_YELLOW}4. Slack-User-ID des Admins (z.B. U12345678): ${C_RESET}`);
    adminSlackId = adminSlackId.trim().toUpperCase();
    while (!adminSlackId || !adminSlackId.startsWith("U")) {
      console.log(`${C_RED}❌ Eine gültige Slack-User-ID beginnt meistens mit 'U'!${C_RESET}`);
      adminSlackId = await rl.question(`${C_BOLD}${C_YELLOW}4. Slack-User-ID des Admins (z.B. U12345678): ${C_RESET}`);
      adminSlackId = adminSlackId.trim().toUpperCase();
    }

    // Initialize Slack Map
    const slackMap: Record<string, string> = {};
    slackMap[adminSlackId] = email;

    // 5. Query Additional Coworkers
    let addMore = true;
    while (addMore) {
      const askMore = await rl.question(`\nMöchtest du weitere User anlegen? (j/n) [n]: `);
      const answer = askMore.trim().toLowerCase();
      if (answer === "j" || answer === "ja" || answer === "yes" || answer === "y") {
        let userSlackId = await rl.question(`${C_BOLD}${C_YELLOW}  -> Slack-User-ID des zusätzlichen Users: ${C_RESET}`);
        userSlackId = userSlackId.trim().toUpperCase();
        while (!userSlackId || !userSlackId.startsWith("U")) {
          console.log(`${C_RED}  ❌ Eine gültige Slack-User-ID beginnt meistens mit 'U'!${C_RESET}`);
          userSlackId = await rl.question(`${C_BOLD}${C_YELLOW}  -> Slack-User-ID des zusätzlichen Users: ${C_RESET}`);
          userSlackId = userSlackId.trim().toUpperCase();
        }

        let userEmail = await rl.question(`${C_BOLD}${C_YELLOW}  -> E-Mail-Adresse des Users bei TimeIQ: ${C_RESET}`);
        userEmail = userEmail.trim();
        while (!userEmail || !userEmail.includes("@")) {
          console.log(`${C_RED}  ❌ Bitte gib eine gültige E-Mail-Adresse ein!${C_RESET}`);
          userEmail = await rl.question(`${C_BOLD}${C_YELLOW}  -> E-Mail-Adresse des Users bei TimeIQ: ${C_RESET}`);
          userEmail = userEmail.trim();
        }

        slackMap[userSlackId] = userEmail;
        console.log(`${C_GREEN}  ✓ User ${userSlackId} erfolgreich mit ${userEmail} gemappt!${C_RESET}`);
      } else {
        addMore = false;
      }
    }

    // 6. Safety Mode (Dry-Run)
    const dryRunPrompt = `\n5. Dry-Run-Sicherheitsmodus standardmäßig aktivieren? (j/n) [j]: `;
    const dryRunAnswer = await rl.question(`${C_BOLD}${C_YELLOW}${dryRunPrompt}${C_RESET}`);
    const dryRunVal = dryRunAnswer.trim().toLowerCase();
    const dryRun = !(dryRunVal === "n" || dryRunVal === "nein" || dryRunVal === "no");

    rl.close();

    const slackMapString = JSON.stringify(slackMap);

    // Save to .env
    const envContent = `# TimeIQ MCP Server Configuration (Generated by Setup CLI Wizard)
TIMEIQ_TENANT=${tenant}
TIMEIQ_EMAIL=${email}
TIMEIQ_PASSWORD=${password}
TIMEIQ_DRY_RUN=${dryRun}
TIMEIQ_SLACK_MAP='${slackMapString}'
TIMEIQ_DEFAULT_TZ=Europe/Berlin
TIMEIQ_LOG_LEVEL=info
`;

    // Locate the root workspace directory to write .env
    // If running from dist/setup.js, the root is one level up from build path
    const projectRoot = fs.existsSync(path.join(__dirname, "../package.json")) 
      ? path.join(__dirname, "..") 
      : path.join(__dirname, "../..");
      
    const envFilePath = path.join(projectRoot, ".env");
    fs.writeFileSync(envFilePath, envContent, "utf-8");

    console.log(`\n${C_BOLD}${C_GREEN}====================================================${C_RESET}`);
    console.log(`${C_BOLD}${C_GREEN}    Konfiguration erfolgreich eingerichtet!         ${C_RESET}`);
    console.log(`${C_BOLD}${C_GREEN}====================================================${C_RESET}\n`);
    console.log(`Die Datei ${C_BOLD}.env${C_RESET} wurde in folgendem Pfad gespeichert/aktualisiert:`);
    console.log(`👉 ${C_CYAN}${envFilePath}${C_RESET}\n`);

    console.log(`${C_BOLD}${C_CYAN}--- GENERIERTE KONFIGURATIONS-CODES ---${C_RESET}\n`);

    // A. Claude Desktop
    console.log(`${C_BOLD}A. Claude Desktop Config (in 'claude_desktop_config.json' einfügen):${C_RESET}`);
    const claudeJson = {
      mcpServers: {
        "timeiq-mcp": {
          command: "npx",
          args: ["-y", "timeiq-mcp"],
          env: {
            TIMEIQ_TENANT: tenant,
            TIMEIQ_EMAIL: email,
            TIMEIQ_PASSWORD: password,
            TIMEIQ_DRY_RUN: String(dryRun),
            TIMEIQ_SLACK_MAP: slackMapString
          }
        }
      }
    };
    console.log(`${C_GREEN}${JSON.stringify(claudeJson, null, 2)}${C_RESET}\n`);

    // B. Hermes / VPS config.yaml
    console.log(`${C_BOLD}B. Hermes / VPS config.yaml Block (in 'config.yaml' einfügen):${C_RESET}`);
    const yamlBlock = `mcp:
  servers:
    timeiq-mcp:
      command: "npx"
      args: ["-y", "timeiq-mcp"]
      env:
        TIMEIQ_TENANT: "${tenant}"
        TIMEIQ_EMAIL: "${email}"
        TIMEIQ_PASSWORD: "${password}"
        TIMEIQ_DRY_RUN: "${dryRun}"
        TIMEIQ_SLACK_MAP: '${slackMapString}'`;
    console.log(`${C_GREEN}${yamlBlock}${C_RESET}\n`);

    console.log(`${C_BOLD}C. Gestartete Benutzerübersicht:${C_RESET}`);
    console.table(
      Object.entries(slackMap).map(([slackId, userMail]) => ({
        "Slack User-ID": slackId,
        "TimeIQ E-Mail": userMail,
        "Rolle": slackId === adminSlackId ? "Admin" : "Mitarbeiter"
      }))
    );

    console.log(`\nStarte den Server nun mit ${C_BOLD}npm start${C_RESET} oder ${C_BOLD}npx timeiq-mcp${C_RESET}.\n`);

  } catch (err: any) {
    console.error(`\n${C_RED}❌ Fehler während des Setups: ${err.message}${C_RESET}\n`);
    rl.close();
    process.exit(1);
  }
}

// Check if this script is executed directly from command line
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith("setup.js") || 
  process.argv[1].endsWith("setup.ts") ||
  process.argv.includes("setup") ||
  process.argv.includes("--setup")
);

if (isDirectRun) {
  runSetup();
}
