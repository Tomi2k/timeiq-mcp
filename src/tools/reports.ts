import { z } from "zod";
import { client } from "../client.js";

// Standard report query schema
export const ReportInputSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  clients: z.array(z.number()).optional(),
  projects: z.array(z.number()).optional(),
  services: z.array(z.number()).optional(),
  people: z.array(z.number()).optional(),
  // Additional parameters unique to certain report endpoints
  extras: z.record(z.any()).optional(),
});

function buildReportBody(args: z.infer<typeof ReportInputSchema>) {
  return {
    parameters: {
      start_date: args.start_date,
      end_date: args.end_date,
      clients: args.clients || [],
      projects: args.projects || [],
      services: args.services || [],
      people: args.people || [],
      ...(args.extras || {}),
    },
  };
}

export const reportTools = {
  timeiq_report_standard: {
    description: "Generate standard summary report overview.",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/standard", buildReportBody(args));
    },
  },

  timeiq_report_standard_time: {
    description: "Generate standard report - time totals and items.",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/standard/time", buildReportBody(args));
    },
  },

  timeiq_report_standard_expenses: {
    description: "Generate standard report - expenses totals.",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/standard/expenses", buildReportBody(args));
    },
  },

  timeiq_report_time: {
    description: "Generate time report (totals & project breakdowns).",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/time", buildReportBody(args));
    },
  },

  timeiq_report_time_detail: {
    description: "Generate detailed time-entry report (specific items list).",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/time/time", buildReportBody(args));
    },
  },

  timeiq_report_expenses: {
    description: "Generate summary expense report.",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/expenses", buildReportBody(args));
    },
  },

  timeiq_report_expenses_detail: {
    description: "Generate detailed expense-entry report (items list).",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/expenses/expenses", buildReportBody(args));
    },
  },

  timeiq_report_classic: {
    description: "Generate classic summary report (legacy layout).",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/classic", buildReportBody(args));
    },
  },

  timeiq_report_classic_time: {
    description: "Generate classic time report.",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/classicTime", buildReportBody(args));
    },
  },

  timeiq_report_custom: {
    description: "Generate custom report utilizing flexible filter extras.",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/custom", buildReportBody(args));
    },
  },

  timeiq_report_period: {
    description: "Generate report aligned to timesheet periods.",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/period", buildReportBody(args));
    },
  },

  timeiq_report_payroll: {
    description: "Generate payroll report (reconciled hours, rates, costs).",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/payroll", buildReportBody(args));
    },
  },

  timeiq_report_recent_activity: {
    description: "Generate feed showing recent activity/logs by project or person.",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/recentActivity", buildReportBody(args));
    },
  },

  timeiq_report_missing_time: {
    description: "Identify people with missing required working hours (capacity gaps).",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/missingTime", buildReportBody(args));
    },
  },

  timeiq_report_incomplete_time: {
    description: "Identify people with incomplete, un-submitted, or open timers.",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/incompleteTime", buildReportBody(args));
    },
  },

  timeiq_report_search_time: {
    description: "Perform filter search across all time entries.",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/search/time", buildReportBody(args));
    },
  },

  timeiq_report_search_expenses: {
    description: "Perform filter search across all expense entries.",
    inputSchema: ReportInputSchema,
    handler: async (args: z.infer<typeof ReportInputSchema>) => {
      return client.post("/api/reports/search/expenses", buildReportBody(args));
    },
  },
};
