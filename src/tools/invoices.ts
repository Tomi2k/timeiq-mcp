import { z } from "zod";
import { client } from "../client.js";

// Inputs
export const InvoiceListInput = z.object({
  from: z.string().optional(), // YYYY-MM-DD
  to: z.string().optional(),
});

export const InvoiceListClientInput = z.object({
  clientId: z.number(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const InvoiceIdInput = z.object({
  id: z.number(),
});

export const InvoiceActionInput = z.object({
  id: z.number(),
  dry_run: z.boolean().optional(),
});

export const InvoiceGetByNumberInput = z.object({
  number: z.string(),
});

export const InvoiceCreateInput = z.object({
  client_id: z.number(),
  invoice_number: z.string(),
  date: z.string().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  dry_run: z.boolean().optional(),
});

export const InvoiceUpdateInput = z.object({
  id: z.number(),
  changeset: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

// Line Items inputs
export const LineItemAddInput = z.object({
  invoice_id: z.number(),
  description: z.string(),
  quantity: z.number(),
  rate: z.number(),
  amount: z.number().optional(),
  dry_run: z.boolean().optional(),
});

export const LineItemUpdateInput = z.object({
  id: z.number(),
  changeset: z.record(z.any()),
  dry_run: z.boolean().optional(),
});

export const LineItemDeleteInput = z.object({
  id: z.number(),
  dry_run: z.boolean().optional(),
});

// Tools Implementation
export const invoiceTools = {
  timeiq_invoice_list: {
    description: "List all invoices, optionally filtered by date range.",
    inputSchema: InvoiceListInput,
    handler: async (args: z.infer<typeof InvoiceListInput>) => {
      const query: Record<string, unknown> = {};
      if (args.from) query.from = args.from;
      if (args.to) query.to = args.to;
      return client.get("/api/invoices", query);
    },
  },

  timeiq_invoice_list_for_client: {
    description: "List all invoices for a specific client within an optional date range.",
    inputSchema: InvoiceListClientInput,
    handler: async (args: z.infer<typeof InvoiceListClientInput>) => {
      const query: Record<string, unknown> = {};
      if (args.from) query.from = args.from;
      if (args.to) query.to = args.to;
      return client.get(`/api/invoices/clients/${args.clientId}`, query);
    },
  },

  timeiq_invoice_get: {
    description: "Get details of a single invoice by its ID.",
    inputSchema: InvoiceIdInput,
    handler: async (args: z.infer<typeof InvoiceIdInput>) => {
      return client.get(`/api/invoices/${args.id}`);
    },
  },

  timeiq_invoice_get_by_number: {
    description: "Get a single invoice by its alphanumeric invoice number.",
    inputSchema: InvoiceGetByNumberInput,
    handler: async (args: z.infer<typeof InvoiceGetByNumberInput>) => {
      return client.get(`/api/invoices/invoice_number/${args.number}`);
    },
  },

  timeiq_invoice_create: {
    description: "Create a new draft invoice.",
    inputSchema: InvoiceCreateInput,
    handler: async (args: z.infer<typeof InvoiceCreateInput>) => {
      const body = {
        client_id: args.client_id,
        invoice_number: args.invoice_number,
        date: args.date,
        due_date: args.due_date,
        notes: args.notes,
      };
      return client.post("/api/invoices", body, { dryRun: args.dry_run });
    },
  },

  timeiq_invoice_update: {
    description: "Update an invoice (e.g. details, dates, comments) with a partial changeset.",
    inputSchema: InvoiceUpdateInput,
    handler: async (args: z.infer<typeof InvoiceUpdateInput>) => {
      return client.put(`/api/invoices/${args.id}`, args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_invoice_delete: {
    description: "Delete an existing invoice by ID.",
    inputSchema: InvoiceActionInput,
    handler: async (args: z.infer<typeof InvoiceActionInput>) => {
      return client.delete(`/api/invoices/${args.id}`, undefined, { dryRun: args.dry_run });
    },
  },

  timeiq_invoice_mark_paid: {
    description: "Mark an invoice status as fully paid.",
    inputSchema: InvoiceActionInput,
    handler: async (args: z.infer<typeof InvoiceActionInput>) => {
      return client.post(`/api/invoices/${args.id}/action/paid`, {}, { dryRun: args.dry_run });
    },
  },

  timeiq_invoice_mark_unpaid: {
    description: "Mark a paid or drafted invoice status as unpaid.",
    inputSchema: InvoiceActionInput,
    handler: async (args: z.infer<typeof InvoiceActionInput>) => {
      return client.post(`/api/invoices/${args.id}/action/unpaid`, {}, { dryRun: args.dry_run });
    },
  },

  timeiq_invoice_mark_written_off: {
    description: "Mark an invoice status as written-off/uncollectible.",
    inputSchema: InvoiceActionInput,
    handler: async (args: z.infer<typeof InvoiceActionInput>) => {
      return client.post(`/api/invoices/${args.id}/action/writtenoff`, {}, { dryRun: args.dry_run });
    },
  },

  timeiq_invoice_send: {
    description: "Trigger the invoice-send email to the client's email addresses.",
    inputSchema: InvoiceActionInput,
    handler: async (args: z.infer<typeof InvoiceActionInput>) => {
      return client.post(`/api/invoices/${args.id}/action/send`, {}, { dryRun: args.dry_run });
    },
  },

  timeiq_invoice_export: {
    description: "Get invoice export/PDF compile details (Client-side URL tag).",
    inputSchema: InvoiceIdInput,
    handler: async (args: z.infer<typeof InvoiceIdInput>) => {
      return client.get(`/client_invoices/${args.id}/action/export`);
    },
  },

  // LINE ITEMS
  timeiq_lineitem_add: {
    description: "Add a new line item details row to an existing invoice.",
    inputSchema: LineItemAddInput,
    handler: async (args: z.infer<typeof LineItemAddInput>) => {
      const body = {
        invoice_id: args.invoice_id,
        description: args.description,
        quantity: args.quantity,
        rate: args.rate,
        amount: args.amount ?? (args.quantity * args.rate),
      };
      return client.post("/api/lineitems", body, { dryRun: args.dry_run });
    },
  },

  timeiq_lineitem_update: {
    description: "Update a single line item details row on an invoice.",
    inputSchema: LineItemUpdateInput,
    handler: async (args: z.infer<typeof LineItemUpdateInput>) => {
      return client.put(`/api/lineitems/${args.id}`, args.changeset, { dryRun: args.dry_run });
    },
  },

  timeiq_lineitem_delete: {
    description: "Remove a line item details row from an invoice.",
    inputSchema: LineItemDeleteInput,
    handler: async (args: z.infer<typeof LineItemDeleteInput>) => {
      return client.delete(`/api/lineitems/${args.id}`, undefined, { dryRun: args.dry_run });
    },
  },
};
