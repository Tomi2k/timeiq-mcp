import { z } from "zod";
import { client } from "../client.js";

// Inputs
export const SettingsUpdateInput = z.object({
  changeset: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

// Tools Implementation
export const settingsTools = {
  timeiq_settings_get: {
    description: "Get tenant-wide settings (features, billing defaults, locking rules).",
    inputSchema: z.object({}),
    handler: async () => {
      return client.get("/api/settings");
    },
  },

  timeiq_settings_update: {
    description: "Update tenant-wide configuration settings with a partial changeset (Admin only).",
    inputSchema: SettingsUpdateInput,
    handler: async (args: z.infer<typeof SettingsUpdateInput>) => {
      return client.put("/api/settings", args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_settings_timezones: {
    description: "List all standard IANA timezones supported by TimeIQ.",
    inputSchema: z.object({}),
    handler: async () => {
      return client.get("/api/settings/timezones");
    },
  },

  timeiq_billing_info: {
    description: "Get the current TimeIQ subscription plan and billing credit card details.",
    inputSchema: z.object({}),
    handler: async () => {
      return client.get("/api/billing_info");
    },
  },

  timeiq_billing_invoices: {
    description: "List all past TimeIQ subscription SaaS billing invoices.",
    inputSchema: z.object({}),
    handler: async () => {
      return client.get("/api/billing_info/invoices");
    },
  },

  timeiq_url: {
    description: "Get the site URL for the tenant domain.",
    inputSchema: z.object({}),
    handler: async () => {
      return client.get("/api/url");
    },
  },
};
