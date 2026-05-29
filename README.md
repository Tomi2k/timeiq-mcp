# TimeIQ Model Context Protocol (MCP) Server

[![NPM Version](https://img.shields.io/npm/v/timeiq-mcp.svg?style=flat-flat)](https://www.npmjs.com/package/timeiq-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [!NOTE]
> **Version 1.0**
> Created by **Timothy Maximilian Scherman** ([www.timothyscherman.de](https://www.timothyscherman.de) / [www.schild-roth.com](https://www.schild-roth.com)) with the purpose of making agency life in the service and service-business area a bit easier, and equipping own AI agents with the ability to create time entries as well as automatically adding regularly recurring items via cron jobs.

A production-ready, fully anonymized **Model Context Protocol (MCP)** server for TimeIQ time tracking. It provides a standard integration pattern that allows LLM agents (like Claude Desktop, Cursor, or custom gateway agents running on Hermes) to view and manage time entries, projects, clients, reports, invoices, expenses, services, and timesheets via a secure **stdio transport**.

---

## 🚀 Key Features

* **Anonymized & Secure by Design**: Zero hardcoded credentials or branding (no mentions of internal subdomains, private domains, or local credentials).
* **Safe-by-Default (Dry-Run)**: Defaults to `TIMEIQ_DRY_RUN=true` to prevent agents from inadvertently creating, modifying, or deleting entries. All modification requests describe the intended action without executing it.
* **Bulk Action Gate**: Forces safety confirmation for multi-record operations.
* **Complete Reverse-Engineered Coverage**: Exposes **50+ tools** and **3 read-only resources** spanning the entire TimeIQ SPA API.
* **In-Memory Session Security**: Employs an in-memory session cookie jar (zero tokens or cookies are persisted to disk).
* **Robust Timezone & Input Handling**: Strict date validation (prevents JS calendar rollover bugs like `2026-02-30` silently resolving to `March 2nd`) and automatic snake_case slugifiers that convert names with German diacritics and umlauts (e.g., `ä` → `ae`, `ß` → `ss`).

---

## 🛠️ Installation & Setup

### Requirements
* Node.js **>= 20.0.0**

### 1. Environment Variables

Configure the following environment variables. The server will validate them on startup using Zod:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `TIMEIQ_TENANT` | `string` | **Required** | Your TimeIQ tenant subdomain (e.g., `company` in `company.timeiq.com`). |
| `TIMEIQ_EMAIL` | `string` | **Required** | The acting user's email address. |
| `TIMEIQ_PASSWORD` | `string` | **Required** | The acting user's password. |
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
To integrate the server with remote gateway bots, register the tool inside the bots' local `.env` or `config.yaml` and boot:
```yaml
mcp:
  servers:
    timeiq-mcp:
      command: "npx"
      args: ["-y", "timeiq-mcp"]
      env:
        TIMEIQ_TENANT: "your-tenant"
        TIMEIQ_EMAIL: "your-email@example.com"
        TIMEIQ_PASSWORD: "your-password"
        TIMEIQ_DRY_RUN: "false" # Set to false to allow actual actions
```

---

## 🛠️ Exposed MCP Tools

The server exposes modular tools mapped across **10 distinct domains**:

### 📅 1. Time & Timers (`time.ts`)
* `timeiq_time_list`: List acting user's time entries in a date range.
* `timeiq_time_list_for_person`: Admin only. Retrieve time entries for another user.
* `timeiq_time_create`: Create a time entry (supports both start/end time and duration style).
* `timeiq_time_update`: Update a single time entry using automatic changeset comparison.
* `timeiq_time_delete`: Delete a single time entry.
* `timeiq_time_delete_bulk`: Delete multiple time entries by ID list.
* `timeiq_time_update_bulk`: Apply bulk updates to a list of time entries.
* `timeiq_time_batch`: Week-grid-style batch updates.
* `timeiq_timer_get`: Get currently running stopwatch.
* `timeiq_timer_start`: Start a new running timer.
* `timeiq_timer_stop`: Stop running timer and convert to a time entry.
* `timeiq_timer_update`: Update active timer notes/project.
* `timeiq_timer_cancel`: Cancel active timer.

### 🏢 2. Projects & Clients (`projects.ts`)
* `timeiq_projects_list`: List active projects (includes budget & client details).
* `timeiq_projects_list_managed`: List active projects the acting user manages.
* `timeiq_projects_list_archived`: List archived projects.
* `timeiq_projects_get`: Get single project details by slug.
* `timeiq_projects_create`: Create a project (auto-slugifies names).
* `timeiq_projects_update`: Update project attributes.
* `timeiq_projects_update_bulk`: Update multiple projects in one call.
* `timeiq_projects_delete`: Delete a project.
* `timeiq_clients_list`: List active clients.
* `timeiq_clients_list_managed`: List active managed clients.
* `timeiq_clients_list_archived`: List archived clients.
* `timeiq_clients_get`: Get client details by slug.
* `timeiq_clients_create`: Create client.
* `timeiq_clients_update`: Update client.
* `timeiq_clients_delete`: Delete client.

### 👥 3. People & Capacity (`people.ts`)
* `timeiq_people_list`: List active coworkers.
* `timeiq_people_list_managed`: List active people managed by acting user.
* `timeiq_people_list_archived`: List archived people.
* `timeiq_people_get`: Get single coworker by slug.
* `timeiq_people_create`: Create new person.
* `timeiq_people_update`: Update person details.
* `timeiq_people_delete`: Delete a person.
* `timeiq_people_resend_invite`: Resend invite details to coworker.
* `timeiq_capacity_get`: Get required time settings for a person.
* `timeiq_capacity_set`: Set capacity values for a person.

### 📊 4. Reports (`reports.ts`)
* `timeiq_reports_standard`: Overview report (summary card data).
* `timeiq_reports_standard_time`: Standard report time-tab entries.
* `timeiq_reports_standard_expenses`: Standard report expenses.
* `timeiq_reports_time`: Time summary totals & group-by breakdowns.
* `timeiq_reports_time_entries`: Raw time entries matching filters.
* `timeiq_reports_payroll`: Payroll summaries for staff.
* `timeiq_reports_recent_activity`: Feed of latest changes.
* `timeiq_reports_missing_time`: Discover users missing capacity entries.

### 💼 5. Expenses (`expenses.ts`)
* `timeiq_expenses_list`: List logged expenses.
* `timeiq_expenses_create`: Log new expense (travel, software, etc.).
* `timeiq_expenses_update`: Update logged expense.
* `timeiq_expenses_delete`: Delete expense.
* `timeiq_expenses_delete_bulk`: Delete multiple expenses.
* `timeiq_expenses_update_bulk`: Apply updates to multiple expenses.
* `timeiq_expense_types_list`: List active expense categories.
* `timeiq_expense_types_create`: Create expense category.
* `timeiq_expense_types_update`: Update expense category.
* `timeiq_expense_types_delete`: Delete expense category.

### 🏷️ 6. Services (`services.ts`)
* `timeiq_services_list`: List billable services (tasks).
* `timeiq_services_create`: Create billable service.
* `timeiq_services_update`: Update service.
* `timeiq_services_delete`: Delete service.

### 🕒 7. Timesheets & Approvals (`timesheets.ts`)
* `timeiq_timesheets_list`: List acting user's timesheets.
* `timeiq_timesheets_get`: Get single timesheet details.
* `timeiq_timesheets_submit`: Submit a timesheet period for approval.
* `timeiq_timesheets_approve`: Approve a timesheet.
* `timeiq_timesheets_decline`: Reject/decline a timesheet.

### 🧾 8. Invoices (`invoices.ts`)
* `timeiq_invoices_list`: List sent & draft invoices.
* `timeiq_invoices_create`: Create a client invoice.
* `timeiq_invoices_update`: Update invoice header.
* `timeiq_invoices_delete`: Delete invoice.
* `timeiq_invoices_set_paid`: Mark invoice as paid.
* `timeiq_invoices_set_unpaid`: Revert invoice to unpaid.
* `timeiq_invoices_set_written_off`: Mark invoice as written off.
* `timeiq_invoices_send`: Email invoice to client.
* `timeiq_lineitems_create`: Add line item to invoice.
* `timeiq_lineitems_update`: Update invoice line item.
* `timeiq_lineitems_delete`: Delete line item.

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
  "dryRun": true,
  "simulatedAction": "CREATE_TIME_ENTRY",
  "data": {
    "date": "2026-05-29",
    "project_id": 2070,
    "duration": 60,
    "notes": "Testing the MCP Server safely",
    "person_id": "[AUTHENTICATED_USER_ID]",
    "id": 999999
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
