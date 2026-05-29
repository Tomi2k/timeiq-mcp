import { z } from "zod";
import { client } from "../client.js";

// Inputs
export const PersonListInput = z.object({
  filter: z.enum(["active", "archived", "managed", "managed_archived"]).default("active"),
});

export const PersonGetInput = z.object({
  slug: z.string(),
});

export const PersonCreateInput = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  timeZone: z.string().default("Europe/Berlin"),
  userLevel: z.enum(["admin", "manager", "user"]).default("user"),
  isActive: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

export const PersonUpdateInput = z.object({
  slug: z.string(),
  changeset: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

export const PersonDeleteInput = z.object({
  slug: z.string(),
  dry_run: z.boolean().optional(),
});

export const PreferencesUpdateInput = z.object({
  preferences: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

export const RequiredTimeGetInput = z.object({
  personId: z.number(),
  start_date: z.string(),
  end_date: z.string(),
});

export const RequiredTimeSetInput = z.object({
  personId: z.number(),
  date: z.string(), // YYYY-MM-DD
  required_seconds: z.number(), // daily working capacity
  dry_run: z.boolean().optional(),
});

// Tools Implementation
export const peopleTools = {
  timeiq_whoami: {
    description: "Get the profile and settings of the currently authenticated acting user.",
    inputSchema: z.object({}),
    handler: async () => {
      return client.get("/api/people/me");
    },
  },

  timeiq_person_list: {
    description: "List team members. Can filter by active, archived, managed, or managed_archived.",
    inputSchema: PersonListInput,
    handler: async (args: z.infer<typeof PersonListInput>) => {
      let path = "/api/people";
      if (args.filter === "archived") path = "/api/people/archived";
      else if (args.filter === "managed") path = "/api/people/managed";
      else if (args.filter === "managed_archived") path = "/api/people/managed/archived";
      return client.get(path);
    },
  },

  timeiq_person_get: {
    description: "Get a single team member's record by their slug.",
    inputSchema: PersonGetInput,
    handler: async (args: z.infer<typeof PersonGetInput>) => {
      return client.get(`/api/people/${args.slug}`);
    },
  },

  timeiq_person_create: {
    description: "Create a new team member record (Admin only).",
    inputSchema: PersonCreateInput,
    handler: async (args: z.infer<typeof PersonCreateInput>) => {
      const body = {
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        timeZone: args.timeZone,
        userLevel: args.userLevel,
        isActive: args.isActive ?? true,
      };
      return client.post("/api/people", body, { dryRun: args.dry_run });
    },
  },

  timeiq_person_update: {
    description: "Update an existing team member's record by their slug (Admin only).",
    inputSchema: PersonUpdateInput,
    handler: async (args: z.infer<typeof PersonUpdateInput>) => {
      return client.put(`/api/people/${args.slug}`, args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_person_delete: {
    description: "Delete a team member record by their slug (Admin only).",
    inputSchema: PersonDeleteInput,
    handler: async (args: z.infer<typeof PersonDeleteInput>) => {
      return client.delete(`/api/people/${args.slug}`, undefined, { dryRun: args.dry_run });
    },
  },

  timeiq_person_archive: {
    description: "Archive a team member (sets isActive to false).",
    inputSchema: PersonGetInput,
    handler: async (args: z.infer<typeof PersonGetInput>) => {
      return client.put(`/api/people/${args.slug}`, { isActive: false });
    },
  },

  timeiq_person_activate: {
    description: "Re-activate an archived team member (sets isActive to true).",
    inputSchema: PersonGetInput,
    handler: async (args: z.infer<typeof PersonGetInput>) => {
      return client.put(`/api/people/${args.slug}`, { isActive: true });
    },
  },

  timeiq_person_update_preferences: {
    description: "Update the acting user's own frontend preferences.",
    inputSchema: PreferencesUpdateInput,
    handler: async (args: z.infer<typeof PreferencesUpdateInput>) => {
      return client.put("/api/people/preferences", args.preferences, { dryRun: args.dry_run });
    },
  },

  timeiq_person_required_time_get: {
    description: "Retrieve required daily working capacity (in seconds) for a person in a date range.",
    inputSchema: RequiredTimeGetInput,
    handler: async (args: z.infer<typeof RequiredTimeGetInput>) => {
      return client.get(`/api/required_time/${args.personId}/${args.start_date}/${args.end_date}`);
    },
  },

  timeiq_person_required_time_set: {
    description: "Set or update a person's required working capacity (in seconds) for a date.",
    inputSchema: RequiredTimeSetInput,
    handler: async (args: z.infer<typeof RequiredTimeSetInput>) => {
      const body = {
        personId: args.personId,
        date: args.date,
        required_seconds: args.required_seconds,
      };
      return client.post("/api/required_time", body, { dryRun: args.dry_run });
    },
  },
};
