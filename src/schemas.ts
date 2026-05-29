import { z } from "zod";

export const PersonSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  username: z.string().optional(),
  timeZone: z.string(),
  userLevel: z.string().optional(),
  isActive: z.boolean().optional(),
  hasTime: z.boolean().optional(),
  hasEntries: z.boolean().optional(),
  requiresStartAndEndTime: z.boolean().optional(),
  trackingStyle: z.enum(["start_and_end_time", "duration"]).optional(),
  requiresTimesheetSubmission: z.boolean().optional(),
  requiresTimesheetApproval: z.boolean().optional(),
  rate: z.number().optional(),
});

export const ClientSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  isActive: z.boolean().optional(),
  hasTime: z.boolean().optional(),
  hasEntries: z.boolean().optional(),
  hasProjects: z.boolean().optional(),
  hasInvoices: z.boolean().optional(),
});

export const ProjectSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  active: z.boolean().optional(),
  client_id: z.number(),
  client_slug: z.string().optional(),
  client_name: z.string().optional(),
  hasTime: z.boolean().optional(),
  hasEntries: z.boolean().optional(),
  is_billable: z.boolean().optional(),
  budget_type: z.string().optional(),
  budget_total: z.number().optional(),
  budget_used: z.number().optional(),
  isNearBudget: z.boolean().optional(),
  isOverBudget: z.boolean().optional(),
});

export const TimeEntrySchema = z.object({
  id: z.number(),
  locked: z.boolean().optional(),
  valid: z.boolean().optional(),
  reconciled: z.boolean().optional(),
  date: z.string(),
  timeZone: z.string().optional(),
  tracking_style: z.enum(["start_and_end_time", "duration"]).optional(),
  person_id: z.number(),
  person_slug: z.string().optional(),
  person_firstname: z.string().optional(),
  person_lastname: z.string().optional(),
  client_id: z.number().optional(),
  client_name: z.string().optional(),
  client_slug: z.string().optional(),
  project_id: z.number(),
  project_name: z.string().optional(),
  project_slug: z.string().optional(),
  start_time: z.string().nullable().optional(),
  start_time_zone: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  end_time_zone: z.string().nullable().optional(),
  duration: z.number().optional(),
  hours_minutes: z.string().optional(),
  notes: z.string().nullable().optional(),
  is_billable: z.boolean().optional(),
  is_invoiced: z.boolean().optional(),
  rate: z.number().optional(),
  total: z.number().optional(),
  submitted: z.boolean().optional(),
  approved: z.boolean().optional(),
});

export const TimerSchema = z.object({
  id: z.number(),
  date: z.string().optional(),
  project_id: z.number(),
  project_name: z.string().optional(),
  duration: z.number().optional(),
  start_time: z.string().optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const ExpenseSchema = z.object({
  id: z.number(),
  date: z.string(),
  project_id: z.number(),
  project_name: z.string().optional(),
  amount: z.number(),
  notes: z.string().nullable().optional(),
  expense_type_id: z.number().optional(),
  expense_type_name: z.string().optional(),
  is_billable: z.boolean().optional(),
  is_invoiced: z.boolean().optional(),
});

export const ServiceSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  isActive: z.boolean().optional(),
  isBillable: z.boolean().optional(),
  hasTime: z.boolean().optional(),
  hasEntries: z.boolean().optional(),
  service_category_id: z.number().optional(),
  service_category_name: z.string().optional(),
});

export const TimesheetSchema = z.object({
  id: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  person_id: z.number(),
  person_name: z.string().optional(),
  submitted: z.boolean().optional(),
  approved: z.boolean().optional(),
  approved_by_name: z.string().nullable().optional(),
  issues: z.array(z.string()).optional(),
});

export const InvoiceSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  client_id: z.number(),
  client_name: z.string().optional(),
  date: z.string().optional(),
  due_date: z.string().optional(),
  amount: z.number().optional(),
  status: z.enum(["draft", "sent", "paid", "unpaid", "writtenoff"]).optional(),
  notes: z.string().nullable().optional(),
});

export const schemas = {
  Person: PersonSchema,
  Client: ClientSchema,
  Project: ProjectSchema,
  TimeEntry: TimeEntrySchema,
  Timer: TimerSchema,
  Expense: ExpenseSchema,
  Service: ServiceSchema,
  Timesheet: TimesheetSchema,
  Invoice: InvoiceSchema,
};
