import { z } from "zod";
import { client } from "../client.js";

// Inputs
export const ServiceCreateInput = z.object({
  name: z.string(),
  isBillable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  service_category_id: z.number().optional(),
  dry_run: z.boolean().optional(),
});

export const ServiceUpdateInput = z.object({
  slug: z.string(),
  changeset: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

export const ServiceCategoryCreateInput = z.object({
  name: z.string(),
  isActive: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

export const ServiceCategoryUpdateInput = z.object({
  slug: z.string(),
  changeset: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

export const serviceTools = {
  // SERVICES
  timeiq_service_list: {
    description: "List active services (task types). Optional toggle to list archived services instead.",
    inputSchema: z.object({ archived: z.boolean().optional() }),
    handler: async (args: { archived?: boolean }) => {
      const path = args.archived ? "/api/services/archived" : "/api/services";
      return client.get(path);
    },
  },

  timeiq_service_create: {
    description: "Create a new service (task type).",
    inputSchema: ServiceCreateInput,
    handler: async (args: z.infer<typeof ServiceCreateInput>) => {
      const body = {
        name: args.name,
        isBillable: args.isBillable ?? true,
        isActive: args.isActive ?? true,
        service_category_id: args.service_category_id,
      };
      return client.post("/api/services", body, { dryRun: args.dry_run });
    },
  },

  timeiq_service_update: {
    description: "Update an existing service by its slug with a partial changeset.",
    inputSchema: ServiceUpdateInput,
    handler: async (args: z.infer<typeof ServiceUpdateInput>) => {
      return client.put(`/api/services/${args.slug}`, args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_service_delete: {
    description: "Delete an existing service by its slug.",
    inputSchema: z.object({ slug: z.string(), dry_run: z.boolean().optional() }),
    handler: async (args: { slug: string; dry_run?: boolean }) => {
      return client.delete(`/api/services/${args.slug}`, undefined, { dryRun: args.dry_run });
    },
  },

  timeiq_service_archive: {
    description: "Archive a service (sets isActive to false).",
    inputSchema: z.object({ slug: z.string() }),
    handler: async (args: { slug: string }) => {
      return client.put(`/api/services/${args.slug}`, { isActive: false });
    },
  },

  timeiq_service_activate: {
    description: "Activate a previously archived service (sets isActive to true).",
    inputSchema: z.object({ slug: z.string() }),
    handler: async (args: { slug: string }) => {
      return client.put(`/api/services/${args.slug}`, { isActive: true });
    },
  },

  // SERVICE CATEGORIES
  timeiq_service_category_list: {
    description: "List active service categories. Optional toggle to list archived categories instead.",
    inputSchema: z.object({ archived: z.boolean().optional() }),
    handler: async (args: { archived?: boolean }) => {
      const path = args.archived ? "/api/servicecategories/archived" : "/api/servicecategories";
      return client.get(path);
    },
  },

  timeiq_service_category_create: {
    description: "Create a new service category.",
    inputSchema: ServiceCategoryCreateInput,
    handler: async (args: z.infer<typeof ServiceCategoryCreateInput>) => {
      const body = {
        name: args.name,
        isActive: args.isActive ?? true,
      };
      return client.post("/api/servicecategories", body, { dryRun: args.dry_run });
    },
  },

  timeiq_service_category_update: {
    description: "Update an existing service category by its slug with a partial changeset.",
    inputSchema: ServiceCategoryUpdateInput,
    handler: async (args: z.infer<typeof ServiceCategoryUpdateInput>) => {
      return client.put(`/api/servicecategories/${args.slug}`, args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_service_category_delete: {
    description: "Delete an existing service category by its slug.",
    inputSchema: z.object({ slug: z.string(), dry_run: z.boolean().optional() }),
    handler: async (args: { slug: string; dry_run?: boolean }) => {
      return client.delete(`/api/servicecategories/${args.slug}`, undefined, { dryRun: args.dry_run });
    },
  },

  timeiq_service_category_archive: {
    description: "Archive a service category (sets isActive to false).",
    inputSchema: z.object({ slug: z.string() }),
    handler: async (args: { slug: string }) => {
      return client.put(`/api/servicecategories/${args.slug}`, { isActive: false });
    },
  },

  timeiq_service_category_activate: {
    description: "Activate a previously archived service category (sets isActive to true).",
    inputSchema: z.object({ slug: z.string() }),
    handler: async (args: { slug: string }) => {
      return client.put(`/api/servicecategories/${args.slug}`, { isActive: true });
    },
  },
};
