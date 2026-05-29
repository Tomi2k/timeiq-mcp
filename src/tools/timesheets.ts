import { z } from "zod";
import { client } from "../client.js";

// Inputs
export const TimesheetDateInput = z.object({
  date: z.string(), // YYYY-MM-DD
});

export const TimesheetIdInput = z.object({
  id: z.number(),
});

export const TimesheetActionInput = z.object({
  id: z.number(),
  dry_run: z.boolean().optional(),
});

export const TimesheetNeighborsInput = z.object({
  id: z.number(),
  personId: z.number(),
});

export const TimesheetReminderInput = z.object({
  personId: z.number(),
  tsId: z.number(),
  dry_run: z.boolean().optional(),
});

// Tools Implementation
export const timesheetTools = {
  timeiq_timesheet_period_list: {
    description: "List all timesheet periods.",
    inputSchema: z.object({}),
    handler: async () => {
      return client.get("/api/timesheetperiods");
    },
  },

  timeiq_timesheet_period_by_date: {
    description: "Get the timesheet period covering a specific date.",
    inputSchema: TimesheetDateInput,
    handler: async (args: z.infer<typeof TimesheetDateInput>) => {
      return client.get(`/api/timesheetperiods/date/${args.date}`);
    },
  },

  timeiq_timesheet_period_get: {
    description: "Get details for a single timesheet period by ID.",
    inputSchema: TimesheetIdInput,
    handler: async (args: z.infer<typeof TimesheetIdInput>) => {
      return client.get(`/api/timesheetperiods/timesheetperiod/${args.id}`);
    },
  },

  timeiq_timesheet_list: {
    description: "List timesheets for the acting user.",
    inputSchema: z.object({}),
    handler: async () => {
      return client.get("/api/timesheets");
    },
  },

  timeiq_timesheet_get: {
    description: "Get details for a single timesheet by ID.",
    inputSchema: TimesheetIdInput,
    handler: async (args: z.infer<typeof TimesheetIdInput>) => {
      return client.get(`/api/timesheets/${args.id}`);
    },
  },

  timeiq_timesheet_by_date: {
    description: "Get the timesheet covering a specific date.",
    inputSchema: TimesheetDateInput,
    handler: async (args: z.infer<typeof TimesheetDateInput>) => {
      return client.get(`/api/timesheets/date/${args.date}`);
    },
  },

  timeiq_timesheet_with_issues: {
    description: "List all timesheets flagged with issues (e.g. overbooked, missing required time).",
    inputSchema: z.object({}),
    handler: async () => {
      return client.get("/api/timesheets/issues");
    },
  },

  timeiq_timesheet_neighbors: {
    description: "Fetch neighbor timesheets (previous and next) for a target person and timesheet ID.",
    inputSchema: TimesheetNeighborsInput,
    handler: async (args: z.infer<typeof TimesheetNeighborsInput>) => {
      return client.get(`/api/timesheets/${args.id}/previous/next/${args.personId}`);
    },
  },

  timeiq_timesheet_submit: {
    description: "Submit a timesheet for review and approval.",
    inputSchema: TimesheetActionInput,
    handler: async (args: z.infer<typeof TimesheetActionInput>) => {
      return client.post(`/api/timesheets/${args.id}/actions/submit`, {}, { dryRun: args.dry_run });
    },
  },

  timeiq_timesheet_approve: {
    description: "Approve a submitted timesheet (Manager/Admin only).",
    inputSchema: TimesheetActionInput,
    handler: async (args: z.infer<typeof TimesheetActionInput>) => {
      return client.post(`/api/timesheets/${args.id}/actions/approve`, {}, { dryRun: args.dry_run });
    },
  },

  timeiq_timesheet_decline: {
    description: "Decline/reject a submitted timesheet (Manager/Admin only).",
    inputSchema: TimesheetActionInput,
    handler: async (args: z.infer<typeof TimesheetActionInput>) => {
      return client.post(`/api/timesheets/${args.id}/actions/decline`, {}, { dryRun: args.dry_run });
    },
  },

  timeiq_timesheet_send_reminder: {
    description: "Trigger a missing timesheet submission email reminder for a team member.",
    inputSchema: TimesheetReminderInput,
    handler: async (args: z.infer<typeof TimesheetReminderInput>) => {
      return client.post(`/api/notifications/actions/timesheet_reminder/${args.personId}/${args.tsId}`, {}, { dryRun: args.dry_run });
    },
  },
};
