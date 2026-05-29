import { z } from "zod";
import { client, TimeIQError } from "../client.js";

// Zod schemas for inputs
export const ProjectListInput = z.object({
  filter: z.enum(["active", "archived", "managed", "managed_archived"]).default("active"),
});

export const ProjectGetInput = z.object({
  slug: z.string(),
});

export const ProjectCreateInput = z.object({
  name: z.string(),
  client_id: z.number(),
  is_billable: z.boolean().optional(),
  budget_type: z.enum(["none", "hours", "money"]).optional(),
  budget_total: z.number().optional(),
  active: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

export const ProjectUpdateInput = z.object({
  slug: z.string(),
  changeset: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

export const ProjectDeleteInput = z.object({
  slug: z.string(),
  dry_run: z.boolean().optional(),
});

export const ProjectUpdateManyInput = z.object({
  ids: z.array(z.number()),
  changeset: z.record(z.any()),
  confirm_bulk: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

// Client inputs
export const ClientListInput = z.object({
  filter: z.enum(["active", "archived", "managed", "managed_archived"]).default("active"),
});

export const ClientGetInput = z.object({
  slug: z.string(),
});

export const ClientCreateInput = z.object({
  name: z.string(),
  isActive: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

export const ClientUpdateInput = z.object({
  slug: z.string(),
  changeset: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

export const ClientDeleteInput = z.object({
  slug: z.string(),
  dry_run: z.boolean().optional(),
});

// Tools Implementation
export const projectTools = {
  // PROJECTS
  timeiq_project_list: {
    description: "List projects. Can filter by active, archived, managed, or managed_archived.",
    inputSchema: ProjectListInput,
    handler: async (args: z.infer<typeof ProjectListInput>) => {
      let path = "/api/projects";
      if (args.filter === "archived") path = "/api/projects/archived";
      else if (args.filter === "managed") path = "/api/projects/managed";
      else if (args.filter === "managed_archived") path = "/api/projects/managed/archived";
      return client.get(path);
    },
  },

  timeiq_project_get: {
    description: "Get a single project by its slug.",
    inputSchema: ProjectGetInput,
    handler: async (args: z.infer<typeof ProjectGetInput>) => {
      return client.get(`/api/projects/${args.slug}`);
    },
  },

  timeiq_project_create: {
    description: "Create a new project linked to a client.",
    inputSchema: ProjectCreateInput,
    handler: async (args: z.infer<typeof ProjectCreateInput>) => {
      const body = {
        name: args.name,
        client_id: args.client_id,
        is_billable: args.is_billable ?? true,
        budget_type: args.budget_type ?? "none",
        budget_total: args.budget_total ?? 0,
        active: args.active ?? true,
      };
      return client.post("/api/projects", body, { dryRun: args.dry_run });
    },
  },

  timeiq_project_update: {
    description: "Update an existing project by its slug with a partial changeset.",
    inputSchema: ProjectUpdateInput,
    handler: async (args: z.infer<typeof ProjectUpdateInput>) => {
      return client.put(`/api/projects/${args.slug}`, args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_project_delete: {
    description: "Delete an existing project by its slug.",
    inputSchema: ProjectDeleteInput,
    handler: async (args: z.infer<typeof ProjectDeleteInput>) => {
      return client.delete(`/api/projects/${args.slug}`, undefined, { dryRun: args.dry_run });
    },
  },

  timeiq_project_archive: {
    description: "Archive an active project (sets active to false).",
    inputSchema: ProjectGetInput,
    handler: async (args: z.infer<typeof ProjectGetInput>) => {
      return client.put(`/api/projects/${args.slug}`, { active: false });
    },
  },

  timeiq_project_activate: {
    description: "Re-activate an archived project (sets active to true).",
    inputSchema: ProjectGetInput,
    handler: async (args: z.infer<typeof ProjectGetInput>) => {
      return client.put(`/api/projects/${args.slug}`, { active: true });
    },
  },

  timeiq_project_update_many: {
    description: "Bulk update multiple projects. Safe-guarded for actions exceeding 50 entries.",
    inputSchema: ProjectUpdateManyInput,
    handler: async (args: z.infer<typeof ProjectUpdateManyInput>) => {
      if (args.ids.length > 50 && !args.confirm_bulk) {
        throw new TimeIQError(`Bulk action safety warning: Attempting to update ${args.ids.length} projects. Please pass confirm_bulk: true to proceed.`, 400);
      }
      return client.put("/api/projects/actions/update", { ids: args.ids, changeset: args.changeset }, { dryRun: args.dry_run });
    },
  },

  // CLIENTS
  timeiq_client_list: {
    description: "List clients. Can filter by active, archived, managed, or managed_archived.",
    inputSchema: ClientListInput,
    handler: async (args: z.infer<typeof ClientListInput>) => {
      let path = "/api/clients";
      if (args.filter === "archived") path = "/api/clients/archived";
      else if (args.filter === "managed") path = "/api/clients/managed";
      else if (args.filter === "managed_archived") path = "/api/clients/managed/archived";
      return client.get(path);
    },
  },

  timeiq_client_get: {
    description: "Get a single client by their slug.",
    inputSchema: ClientGetInput,
    handler: async (args: z.infer<typeof ClientGetInput>) => {
      return client.get(`/api/clients/${args.slug}`);
    },
  },

  timeiq_client_create: {
    description: "Create a new client.",
    inputSchema: ClientCreateInput,
    handler: async (args: z.infer<typeof ClientCreateInput>) => {
      const body = {
        name: args.name,
        isActive: args.isActive ?? true,
      };
      return client.post("/api/clients", body, { dryRun: args.dry_run });
    },
  },

  timeiq_client_update: {
    description: "Update an existing client by their slug with a partial changeset.",
    inputSchema: ClientUpdateInput,
    handler: async (args: z.infer<typeof ClientUpdateInput>) => {
      return client.put(`/api/clients/${args.slug}`, args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_client_delete: {
    description: "Delete an existing client by its slug.",
    inputSchema: ClientDeleteInput,
    handler: async (args: z.infer<typeof ClientDeleteInput>) => {
      return client.delete(`/api/clients/${args.slug}`, undefined, { dryRun: args.dry_run });
    },
  },

  timeiq_client_archive: {
    description: "Archive an active client (sets isActive to false).",
    inputSchema: ClientGetInput,
    handler: async (args: z.infer<typeof ClientGetInput>) => {
      return client.put(`/api/clients/${args.slug}`, { isActive: false });
    },
  },

  timeiq_client_activate: {
    description: "Re-activate an archived client (sets isActive to true).",
    inputSchema: ClientGetInput,
    handler: async (args: z.infer<typeof ClientGetInput>) => {
      return client.put(`/api/clients/${args.slug}`, { isActive: true });
    },
  },
};
