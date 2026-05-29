import { z } from "zod";
import { client, TimeIQError } from "../client.js";
import { checkDateSanity, getTodayDateString } from "../utils/dates.js";
import { TimeEntrySchema, TimerSchema } from "../schemas.js";

// Zod schemas for tool inputs
export const TimeListMeInput = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const TimeListPersonInput = z.object({
  slug: z.string(),
  start_date: z.string(),
  end_date: z.string(),
});

export const TimeCreateInput = z.object({
  date: z.string(),
  project_id: z.number(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration: z.number().optional(), // in minutes
  notes: z.string().optional(),
  is_billable: z.boolean().optional(),
  service_id: z.number().optional(),
  timeZone: z.string().optional(),
  dry_run: z.boolean().optional(),
});

export const TimeUpdateInput = z.object({
  id: z.number(),
  changeset: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

export const TimeDeleteInput = z.object({
  id: z.number(),
  dry_run: z.boolean().optional(),
});

export const TimeDeleteManyInput = z.object({
  ids: z.array(z.number()),
  confirm_bulk: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

export const TimeUpdateManyInput = z.object({
  ids: z.array(z.number()),
  changeset: z.record(z.any()),
  confirm_bulk: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

export const TimeBatchInput = z.object({
  date: z.string(),
  batch: z.array(z.record(z.any())),
  dry_run: z.boolean().optional(),
});

export const TimerStartInput = z.object({
  project_id: z.number(),
  date: z.string().optional(),
  start_time: z.string().optional(),
  notes: z.string().optional(),
  service_id: z.number().optional(),
  is_billable: z.boolean().optional(),
  timeZone: z.string().optional(),
  dry_run: z.boolean().optional(),
});

export const TimerStopInput = z.object({
  notes: z.string().optional(),
  dry_run: z.boolean().optional(),
});

export const TimerUpdateInput = z.object({
  id: z.number(),
  changeset: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

// Tools Implementation
export const timeTools = {
  timeiq_time_list_me: {
    description: "List time entries for the acting user within a given date range. Defaults to today.",
    inputSchema: TimeListMeInput,
    handler: async (args: z.infer<typeof TimeListMeInput>) => {
      const today = getTodayDateString();
      const start = args.start_date || today;
      const end = args.end_date || today;
      return client.get(`/api/time/${start}/${end}`);
    },
  },

  timeiq_time_list_person: {
    description: "List time entries for a specific person by their slug within a date range (Admin only).",
    inputSchema: TimeListPersonInput,
    handler: async (args: z.infer<typeof TimeListPersonInput>) => {
      return client.get(`/api/people/${args.slug}/time/${args.start_date}/${args.end_date}`);
    },
  },

  timeiq_time_create: {
    description: "Create a new time entry. Must provide either a start_time/end_time pair OR a duration (in minutes).",
    inputSchema: TimeCreateInput,
    handler: async (args: z.infer<typeof TimeCreateInput>) => {
      // Date sanity check
      const sanity = checkDateSanity(args.date);
      if (!sanity.valid) {
        throw new TimeIQError(sanity.error || "Date sanity check failed", 400);
      }

      // Check duration vs start/end time
      if (!args.duration && (!args.start_time || !args.end_time)) {
        throw new TimeIQError("Either duration OR start_time and end_time must be provided", 400);
      }

      const body = {
        date: args.date,
        project_id: args.project_id,
        start_time: args.start_time,
        end_time: args.end_time,
        duration: args.duration,
        notes: args.notes,
        is_billable: args.is_billable,
        service_id: args.service_id,
        timeZone: args.timeZone,
      };

      const result = await client.post<any>("/api/time", body, { dryRun: args.dry_run });
      
      if (sanity.warning && !result.dry_run) {
        return { ...result, _warning: sanity.warning };
      }
      return result;
    },
  },

  timeiq_time_create_overbook: {
    description: "Create a time entry that might exceed the project budget, and get immediate budget usage feedback.",
    inputSchema: TimeCreateInput,
    handler: async (args: z.infer<typeof TimeCreateInput>) => {
      const sanity = checkDateSanity(args.date);
      if (!sanity.valid) {
        throw new TimeIQError(sanity.error || "Date sanity check failed", 400);
      }

      if (!args.duration && (!args.start_time || !args.end_time)) {
        throw new TimeIQError("Either duration OR start_time and end_time must be provided", 400);
      }

      const result = await client.post<any>("/api/time", args, { dryRun: args.dry_run });
      if (result.dry_run) {
        return result;
      }

      // Fetch the updated project details to show budget status
      try {
        const project = await client.get<any>(`/api/projects/${result.project_slug}`);
        return {
          entry: result,
          budget_status: {
            project_name: project.name,
            budget_total: project.budget_total,
            budget_used: project.budget_used,
            is_over_budget: project.isOverBudget || false,
            percent_used: project.budget_total ? (project.budget_used / project.budget_total) * 100 : 0,
          },
          _warning: sanity.warning,
        };
      } catch {
        return result; // Fallback if project fetch fails
      }
    },
  },

  timeiq_time_update: {
    description: "Update an existing time entry with a partial changeset.",
    inputSchema: TimeUpdateInput,
    handler: async (args: z.infer<typeof TimeUpdateInput>) => {
      return client.put(`/api/time/${args.id}`, args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_time_delete: {
    description: "Delete an existing time entry by ID.",
    inputSchema: TimeDeleteInput,
    handler: async (args: z.infer<typeof TimeDeleteInput>) => {
      return client.delete(`/api/time/${args.id}`, undefined, { dryRun: args.dry_run });
    },
  },

  timeiq_time_delete_many: {
    description: "Delete multiple time entries at once. Safe-guarded for actions exceeding 50 entries.",
    inputSchema: TimeDeleteManyInput,
    handler: async (args: z.infer<typeof TimeDeleteManyInput>) => {
      if (args.ids.length > 50 && !args.confirm_bulk) {
        throw new TimeIQError(`Bulk action safety warning: Attempting to delete ${args.ids.length} entries. Please pass confirm_bulk: true to proceed.`, 400);
      }
      return client.post("/api/time/actions/delete", { ids: args.ids }, { dryRun: args.dry_run });
    },
  },

  timeiq_time_update_many: {
    description: "Update multiple time entries with the same changeset. Safe-guarded for actions exceeding 50 entries.",
    inputSchema: TimeUpdateManyInput,
    handler: async (args: z.infer<typeof TimeUpdateManyInput>) => {
      if (args.ids.length > 50 && !args.confirm_bulk) {
        throw new TimeIQError(`Bulk action safety warning: Attempting to update ${args.ids.length} entries. Please pass confirm_bulk: true to proceed.`, 400);
      }
      return client.put("/api/time/actions/update", { ids: args.ids, changeset: args.changeset }, { dryRun: args.dry_run });
    },
  },

  timeiq_time_batch: {
    description: "Perform batch week-grid row changesets (week grid editor).",
    inputSchema: TimeBatchInput,
    handler: async (args: z.infer<typeof TimeBatchInput>) => {
      return client.post("/api/time/batch", { date: args.date, batch: args.batch }, { dryRun: args.dry_run });
    },
  },

  // Stopwatch Timers
  timeiq_timer_get: {
    description: "Retrieve the current running stopwatch timer for the acting user.",
    inputSchema: z.object({}),
    handler: async () => {
      return client.get("/api/timer");
    },
  },

  timeiq_timer_start: {
    description: "Start a new stopwatch timer for a project.",
    inputSchema: TimerStartInput,
    handler: async (args: z.infer<typeof TimerStartInput>) => {
      const today = getTodayDateString();
      const body = {
        project_id: args.project_id,
        date: args.date || today,
        start_time: args.start_time,
        notes: args.notes,
        service_id: args.service_id,
        is_billable: args.is_billable,
        timeZone: args.timeZone,
      };
      return client.post("/api/timer", body, { dryRun: args.dry_run });
    },
  },

  timeiq_timer_stop: {
    description: "Stop the currently running stopwatch timer and record the time entry.",
    inputSchema: TimerStopInput,
    handler: async (args: z.infer<typeof TimerStopInput>) => {
      const body = {
        notes: args.notes,
      };
      return client.post("/api/timer/actions/stop", body, { dryRun: args.dry_run });
    },
  },

  timeiq_timer_cancel: {
    description: "Cancel the currently running stopwatch timer without creating a time entry.",
    inputSchema: z.object({ dry_run: z.boolean().optional() }),
    handler: async (args: { dry_run?: boolean }) => {
      return client.delete("/api/timer", undefined, { dryRun: args.dry_run });
    },
  },

  timeiq_timer_update: {
    description: "Update the configuration or start time of an active timer.",
    inputSchema: TimerUpdateInput,
    handler: async (args: z.infer<typeof TimerUpdateInput>) => {
      return client.put(`/api/timer/${args.id}`, args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_timer_update_entry: {
    description: "Update the underlying time entry linked to an active timer.",
    inputSchema: TimerUpdateInput,
    handler: async (args: z.infer<typeof TimerUpdateInput>) => {
      return client.put("/api/timer/actions/updateTimeEntry", args.changeset, { dryRun: args.dry_run });
    },
  },
};
