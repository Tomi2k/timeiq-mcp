# TimeIQ Model Context Protocol (MCP) Server

[![NPM Version](https://img.shields.io/npm/v/timeiq-mcp.svg?style=flat-flat)](https://www.npmjs.com/package/timeiq-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [!NOTE]
> **Version 1.3**
> Created by **Timothy Maximilian Scherman** ([www.timothyscherman.de](https://www.timothyscherman.de) / [www.schild-roth.com](https://www.schild-roth.com)) with the purpose of making agency life in the service and service-business area a bit easier, and equipping own AI agents with the ability to create time entries as well as automatically adding regularly recurring items via cron jobs.

A production-ready, fully anonymized **Model Context Protocol (MCP)** server for TimeIQ time tracking. It provides a standard integration pattern that allows LLM agents (like Claude Desktop, Cursor, or custom gateway agents running on Hermes) to view and manage time entries, projects, clients, reports, invoices, expenses, services, and timesheets via a secure **stdio transport**.

---

## 🚀 Key Features

* **Anonymized & Secure by Design**: Zero hardcoded credentials or branding (no mentions of internal subdomains, private domains, or local credentials).
* **Interactive Setup Wizard**: Run `npx timeiq-mcp setup` to automatically generate all env maps, define Slack admins/coworkers interactively, and get copy-paste ready config snippets.
* **Safe-by-Default (Dry-Run)**: Defaults to `TIMEIQ_DRY_RUN=true` to prevent agents from inadvertently creating, modifying, or deleting entries. All modification requests describe the intended action without executing it.
* **Bulk Action Gate**: Forces safety confirmation for multi-record operations.
* **Complete Reverse-Engineered Coverage**: Exposes **50+ tools** and **3 read-only resources** spanning the entire TimeIQ SPA API.
* **In-Memory Session Security**: Employs an in-memory session cookie jar (zero tokens or cookies are persisted to disk).
* **Robust Timezone & Input Handling**: Strict date validation (prevents JS calendar rollover bugs like `2026-02-30` silently resolving to `March 2nd`) and automatic snake_case slugifiers that convert names with German diacritics and umlauts (e.g., `ä` → `ae`, `ß` → `ss`).
* **Slack Member ID Mapping & Security**: Supports the `TIMEIQ_SLACK_MAP` environment variable to securely map Slack user IDs directly to individual coworker emails, ensuring hard user-level data ownership and action boundaries.

---

## 🤖 AI Agent Compatibility & Query Examples

### 🧠 Primarily Built for Hermes (Zweibot)
This MCP setup was **primarily designed for integration with the Hermes agent (Zweibot)**. It runs flawlessly on your remote VPS container and enables frictionless, real-time time tracking and project management directly via Slack.

**Universal MCP Compatibility**: Because this server fully conforms to the **Model Context Protocol (MCP)** specification, **any other AI assistant or client (such as Claude Desktop, Cursor, Cline, Windsurf, or Cloud Coworker)** can integrate and work with it immediately out of the box with zero custom adjustments.

---

### 💬 Practical Query Examples (Prompts) for the AI

Here are concrete, real-world examples of natural language prompts you can give to your AI coworker (e.g. Hermes in Slack or Claude in Claude Desktop/Cursor), along with the corresponding MCP tools mapped under the hood:

#### 1. Time Tracking
* **Query**: *“Please book 15 minutes today on the project '[Client Name] - SEO monatlich' with the description: Developing content strategy.”*
  - **MCP Tool**: `timeiq_time_create` (using `start_time` and `end_time` or `duration` style).
* **Query**: *“I worked on the website today from 10:00 AM to 11:30 AM. Please log that time.”*
  - **MCP Tool**: `timeiq_time_create` (automatically parses and converts the duration to 90 minutes).
* **Query**: *“Delete my time entry with the ID 44088.”*
  - **MCP Tool**: `timeiq_time_delete`.

#### 2. Running Stopwatches (Timer)
* **Query**: *“Start a stopwatch for the 'Marketing Campaign' project and set the topic to 'Create social media post'.”*
  - **MCP Tool**: `timeiq_timer_start`.
* **Query**: *“How long has my current stopwatch been running and what am I working on?”*
  - **MCP Tool**: `timeiq_timer_get`.
* **Query**: *“Change the notes of my active timer to 'Review round with the client'.”*
  - **MCP Tool**: `timeiq_timer_update` (routes a flat PUT payload to the correct `/actions/updateTimeEntry` API endpoint).
* **Query**: *“I'm finished, please stop the stopwatch and save the time.”*
  - **MCP Tool**: `timeiq_timer_stop` (stops the running timer and persists the time entry).
* **Query**: *“Cancel the active stopwatch and discard the time.”*
  - **MCP Tool**: `timeiq_timer_cancel` (deletes the running stopwatch without creating any time entry).

#### 3. Managing Projects & Clients
* **Query**: *“Show me a list of all our active projects.”*
  - **MCP Tool**: `timeiq_project_list` (filtered by `active`).
* **Query**: *“Can you please archive the 'Insurance Directory' project?”*
  - **MCP Tool**: `timeiq_project_archive` (safely looks up the project ID and archives it via bulk-routing).
* **Query**: *“Create a new client named 'ACME GmbH' and set up a project called 'Web Design 2026' for them.”*
  - **MCP Tools**: `timeiq_client_create` followed by `timeiq_project_create`.

#### 4. Reports & Analysis
* **Query**: *“Generate a report for this week and show me the total hours booked.”*
  - **MCP Tool**: `timeiq_report_standard` (returns high-level summary KPIs).
* **Query**: *“Search for all my time entries logged today.”*
  - **MCP Tool**: `timeiq_report_search_time` (executes search utilizing double-nested parameters).
* **Query**: *“Are there any coworkers who have not completed their required hours this week?”*
  - **MCP Tool**: `timeiq_report_missing_time`.

#### 5. Invoices & Expenses
* **Query**: *“Show me all invoices for '[Client Name]' from this year.”*
  - **MCP Tool**: `timeiq_invoice_list_for_client`.
* **Query**: *“Log a new expense of 45 € for 'Train Ticket' on the project 'SEO monatlich'.”*
  - **MCP Tool**: `timeiq_expense_create`.
* **Query**: *“Mark invoice number RE-2026-004 as fully paid.”*
  - **MCP Tool**: `timeiq_invoice_mark_paid` (resolved dynamically using `timeiq_invoice_get_by_number`).

#### 6. Timesheets & System Info
* **Query**: *“Submit my timesheet for the current period for approval.”*
  - **MCP Tool**: `timeiq_timesheet_submit` (automatically fetches the active period and submits it).
* **Query**: *“Who am I in TimeIQ and what are my permissions?”*
  - **MCP Tool**: `timeiq_whoami` (retrieves full profile details from `/api/people/me`).

---

## 🛠️ Installation & Setup

### Requirements
* Node.js **>= 20.0.0**

### ⚡ Quick Interactive Setup Wizard (Recommended)

To configure the server, map Slack User IDs to emails, and generate config blocks instantly, run the zero-dependency interactive setup CLI wizard:

```bash
npm run setup
```
or directly via:
```bash
npx timeiq-mcp setup
```

The wizard will guide you through:
1. Entering your TimeIQ Tenant subdomain, email, and password.
2. Specifying the **Admin Slack User ID** (which maps to your admin email).
3. Sequentially adding as many coworker **Slack User IDs** and corresponding **TimeIQ Emails** as you want.
4. Setting the default safety mode (Dry-run).

Once completed, it will automatically:
- Create/update a local `.env` file in the working directory.
- Render copy-paste-ready config blocks for both **Claude Desktop** and **Hermes (config.yaml)**.
- Display a clear role/user mapping table for verification.

### 1. Environment Variables

Configure the following environment variables. The server will validate them on startup using Zod:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `TIMEIQ_TENANT` | `string` | **Required** | Your TimeIQ tenant subdomain (e.g., `company` in `company.timeiq.com`). |
| `TIMEIQ_EMAIL` | `string` | **Required** | The acting user's email address (or Admin service account). |
| `TIMEIQ_PASSWORD` | `string` | **Required** | The acting user's password. |
| `TIMEIQ_SLACK_MAP` | `string` | `undefined` | **Optional**. A JSON mapping of Slack user IDs to TimeIQ emails (e.g. `'{"U12345": "cara@domain.com"}'`) to enforce user boundaries. |
| `TIMEIQ_DRY_RUN` | `boolean` | `true` | **Safety Mode**. If `true`, all mutating requests (POST, PUT, DELETE) are intercepted and simulated with mock success responses. Set to `false` to enable real writes. |

---

## 💻 Configuration

### A. Claude Desktop
Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "timeiq-mcp": {
      "command": "npx",
      "args": ["-y", "timeiq-mcp"],
      "env": {
        "TIMEIQ_TENANT": "your-tenant",
        "TIMEIQ_EMAIL": "your-email@example.com",
        "TIMEIQ_PASSWORD": "your-password",
        "TIMEIQ_DRY_RUN": "true"
      }
    }
  }
}
```

### B. Cursor
1. Go to **Settings** > **Features** > **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in the details:
   - **Name**: `timeiq-mcp`
   - **Type**: `command`
   - **Command**:
     ```bash
     env TIMEIQ_TENANT="your-tenant" TIMEIQ_EMAIL="your-email@example.com" TIMEIQ_PASSWORD="your-password" TIMEIQ_DRY_RUN="true" npx -y timeiq-mcp
     ```

### C. Hermes / Remote Gateway (Honcho / VPS)
To integrate the server with remote gateway bots, register the tool inside the bots' local `config.yaml` and boot:
```yaml
mcp:
  servers:
    timeiq-mcp:
      command: "npx"
      args: ["-y", "timeiq-mcp"]
      env:
        TIMEIQ_TENANT: "your-tenant"
        TIMEIQ_EMAIL: "admin-account@example.com"
        TIMEIQ_PASSWORD: "secure-password"
        TIMEIQ_DRY_RUN: "false" # Set to false to allow actual actions
        TIMEIQ_SLACK_MAP: '{"U12345678": "cara@example.com", "U87654321": "emily@example.com"}'
```

---

## 🛠️ Exposed MCP Tools

The server exposes modular tools mapped across **10 distinct domains**:

### 📅 1. Time & Timers (`time.ts`)
* `timeiq_time_list_me`: List acting user's time entries in a date range. Defaults to today.
* `timeiq_time_list_person`: Admin only. Retrieve time entries for another user.
* `timeiq_time_create`: Create a time entry (supports both start/end time and duration style).
* `timeiq_time_create_overbook`: Create a time entry with budget warnings.
* `timeiq_time_update`: Update a single time entry using automatic changeset comparison.
* `timeiq_time_delete`: Delete a single time entry.
* `timeiq_time_delete_many`: Delete multiple time entries by ID list.
* `timeiq_time_update_many`: Apply bulk updates to a list of time entries.
* `timeiq_time_batch`: Week-grid-style batch updates.
* `timeiq_timer_get`: Get currently running stopwatch.
* `timeiq_timer_start`: Start a new running timer.
* `timeiq_timer_stop`: Stop running timer and convert to a time entry.
* `timeiq_timer_cancel`: Cancel active timer.
* `timeiq_timer_update`: Update active timer notes/project.
* `timeiq_timer_update_entry`: Update underlying entry of active timer.

### 🏢 2. Projects & Clients (`projects.ts`)
* `timeiq_project_list`: List projects. Can filter by active, archived, managed, or managed_archived.
* `timeiq_project_get`: Get single project details by slug.
* `timeiq_project_create`: Create a project (auto-slugifies names).
* `timeiq_project_update`: Update project attributes.
* `timeiq_project_update_many`: Update multiple projects in one call.
* `timeiq_project_delete`: Delete a project.
* `timeiq_project_archive`: Archive a project.
* `timeiq_project_activate`: Re-activate an archived project.
* `timeiq_client_list`: List clients. Can filter by active, archived, managed, or managed_archived.
* `timeiq_client_get`: Get client details by slug.
* `timeiq_client_create`: Create client.
* `timeiq_client_update`: Update client.
* `timeiq_client_delete`: Delete client.
* `timeiq_client_archive`: Archive a client.
* `timeiq_client_activate`: Re-activate an archived client.

### 👥 3. People & Capacity (`people.ts`)
* `timeiq_whoami`: Get profile and settings of currently authenticated acting user.
* `timeiq_person_list`: List team members. Can filter by active, archived, managed, or managed_archived.
* `timeiq_person_get`: Get single team member by slug.
* `timeiq_person_create`: Create new person (Admin only).
* `timeiq_person_update`: Update person details (Admin only).
* `timeiq_person_delete`: Delete a person (Admin only).
* `timeiq_person_archive`: Archive a coworker.
* `timeiq_person_activate`: Re-activate a coworker.
* `timeiq_person_update_preferences`: Update own preferences.
* `timeiq_person_required_time_get`: Get capacity settings for a person.
* `timeiq_person_required_time_set`: Set capacity values for a person.

### 📊 4. Reports (`reports.ts`)
* `timeiq_report_standard`: Overview report (summary card data).
* `timeiq_report_standard_time`: Standard report time-tab entries.
* `timeiq_report_standard_expenses`: Standard report expenses.
* `timeiq_report_time`: Time summary totals & group-by breakdowns.
* `timeiq_report_time_detail`: Detailed time-entry report list.
* `timeiq_report_expenses`: Summary expense report.
* `timeiq_report_expenses_detail`: Detailed expense report list.
* `timeiq_report_classic`: Classic summary report.
* `timeiq_report_classic_time`: Classic time report.
* `timeiq_report_custom`: Custom report with custom parameters.
* `timeiq_report_period`: Period-aligned timesheet report.
* `timeiq_report_payroll`: Payroll summaries for staff.
* `timeiq_report_recent_activity`: Feed of latest changes.
* `timeiq_report_missing_time`: Identify people missing capacity entries.
* `timeiq_report_incomplete_time`: Identify people with incomplete times.
* `timeiq_report_search_time`: Search across time entries.
* `timeiq_report_search_expenses`: Search across expense entries.

### 💼 5. Expenses (`expenses.ts`)
* `timeiq_expense_list_me`: List expense entries for the acting user.
* `timeiq_expense_list_person`: List expense entries for another user.
* `timeiq_expense_create`: Log new expense (travel, software, etc.).
* `timeiq_expense_update`: Update logged expense.
* `timeiq_expense_delete`: Delete expense.
* `timeiq_expense_delete_many`: Delete multiple expenses.
* `timeiq_expense_update_many`: Apply updates to multiple expenses.
* `timeiq_expense_type_list`: List expense types.
* `timeiq_expense_type_get`: Get single expense type by slug.
* `timeiq_expense_type_create`: Create expense type.
* `timeiq_expense_type_update`: Update expense type.
* `timeiq_expense_type_delete`: Delete expense type.
* `timeiq_expense_type_archive`: Archive an expense type.
* `timeiq_expense_type_activate`: Re-activate an expense type.
* `timeiq_expense_category_list`: List expense categories.
* `timeiq_expense_category_create`: Create expense category.
* `timeiq_expense_category_update`: Update expense category.
* `timeiq_expense_category_delete`: Delete expense category.
* `timeiq_expense_category_archive`: Archive an expense category.
* `timeiq_expense_category_activate`: Re-activate an expense category.

### 🏷️ 6. Services (`services.ts`)
* `timeiq_service_list`: List billable services (tasks).
* `timeiq_service_create`: Create billable service.
* `timeiq_service_update`: Update service.
* `timeiq_service_delete`: Delete service.
* `timeiq_service_archive`: Archive a service.
* `timeiq_service_activate`: Re-activate a service.
* `timeiq_service_category_list`: List service categories.
* `timeiq_service_category_create`: Create service category.
* `timeiq_service_category_update`: Update service category.
* `timeiq_service_category_delete`: Delete service category.
* `timeiq_service_category_archive`: Archive a service category.
* `timeiq_service_category_activate`: Re-activate a service category.

### 🕒 7. Timesheets & Approvals (`timesheets.ts`)
* `timeiq_timesheet_period_list`: List all timesheet periods.
* `timeiq_timesheet_period_by_date`: Get the timesheet period covering a specific date.
* `timeiq_timesheet_period_get`: Get details for a single timesheet period by ID.
* `timeiq_timesheet_list`: List timesheets for the acting user.
* `timeiq_timesheet_get`: Get details for a single timesheet by ID.
* `timeiq_timesheet_by_date`: Get the timesheet covering a specific date.
* `timeiq_timesheet_with_issues`: List timesheets flagged with issues.
* `timeiq_timesheet_neighbors`: Fetch neighbor timesheets.
* `timeiq_timesheet_submit`: Submit a timesheet for review and approval.
* `timeiq_timesheet_approve`: Approve a submitted timesheet (Manager/Admin only).
* `timeiq_timesheet_decline`: Decline/reject a submitted timesheet (Manager/Admin only).
* `timeiq_timesheet_send_reminder`: Trigger a missing timesheet submission email reminder.

### 🧾 8. Invoices (`invoices.ts`)
* `timeiq_invoice_list`: List all invoices, optionally filtered by date range.
* `timeiq_invoice_list_for_client`: List all invoices for a specific client.
* `timeiq_invoice_get`: Get details of a single invoice by its ID.
* `timeiq_invoice_get_by_number`: Get a single invoice by its alphanumeric invoice number.
* `timeiq_invoice_create`: Create a new draft invoice.
* `timeiq_invoice_update`: Update an invoice (e.g. details, dates, comments).
* `timeiq_invoice_delete`: Delete an existing invoice by ID.
* `timeiq_invoice_mark_paid`: Mark an invoice status as fully paid.
* `timeiq_invoice_mark_unpaid`: Mark a paid or drafted invoice status as unpaid.
* `timeiq_invoice_mark_written_off`: Mark an invoice status as written-off.
* `timeiq_invoice_send`: Trigger the invoice-send email.
* `timeiq_invoice_export`: Get invoice export/PDF compile details.
* `timeiq_lineitem_add`: Add a new line item details row to an existing invoice.
* `timeiq_lineitem_update`: Update a single line item details row on an invoice.
* `timeiq_lineitem_delete`: Remove a line item details row from an invoice.

### 🔔 9. Notifications & Reminders (`notifications.ts`)
* `timeiq_notifications_list`: Fetch active notifications.
* `timeiq_notifications_dismiss`: Dismiss notification by ID.
* `timeiq_notifications_remind_missing`: Trigger missing-time email reminder to a user.
* `timeiq_notifications_remind_timesheet`: Trigger timesheet-approval reminder.

### ⚙️ 10. System Settings (`settings.ts`)
* `timeiq_settings_get`: Get tenant-wide preferences.
* `timeiq_settings_update`: Update system configuration parameters.
* `timeiq_settings_timezones`: Retrieve active timezone choices.

---

## 📦 Exposed Resources

The server exposes three read-only resources through standard URI schemes:

1. **`timeiq://schemas`**: Dynamically dumps complete JSON schemas of all primary entities (Person, Client, Project, TimeEntry, Invoice, etc.) derived from strict Zod schemas.
2. **`timeiq://endpoints`**: The entire reverse-engineered specification of the TimeIQ HTTP endpoints, allowing the LLM to inspect route constraints and exact payloads.
3. **`timeiq://me`**: A snapshot of the currently acting user's profile and permission configuration (cached for 60 seconds).

---

## 🔒 Safety & Simulations

When running in **Dry-Run mode** (`TIMEIQ_DRY_RUN=true`), any mutating operation returns a simulated response structured identically to the actual API response:

```json
{
  "dry_run": true,
  "request": {
    "method": "POST",
    "path": "/api/time",
    "body": {
      "date": "2026-05-29",
      "project_id": 2070,
      "duration": 60,
      "notes": "Testing the MCP Server safely"
    }
  }
}
```

---

## 🧪 Development

### Install dependencies
```bash
npm install
```

### Run tests
The test suite utilizes Vitest to validate strict dates, slugifiers, and partial changeset generation:
```bash
npm run test
```

### Compile TypeScript
```bash
npm run build
```

---

## 📄 License

This project is licensed under the MIT License.
