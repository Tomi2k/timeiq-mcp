import { z } from "zod";
import { client, TimeIQError } from "../client.js";
import { getTodayDateString } from "../utils/dates.js";

// Inputs
export const ExpenseListMeInput = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const ExpenseListPersonInput = z.object({
  slug: z.string(),
  start_date: z.string(),
  end_date: z.string(),
});

export const ExpenseCreateInput = z.object({
  date: z.string(),
  project_id: z.number(),
  amount: z.number(),
  notes: z.string().optional(),
  expense_type_id: z.number().optional(),
  is_billable: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

export const ExpenseUpdateInput = z.object({
  id: z.number(),
  changeset: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

export const ExpenseDeleteInput = z.object({
  id: z.number(),
  dry_run: z.boolean().optional(),
});

export const ExpenseDeleteManyInput = z.object({
  ids: z.array(z.number()),
  confirm_bulk: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

export const ExpenseUpdateManyInput = z.object({
  ids: z.array(z.number()),
  changeset: z.record(z.any()),
  confirm_bulk: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

// Category and Types inputs
export const ExpenseTypeCreateInput = z.object({
  name: z.string(),
  isActive: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

export const ExpenseTypeUpdateInput = z.object({
  slug: z.string(),
  changeset: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

// Tools Implementation
export const expenseTools = {
  timeiq_expense_list_me: {
    description: "List expense entries for the acting user within a date range.",
    inputSchema: ExpenseListMeInput,
    handler: async (args: z.infer<typeof ExpenseListMeInput>) => {
      const today = getTodayDateString();
      const start = args.start_date || today;
      const end = args.end_date || today;
      return client.get(`/api/expenses/${start}/${end}`);
    },
  },

  timeiq_expense_list_person: {
    description: "List expense entries for a specific person by their slug (Admin only).",
    inputSchema: ExpenseListPersonInput,
    handler: async (args: z.infer<typeof ExpenseListPersonInput>) => {
      return client.get(`/api/people/${args.slug}/expenses/${args.start_date}/${args.end_date}`);
    },
  },

  timeiq_expense_create: {
    description: "Create a new expense entry.",
    inputSchema: ExpenseCreateInput,
    handler: async (args: z.infer<typeof ExpenseCreateInput>) => {
      const body = {
        date: args.date,
        project_id: args.project_id,
        amount: args.amount,
        notes: args.notes,
        expense_type_id: args.expense_type_id,
        is_billable: args.is_billable ?? true,
      };
      return client.post("/api/expenses", body, { dryRun: args.dry_run });
    },
  },

  timeiq_expense_update: {
    description: "Update an existing expense entry with a partial changeset.",
    inputSchema: ExpenseUpdateInput,
    handler: async (args: z.infer<typeof ExpenseUpdateInput>) => {
      return client.put(`/api/expenses/${args.id}`, args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_expense_delete: {
    description: "Delete an existing expense entry by ID.",
    inputSchema: ExpenseDeleteInput,
    handler: async (args: z.infer<typeof ExpenseDeleteInput>) => {
      return client.delete(`/api/expenses/${args.id}`, undefined, { dryRun: args.dry_run });
    },
  },

  timeiq_expense_delete_many: {
    description: "Delete multiple expense entries. Safe-guarded for actions exceeding 50 entries.",
    inputSchema: ExpenseDeleteManyInput,
    handler: async (args: z.infer<typeof ExpenseDeleteManyInput>) => {
      if (args.ids.length > 50 && !args.confirm_bulk) {
        throw new TimeIQError(`Bulk action safety warning: Attempting to delete ${args.ids.length} expenses. Please pass confirm_bulk: true to proceed.`, 400);
      }
      return client.post("/api/expenses/actions/delete", { ids: args.ids }, { dryRun: args.dry_run });
    },
  },

  timeiq_expense_update_many: {
    description: "Update multiple expense entries. Safe-guarded for actions exceeding 50 entries.",
    inputSchema: ExpenseUpdateManyInput,
    handler: async (args: z.infer<typeof ExpenseUpdateManyInput>) => {
      if (args.ids.length > 50 && !args.confirm_bulk) {
        throw new TimeIQError(`Bulk action safety warning: Attempting to update ${args.ids.length} expenses. Please pass confirm_bulk: true to proceed.`, 400);
      }
      return client.put("/api/expenses/actions/update", { ids: args.ids, changeset: args.changeset }, { dryRun: args.dry_run });
    },
  },

  // EXPENSE TYPES
  timeiq_expense_type_list: {
    description: "List active expense types. Optional toggle to list archived types instead.",
    inputSchema: z.object({ archived: z.boolean().optional() }),
    handler: async (args: { archived?: boolean }) => {
      const path = args.archived ? "/api/expensetypes/archived" : "/api/expensetypes";
      return client.get(path);
    },
  },

  timeiq_expense_type_get: {
    description: "Get a single expense type by its slug.",
    inputSchema: z.object({ slug: z.string() }),
    handler: async (args: { slug: string }) => {
      return client.get(`/api/expensetypes/${args.slug}`);
    },
  },

  timeiq_expense_type_create: {
    description: "Create a new expense type.",
    inputSchema: ExpenseTypeCreateInput,
    handler: async (args: z.infer<typeof ExpenseTypeCreateInput>) => {
      const body = {
        name: args.name,
        isActive: args.isActive ?? true,
      };
      return client.post("/api/expensetypes", body, { dryRun: args.dry_run });
    },
  },

  timeiq_expense_type_update: {
    description: "Update an existing expense type by its slug with a partial changeset.",
    inputSchema: ExpenseTypeUpdateInput,
    handler: async (args: z.infer<typeof ExpenseTypeUpdateInput>) => {
      return client.put(`/api/expensetypes/${args.slug}`, args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_expense_type_delete: {
    description: "Delete an existing expense type by its slug.",
    inputSchema: z.object({ slug: z.string(), dry_run: z.boolean().optional() }),
    handler: async (args: { slug: string; dry_run?: boolean }) => {
      return client.delete(`/api/expensetypes/${args.slug}`, undefined, { dryRun: args.dry_run });
    },
  },

  timeiq_expense_type_archive: {
    description: "Archive an expense type (sets isActive to false).",
    inputSchema: z.object({ slug: z.string() }),
    handler: async (args: { slug: string }) => {
      return client.put(`/api/expensetypes/${args.slug}`, { isActive: false });
    },
  },

  timeiq_expense_type_activate: {
    description: "Activate a previously archived expense type (sets isActive to true).",
    inputSchema: z.object({ slug: z.string() }),
    handler: async (args: { slug: string }) => {
      return client.put(`/api/expensetypes/${args.slug}`, { isActive: true });
    },
  },

  // EXPENSE CATEGORIES
  timeiq_expense_category_list: {
    description: "List active expense categories. Optional toggle to list archived instead.",
    inputSchema: z.object({ archived: z.boolean().optional() }),
    handler: async (args: { archived?: boolean }) => {
      const path = args.archived ? "/api/expensecategories/archived" : "/api/expensecategories";
      return client.get(path);
    },
  },

  timeiq_expense_category_create: {
    description: "Create a new expense category.",
    inputSchema: ExpenseTypeCreateInput,
    handler: async (args: z.infer<typeof ExpenseTypeCreateInput>) => {
      const body = {
        name: args.name,
        isActive: args.isActive ?? true,
      };
      return client.post("/api/expensecategories", body, { dryRun: args.dry_run });
    },
  },

  timeiq_expense_category_update: {
    description: "Update an existing expense category by its slug with a partial changeset.",
    inputSchema: ExpenseTypeUpdateInput,
    handler: async (args: z.infer<typeof ExpenseTypeUpdateInput>) => {
      return client.put(`/api/expensecategories/${args.slug}`, args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_expense_category_delete: {
    description: "Delete an existing expense category by its slug.",
    inputSchema: z.object({ slug: z.string(), dry_run: z.boolean().optional() }),
    handler: async (args: { slug: string; dry_run?: boolean }) => {
      return client.delete(`/api/expensecategories/${args.slug}`, undefined, { dryRun: args.dry_run });
    },
  },

  timeiq_expense_category_archive: {
    description: "Archive an expense category (sets isActive to false).",
    inputSchema: z.object({ slug: z.string() }),
    handler: async (args: { slug: string }) => {
      return client.put(`/api/expensecategories/${args.slug}`, { isActive: false });
    },
  },

  timeiq_expense_category_activate: {
    description: "Activate a previously archived expense category (sets isActive to true).",
    inputSchema: z.object({ slug: z.string() }),
    handler: async (args: { slug: string }) => {
      return client.put(`/api/expensecategories/${args.slug}`, { isActive: true });
    },
  },
};
