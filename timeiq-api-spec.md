# TimeIQ JavaScript API — Reverse-Engineered Specification

> Reverse engineered live from `https://{tenant}.timeiq.com` (May 2026) for the
> purpose of building a TimeIQ MCP server. Endpoint list extracted from the bundled
> `main.js` (Angular SPA, single tenant subdomain). All paths verified against the
> running app where possible.

---

## 1. Connection basics

| Item              | Value                                              |
| ----------------- | -------------------------------------------------- |
| Tech stack        | Angular SPA (hash routing `#/...`), jQuery, RxJS   |
| Base URL pattern  | `https://{tenant}.timeiq.com`                      |
| Example tenant    | `your-tenant`                                      |
| API prefix        | `/api/`                                            |
| Content-Type      | `application/json`                                 |
| Auth mechanism    | Cookie session (set by `POST /api/signin`)         |
| CSRF              | none observed (cookie + same-origin enforced)      |
| Date format       | `YYYY-MM-DD`                                       |
| DateTime format   | `YYYY-MM-DD HH:MM:SS` (local, paired with timezone)|
| Timezone          | IANA name, e.g. `Europe/Berlin`                    |

The Angular client builds URLs as `constants.API_URL + "/api/..."`, where
`constants.API_URL` is the same origin as the page. So an MCP server simply needs
the tenant subdomain and a session cookie.

### Login flow

```http
POST /api/signin
Content-Type: application/json

{ "email": "...", "password": "...", "remember": true }
```

The server replies with a session cookie. Subsequent requests must include it.
Use `GET /api/people/me` to verify the session and discover the acting user.

---

## 2. Resource model (high level)

```
Client ──< Project ──< TimeEntry
                  └──< Expense
Person  (= user)  ──< TimeEntry, Expense, Timer
Service (billable task type) ──< ServiceCategory
ExpenseType   ──< ExpenseCategory
Invoice ──< LineItem
TimesheetPeriod ──< Timesheet
```

Most resources are addressed by **id** (`int`) or **slug** (`snake_case`).
Slugs are auto-generated from names: `"SEO monatlich 06/2026"` → `seo_monatlich_06_2026`.

---

## 3. Endpoint catalogue

### 3.1 Auth & account

| Method | Path                                | Purpose                                |
| ------ | ----------------------------------- | -------------------------------------- |
| POST   | `/api/signin`                       | Login (email/password)                 |
| GET    | `/api/signout`                      | Logout                                 |
| POST   | `/api/forgotPassword`               | Trigger password reset email           |
| POST   | `/api/resetPassword/{token}`        | Reset password using token             |
| POST   | `/api/verifySecurityToken`          | Verify a reset/login token             |
| POST   | `/api/changePassword`               | Change own password                    |
| POST   | `/api/changePassword/{personId}`    | Change password for a target person    |

### 3.2 People

| Method | Path                                       | Purpose                                  |
| ------ | ------------------------------------------ | ---------------------------------------- |
| GET    | `/api/people`                              | All active people                        |
| GET    | `/api/people/managed`                      | Active people the acting user manages    |
| GET    | `/api/people/archived`                     | Archived people                          |
| GET    | `/api/people/managed/archived`             | Archived people the user manages         |
| GET    | `/api/people/me`                           | Acting user (full self record)           |
| GET    | `/api/people/{slug}`                       | Single person by slug                    |
| GET    | `/api/people/required_time`                | People with required-time settings       |
| POST   | `/api/people`                              | Create new person                        |
| PUT    | `/api/people/{slug}`                       | Update person (changeset)                |
| PUT    | `/api/people/preferences`                  | Update own frontend preferences          |
| POST   | `/api/people/{slug}` (action: activate)    | `/api/people/activate/get` analytics tag |
| POST   | `/api/people/{slug}` (action: archive)     | `/api/people/archive/get` analytics tag  |
| DELETE | `/api/people/{slug}`                       | Delete person                            |
| GET    | `/api/poeple/resendLoginInformation`       | Resend invite email *(sic — typo in API)*|

A `Person` object includes: `id, slug, name, firstName, lastName, email, username,
timeZone, userLevel, isActive, hasTime, hasEntries, requiresStartAndEndTime,
trackingStyle, requiresTimesheetSubmission, requiresTimesheetApproval, rate,
automatic_manage_new_projects, automatic_manage_new_people, automatic_log_new_*,
frontendPreferences, permission_log_*, permission_manage_*, notifications_*`.

### 3.3 Clients

| Method | Path                                | Purpose                              |
| ------ | ----------------------------------- | ------------------------------------ |
| GET    | `/api/clients`                      | Active clients                       |
| GET    | `/api/clients/managed`              | Active clients user manages          |
| GET    | `/api/clients/archived`             | Archived clients                     |
| GET    | `/api/clients/managed/archived`     | Archived managed clients             |
| GET    | `/api/clients/{slug}`               | Single client                        |
| POST   | `/api/clients`                      | Create client                        |
| PUT    | `/api/clients/{slug}`               | Update client (changeset)            |
| DELETE | `/api/clients/{slug}`               | Delete client                        |
| —      | analytics tags: `/api/clients/actions/activate/get`, `/api/clients/actions/archive/get` | activate / archive go through PUT changeset |

`Client` object: `id, slug, name, isActive, hasTime, hasEntries, hasProjects, hasInvoices`.

### 3.4 Projects

| Method | Path                                          | Purpose                          |
| ------ | --------------------------------------------- | -------------------------------- |
| GET    | `/api/projects`                               | Active projects                  |
| GET    | `/api/projects/managed`                       | Projects user manages            |
| GET    | `/api/projects/archived`                      | Archived projects                |
| GET    | `/api/projects/managed/archived`              | Archived managed projects        |
| GET    | `/api/projects/{slug}`                        | Single project                   |
| POST   | `/api/projects`                               | Create project                   |
| PUT    | `/api/projects/{slug}`                        | Update project (changeset)       |
| PUT    | `/api/projects/actions/update`                | Bulk update multiple projects    |
| DELETE | `/api/projects/{slug}`                        | Delete project                   |

`Project` object: `id, slug, name, active, client_id, client_slug, client_name,
hasTime, hasEntries, is_billable, budget_type, budget_total, budget_used,
isNearBudget, isOverBudget`.

### 3.5 Time entries

| Method | Path                                        | Purpose                                    |
| ------ | ------------------------------------------- | ------------------------------------------ |
| GET    | `/api/time/{start_date}/{end_date}`         | Time entries for acting user (date range)  |
| GET    | `/api/people/{slug}/time/{start}/{end}`     | Time entries for a target person           |
| POST   | `/api/time`                                 | Create time entry                          |
| PUT    | `/api/time/{id}`                            | Update single time entry                   |
| DELETE | `/api/time/{id}`                            | Delete single time entry                   |
| POST   | `/api/time/actions/delete`                  | Delete multiple by id list                 |
| PUT    | `/api/time/actions/update`                  | Update multiple by id list                 |
| POST   | `/api/time/batch`                           | Batch row changeset (week grid editor)     |

**Create body** (captured live):

```json
{
  "date": "2026-05-29",
  "project_id": 2070,
  "start_time": "2026-05-29 10:00:00",
  "end_time":   "2026-05-29 10:30:00",
  "notes": "..."
}
```

Alternative when person uses `duration`-style tracking
(`person.requiresStartAndEndTime === false`):

```json
{
  "date": "2026-05-29",
  "project_id": 2070,
  "duration": 30,
  "notes": "..."
}
```

Optional fields seen on update / read: `is_billable`, `service_id`, `timeZone`,
`tracking_style` (`start_and_end_time` | `duration`), `person_id` (admin only).

`TimeEntry` response shape (full):
`id, locked, valid, reconciled, date, timeZone, tracking_style, person_id,
person_slug, person_firstname, person_lastname, client_id, client_name,
client_slug, project_id, project_name, project_slug, start_time,
start_time_zone, end_time, end_time_zone, duration, hours_minutes, notes,
is_billable, is_invoiced, rate, total, submitted, approved`.

### 3.6 Timer (running stopwatch)

| Method | Path                                        | Purpose                              |
| ------ | ------------------------------------------- | ------------------------------------ |
| GET    | `/api/timer`                                | Current running timer (acting user)  |
| POST   | `/api/timer`                                | Start a timer                        |
| POST   | `/api/timer/actions/stop`                   | Stop running timer → creates entry   |
| PUT    | `/api/timer/{id}`                           | Update target timer                  |
| PUT    | `/api/timer/actions/updateTimeEntry`        | Update the time entry behind timer   |
| DELETE | `/api/timer`                                | Cancel running timer (no entry)      |

Empty response when no timer running: `{"timers": []}`.
Start body mirrors create-time-entry but with no `end_time` (server takes "now"
as start, returns id you stop later).

### 3.7 Expenses

| Method | Path                                        | Purpose                              |
| ------ | ------------------------------------------- | ------------------------------------ |
| GET    | `/api/expenses/{start_date}/{end_date}`     | Expenses for acting user             |
| GET    | `/api/people/{slug}/expenses/{start}/{end}` | Expenses for target person           |
| POST   | `/api/expenses`                             | Create expense                       |
| PUT    | `/api/expenses/{id}`                        | Update expense                       |
| DELETE | `/api/expenses/{id}`                        | Delete expense                       |
| POST   | `/api/expenses/actions/delete`              | Delete multiple                      |
| PUT    | `/api/expenses/actions/update`              | Update multiple                      |

### 3.8 Expense types & categories

| Method | Path                                                  |
| ------ | ----------------------------------------------------- |
| GET    | `/api/expensetypes` / `/archived`                     |
| GET    | `/api/expensetypes/{slug}`                            |
| POST   | `/api/expensetypes`                                   |
| PUT    | `/api/expensetypes/{slug}`                            |
| DELETE | `/api/expensetypes/{slug}`                            |
| GET    | `/api/expensecategories` / `/archived`                |
| POST   | `/api/expensecategories`                              |
| PUT    | `/api/expensecategories/{slug}`                       |
| DELETE | `/api/expensecategories/{slug}`                       |
| —      | `/api/expensecategories/actions/activate/get` (tag)   |
| —      | `/api/expensecategories/actions/archive/get` (tag)    |

### 3.9 Services & service categories

| Method | Path                                                  |
| ------ | ----------------------------------------------------- |
| GET    | `/api/services` / `/archived`                         |
| POST   | `/api/services`                                       |
| PUT    | `/api/services/{slug}`                                |
| DELETE | `/api/services/{slug}`                                |
| GET    | `/api/servicecategories` / `/archived`                |
| POST   | `/api/servicecategories`                              |
| PUT    | `/api/servicecategories/{slug}`                       |
| DELETE | `/api/servicecategories/{slug}`                       |

`Service` object: `id, slug, name, isActive, isBillable, hasTime, hasEntries,
service_category_id, service_category_slug, service_category_name`.

### 3.10 Reports

All reports are **POST** with this base body:

```json
{
  "parameters": {
    "start_date": "2026-05-25",
    "end_date":   "2026-05-31",
    "clients":  [<id>...],
    "projects": [<id>...],
    "services": [<id>...],
    "people":   [<id>...]
  }
}
```

Variants set additional flags such as `includeTime: false` (expense-only).

| Method | Path                                  | Purpose                              |
| ------ | ------------------------------------- | ------------------------------------ |
| POST   | `/api/reports/standard`               | Overview report (summary)            |
| POST   | `/api/reports/standard/time`          | Standard report — time tab           |
| POST   | `/api/reports/standard/expenses`      | Standard report — expenses tab       |
| POST   | `/api/reports/time`                   | Time report (totals + breakdown)     |
| POST   | `/api/reports/time/time`              | Time report — time-entries detail    |
| POST   | `/api/reports/expenses`               | Expense report                       |
| POST   | `/api/reports/expenses/expenses`      | Expense report — entries detail      |
| POST   | `/api/reports/classic`                | Classic legacy report                |
| POST   | `/api/reports/classicTime`            | Classic time report                  |
| POST   | `/api/reports/custom`                 | Custom report                        |
| POST   | `/api/reports/period`                 | Period (timesheet period) report     |
| POST   | `/api/reports/payroll`                | Payroll report                       |
| POST   | `/api/reports/recentActivity`         | Recent activity feed                 |
| POST   | `/api/reports/missingTime`            | Missing-time report                  |
| POST   | `/api/reports/incompleteTime`         | Incomplete-time report               |
| POST   | `/api/reports/search/time`            | Search time entries (filterable)     |
| POST   | `/api/reports/search/expenses`        | Search expense entries               |

### 3.11 Timesheets (period-based approval workflow)

| Method | Path                                                                | Purpose                       |
| ------ | ------------------------------------------------------------------- | ----------------------------- |
| GET    | `/api/timesheetperiods`                                             | All periods                   |
| GET    | `/api/timesheetperiods/date/{YYYY-MM-DD}`                           | Period(s) covering a date     |
| GET    | `/api/timesheetperiods/timesheetperiod/{id}`                        | Single period                 |
| GET    | `/api/timesheets`                                                   | All timesheets (current user) |
| GET    | `/api/timesheets/{id}`                                              | Single timesheet              |
| GET    | `/api/timesheets/date/{YYYY-MM-DD}`                                 | Timesheet covering a date     |
| GET    | `/api/timesheets/issues`                                            | Timesheets with issues        |
| GET    | `/api/timesheets/{id}/previous/next/{personId}`                     | Previous/next neighbors       |
| POST   | `/api/timesheets/{id}/actions/submit`                               | Submit timesheet              |
| POST   | `/api/timesheets/{id}/actions/approve`                              | Approve timesheet             |
| POST   | `/api/timesheets/{id}/actions/decline`                              | Decline timesheet             |
| POST   | `/api/notifications/actions/timesheet_reminder/{personId}/{tsId}`   | Send reminder email           |

### 3.12 Required time (capacity)

| Method | Path                                                       |
| ------ | ---------------------------------------------------------- |
| GET    | `/api/required_time/{personId}/{start_date}/{end_date}`    |
| GET    | `/api/people/required_time`                                |
| POST   | `/api/required_time`                                       |

### 3.13 Notifications

| Method | Path                                                         | Purpose                  |
| ------ | ------------------------------------------------------------ | ------------------------ |
| GET    | `/api/notifications/{personId}/{start_date}/{end_date}`      | Notifications in range   |
| POST   | `/api/notifications/actions/dismiss/{id}`                    | Dismiss a notification   |
| POST   | `/api/notifications/actions/missing_time_reminder/{personId}`| Trigger reminder         |

### 3.14 Invoices & line items

| Method | Path                                                        |
| ------ | ----------------------------------------------------------- |
| GET    | `/api/invoices?from=&to=`                                   |
| GET    | `/api/invoices/clients/{clientId}?from=&to=`                |
| GET    | `/api/invoices/{id}`                                        |
| GET    | `/api/invoices/invoice_number/{number}`                     |
| POST   | `/api/invoices`                                             |
| PUT    | `/api/invoices/{id}`                                        |
| DELETE | `/api/invoices/{id}`                                        |
| POST   | `/api/invoices/{id}/action/paid`                            |
| POST   | `/api/invoices/{id}/action/unpaid`                          |
| POST   | `/api/invoices/{id}/action/writtenoff`                      |
| POST   | `/api/invoices/{id}/action/send`                            |
| GET    | `/client_invoices/{id}/action/export`                       |
| POST   | `/api/lineitems`                                            |
| PUT    | `/api/lineitems/{id}`                                       |
| DELETE | `/api/lineitems/{id}`                                       |

### 3.15 Settings & billing

| Method | Path                                | Purpose                          |
| ------ | ----------------------------------- | -------------------------------- |
| GET    | `/api/settings`                     | Tenant-wide settings             |
| PUT    | `/api/settings`                     | Update settings (changeset)      |
| GET    | `/api/settings/timezones`           | Timezone list                    |
| GET    | `/api/url`                          | Site URL                         |
| GET    | `/api/billing_info`                 | Billing info                     |
| GET    | `/api/billing_info/invoices`        | TimeIQ subscription invoices     |
| GET    | `/api/bt/token`                     | Braintree client token           |
| POST   | `/api/bt/update`                    | Update Braintree payment         |

Settings object exposes these top-level keys: `general, localization,
time_tracking, entry_locking_enabled, entry_locking, services_enabled,
required_time_enabled, required_time, batch_entry_enabled, time_clock_enabled,
notification_emails, rate_tracking_enabled, rate_tracking, cost_tracking_enabled,
cost_tracking, location_tracking_enabled, location_tracking,
expense_tracking_enabled, has_expenses, expense_tracking, timesheets_enabled,
timesheet, time_iq_invoice_cc_email, invoice, isOG, isBetaParticipant`.

### 3.16 Import / Export

| Method | Path                                      | Purpose                  |
| ------ | ----------------------------------------- | ------------------------ |
| POST   | `/api/import`                             | CSV import               |
| GET    | `/api/export`                             | Default export           |
| GET    | `/api/export/custom`                      | Custom export            |
| GET    | `/api/export/payroll`                     | Payroll export           |

---

## 4. Common patterns

### Changeset PUTs

Update calls use a "changeset" pattern (Angular service helpers
`updateXxxWithChangeset$`). Body is a partial object with only the fields you
want to change, e.g.:

```http
PUT /api/projects/webseite_7
{ "budget_total": 7000, "is_billable": true }
```

### Bulk actions

Several `*/actions/{verb}` endpoints accept a list of ids:

```http
POST /api/time/actions/delete
{ "ids": [123, 124] }
```

```http
PUT /api/time/actions/update
{ "ids": [123, 124], "changeset": { "is_billable": false } }
```

### Errors

Error responses use standard HTTP status codes and a JSON body
`{ "errors": [ ... ], "message": "..." }`. Validation errors come back as
`{ "errors": { "field": ["msg"] }, "message": "Validation failed" }`.

### Analytics path tags

Many service methods call an internal `triggerAnalytics(actionTag, urlTag)`. The
strings of the form `/api/<resource>/post`, `/api/<resource>/put`, and
`/api/<resource>/delete` found in the bundle are **analytics labels, not real
endpoints**. The real method+URL is what `this.http.METHOD(...)` actually sends
(documented above).

---

## 5. Endpoint coverage matrix

| Domain        | Read | Create | Update | Delete | Bulk | Notes        |
| ------------- | :--: | :----: | :----: | :----: | :--: | ------------ |
| People        | yes  | yes    | yes    | yes    | —    | + preferences|
| Clients       | yes  | yes    | yes    | yes    | —    |              |
| Projects      | yes  | yes    | yes    | yes    | yes  | bulk via `/actions/update` |
| Time entries  | yes  | yes    | yes    | yes    | yes  | batch grid editor + bulk actions |
| Timer         | yes  | yes    | yes    | yes    | —    | start/stop/cancel + update underlying entry |
| Expenses      | yes  | yes    | yes    | yes    | yes  |              |
| Expense types | yes  | yes    | yes    | yes    | —    |              |
| Services      | yes  | yes    | yes    | yes    | —    |              |
| Reports       | (read-only POST) | — | — | — | — | filter params bag |
| Timesheets    | yes  | (auto) | submit/approve/decline | — | — | period-driven |
| Invoices      | yes  | yes    | yes    | yes    | —    | + paid/unpaid/writtenoff/send/export |
| LineItems     | yes  | yes    | yes    | yes    | —    |              |
| Settings      | yes  | —      | yes    | —      | —    | + timezones list |
| Notifications | yes  | —      | dismiss | —      | —    | + reminders |

Total: ~150 distinct paths, ~100 confirmed HTTP method bindings.
