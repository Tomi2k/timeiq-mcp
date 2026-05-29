# TimeIQ MCP Server — Initialization & Reference Guide

This initialization file serves as the single source of truth and architectural reference for the TimeIQ Model Context Protocol (MCP) server project. Any AI assistant or developer working on this codebase should read this file first to understand the architecture, configuration, critical API behaviors, and deployment processes.

---

## 🗺️ Project Architecture & Layout

The TimeIQ MCP server is a TypeScript application that exposes the internal JSON API of the TimeIQ web application to AI assistants using the MCP stdio transport.

```text
/Users/timothyscherman/Antigravity/timeiq mcp/timeiq-mcp/
├── package.json               # Scripts, Node engines, and dependencies (Vitest, Zod, SDK)
├── tsconfig.json             # ES2022 compiler configuration
├── README.md                 # User-facing installation, prompts, and documentation
├── TimeIQ-MCP-Audit.md       # Audit trail of security issues and logical fixes
├── timeiq-api-spec.md        # API Endpoint catalog and schemas
├── run_integration_tests.js  # 34-step End-to-End live integration test runner
├── src/
│   ├── index.ts              # MCP stdio server bootstrap and tool registration
│   ├── config.ts             # Strict zod-validated environment variables loader
│   ├── auth.ts               # Login handler and base64-resilient CookieJar
│   ├── client.ts             # Native fetch-based HTTP client with timeout & auto-retry
│   ├── schemas.ts            # Common Zod entities schemas (Client, Project, Entry)
│   ├── utils/
│   │   ├── dates.ts          # ISO and YYYY-MM-DD date helpers with timezone offsets
│   │   ├── slug.ts           # Slugs generator for API URLs
│   │   └── changeset.ts      # Computes differences for PUT updates
│   └── tools/
│       ├── time.ts           # Time tracking & stopwatches (timer tools)
│       ├── projects.ts       # Clients & projects management
│       ├── people.ts         # User profiles & Slack ID mapping
│       ├── reports.ts        # Double-nested search and standard reports
│       ├── expenses.ts       # Expense types, categories, and entries
│       ├── services.ts       # Services and categories
│       ├── timesheets.ts     # Timesheet submission, reminders, & approvals
│       ├── invoices.ts       # Invoices, line items, and payment status updates
│       ├── settings.ts       # Settings & timezone profiles
│       └── notifications.ts  # Notifications list and dispatchers
└── tests/                    # Vitest unit test suite (Vitest 2.0)
    ├── dates.test.ts
    ├── slug.test.ts
    ├── slack.test.ts         # Verifies slack user mappings and ID lookups
    ├── projects.test.ts      # Verifies project listing and archiving
    └── changeset.test.ts
```

---

## ⚙️ Environment Configuration

The server expects standard environment variables, which can be defined in a local `.env` file or passed through the MCP client configuration.

| Variable Name | Type | Description |
| :--- | :--- | :--- |
| `TIMEIQ_SUBDOMAIN` | String | Subdomain for TimeIQ tenant (e.g. `ideasbytcgmbh` from `subdomain.timeiq.com`) |
| `TIMEIQ_EMAIL` | String | Credentials email address used to log in |
| `TIMEIQ_PASSWORD` | String | Password for the credentials email |
| `TIMEIQ_DEFAULT_TZ` | String | Default timezone (e.g. `Europe/Berlin`, `Asia/Makassar`) |
| `TIMEIQ_DRY_RUN` | `0` or `1` | Global write-prevention flag. If `1`, returns write payloads without calling API |
| `TIMEIQ_SLACK_MAPPING`| String | JSON string mapping Slack User IDs to TimeIQ emails (see mapping details below) |

### 🔗 Slack User ID Mapping Format
To map Slack-originated interactions to the correct TimeIQ profile, the mapping string resolves Slack IDs to emails:
```json
{
  "U123456789": "john.doe@company.com",
  "U987654321": "jane.smith@company.com"
}
```

---

## 🧠 Critical API Insights & Resolutions

Through rigorous development and live testing, several non-obvious API logic constraints were discovered and fixed:

### 1. Resilient Cookie Parsing (H1)
* **API Behavior**: The session token returned by TimeIQ in `Set-Cookie` contains Base64 padding characters (`=`). A naive `.split("=")` split breaks the token.
* **Resolution**: Extraction must find the first `=` index and slice the remainder as the full token:
  ```typescript
  const eqIdx = cookieStr.indexOf("=");
  const key = cookieStr.substring(0, eqIdx).trim();
  const value = cookieStr.substring(eqIdx + 1).trim();
  ```

### 2. Running Stopwatch Updates (Timer)
* **API Behavior**: Executing `PUT /api/timer/{id}` returns a `404 Not Found` error. Active stopwatch updates must go through `/api/timer/actions/updateTimeEntry`.
* **Payload Constraint**: The update endpoint strictly expects a **flat body payload** containing both the target ID and the fields to change. Do NOT nest the fields in a `changeset` wrapper.
* **Resolution**:
  ```typescript
  // Flattens args.changeset directly into the root request body
  return client.put("/api/timer/actions/updateTimeEntry", { id: args.id, ...args.changeset });
  ```

### 3. Report Search Parameter Wrap (Double-Nesting)
* **API Behavior**: The `/api/reports/search/time` and `/api/reports/search/expenses` routes return a `422 Unprocessable Entity` error if filters are passed as standard single-nested parameters.
* **Payload Constraint**: They require a strict **double-nested parameters shape**:
  ```json
  {
    "parameters": {
      "parameters": {
        "start_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD"
      }
    }
  }
  ```
* **Resolution**: In `src/tools/reports.ts`, search parameters are doubly-nested:
  ```typescript
  const requestBody = {
    parameters: {
      parameters: {
        start_date: args.start_date,
        end_date: args.end_date,
        ...otherFilters
      }
    }
  };
  ```

### 4. Slack User Lookup Abstraction
* **Behavior**: Inbound requests can reference users in multiple formats: Slack numeric ID (`U123...`), Slack Username (`@jane`), Name slug (`jane-smith`), or raw Email.
* **Resolution**: The server resolves profiles cleanly by traversing:
  1. Direct Slack ID to Email configuration mapping.
  2. Workspace email matches.
  3. Dynamic Username/Slug matches.

---

## 🛠️ CLI Operations & Testing

### 1. Build and Run
* **Install**: `npm install`
* **Build**: `npm run build` (outputs compilation to `dist/`)
* **Dev Startup**: `npm run start` or `node dist/index.js`
* **Interactive Setup CLI**: `npm run setup` / `node dist/setup.js` (prompts for config variables and generates a local `.env` and client snippets).

### 2. Testing Suites
* **Unit Tests**: `npm run test` (runs Vitest suites for dates, slug, changeset, projects, and slack mappings).
* **E2E Live Integration Suite**: `node run_integration_tests.js`
  * Runs 34 comprehensive tests against the active TimeIQ tenant.
  * Validates clients, projects, categories, stopwatches, expenses, timesheets, and invoices.

---

## 🚀 VPS Production Deployment Reference

The production Slack Gateway and MCP server are hosted in a Dockerized environment.

* **Host IP**: `72.62.35.158`
* **Container Name**: `hermes-agent-eg0a-hermes-agent-1`
* **Repository Path**: `/docker/hermes-agent-eg0a/data/mcp-servers/timeiq-mcp`
* **Host Gateway Logs**: `/docker/hermes-agent-eg0a/data/logs/gateway.log`

### Clean Pull & Rebuild on VPS
1. SSH to VPS host.
2. Navigate to project:
   ```bash
   cd /docker/hermes-agent-eg0a/data/mcp-servers/timeiq-mcp
   git pull
   ```
3. Rebuild inside Node container environment:
   ```bash
   docker exec -u hermes hermes-agent-eg0a-hermes-agent-1 bash -c "cd /opt/data/mcp-servers/timeiq-mcp && npm run build"
   ```

### Gateway Process Daemon Control
* The gateway runs with safety guards and **refuses to run under the root user context**.
* Launching multiple instances will lead to Socket Mode collisions. Use a detached shell with clean process clearance:
  ```bash
  # Clear existing processes
  docker exec hermes-agent-eg0a-hermes-agent-1 pkill -9 -f "hermes gateway"
  
  # Start detached single instance as the correct 'hermes' user
  docker exec -d -u hermes hermes-agent-eg0a-hermes-agent-1 hermes gateway run --replace
  
  # Check status
  docker exec -u hermes hermes-agent-eg0a-hermes-agent-1 hermes status
  ```

---

## 📎 Client Integration Snippets

### Claude Desktop Configuration
Add this to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "timeiq": {
      "command": "node",
      "args": ["/absolute/path/to/timeiq-mcp/dist/index.js"],
      "env": {
        "TIMEIQ_SUBDOMAIN": "ideasbytcgmbh",
        "TIMEIQ_EMAIL": "your-email@domain.com",
        "TIMEIQ_PASSWORD": "your-secure-password",
        "TIMEIQ_DEFAULT_TZ": "Europe/Berlin",
        "TIMEIQ_DRY_RUN": "0"
      }
    }
  }
}
```

### Hermes VPS Configuration (`config.yaml`)
Add this under `mcp_servers` section:
```yaml
mcp_servers:
  timeiq:
    command: "node"
    args:
      - "/opt/data/mcp-servers/timeiq-mcp/dist/index.js"
    env:
      TIMEIQ_SUBDOMAIN: "ideasbytcgmbh"
      TIMEIQ_EMAIL: "your-email@domain.com"
      TIMEIQ_PASSWORD: "your-secure-password"
      TIMEIQ_DEFAULT_TZ": "Europe/Berlin"
      TIMEIQ_DRY_RUN: "0"
```
