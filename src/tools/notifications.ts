import { z } from "zod";
import { client } from "../client.js";

// Inputs
export const NotificationListInput = z.object({
  personId: z.number(),
  start_date: z.string(),
  end_date: z.string(),
});

export const NotificationIdInput = z.object({
  id: z.number(),
  dry_run: z.boolean().optional(),
});

export const ReminderInput = z.object({
  personId: z.number(),
  dry_run: z.boolean().optional(),
});

// Tools Implementation
export const notificationTools = {
  timeiq_notification_list: {
    description: "List notifications for a team member within a date range.",
    inputSchema: NotificationListInput,
    handler: async (args: z.infer<typeof NotificationListInput>) => {
      return client.get(`/api/notifications/${args.personId}/${args.start_date}/${args.end_date}`);
    },
  },

  timeiq_notification_dismiss: {
    description: "Dismiss/acknowledge a single notification by ID.",
    inputSchema: NotificationIdInput,
    handler: async (args: z.infer<typeof NotificationIdInput>) => {
      return client.post(`/api/notifications/actions/dismiss/${args.id}`, {}, { dryRun: args.dry_run });
    },
  },

  timeiq_notification_send_missing_time_reminder: {
    description: "Trigger a daily missing-time notification reminder email for a team member.",
    inputSchema: ReminderInput,
    handler: async (args: z.infer<typeof ReminderInput>) => {
      return client.post(`/api/notifications/actions/missing_time_reminder/${args.personId}`, {}, { dryRun: args.dry_run });
    },
  },
};
