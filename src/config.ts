import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables from .env file for local development
dotenv.config();

const rawConfigSchema = z.object({
  TIMEIQ_TENANT: z.string({
    required_error: "TIMEIQ_TENANT environment variable is required",
  }).min(1, "TIMEIQ_TENANT cannot be empty"),
  TIMEIQ_BASE_URL: z.string().url("TIMEIQ_BASE_URL must be a valid URL").optional(),
  TIMEIQ_EMAIL: z.string({
    required_error: "TIMEIQ_EMAIL environment variable is required",
  }).email("TIMEIQ_EMAIL must be a valid email address"),
  TIMEIQ_PASSWORD: z.string({
    required_error: "TIMEIQ_PASSWORD environment variable is required",
  }).min(1, "TIMEIQ_PASSWORD cannot be empty"),
  TIMEIQ_DEFAULT_TZ: z.string().default("Europe/Berlin"),
  TIMEIQ_LOG_LEVEL: z.enum(["info", "debug"]).default("info"),
  TIMEIQ_SLACK_MAP: z.string().optional(),
  // TIMEIQ_DRY_RUN is safe-by-default. If not specified, it defaults to true.
  TIMEIQ_DRY_RUN: z.preprocess((val) => {
    if (val === undefined || val === "") return true;
    if (typeof val === "string") {
      const lower = val.toLowerCase().trim();
      if (lower === "false" || lower === "0") return false;
      return true;
    }
    return Boolean(val);
  }, z.boolean()).default(true),
});

const parsed = rawConfigSchema.safeParse(process.env);

export let config: AppConfig;

interface AppConfig {
  TIMEIQ_TENANT: string;
  TIMEIQ_BASE_URL: string;
  TIMEIQ_EMAIL: string;
  TIMEIQ_PASSWORD: string;
  TIMEIQ_DEFAULT_TZ: string;
  TIMEIQ_LOG_LEVEL: "info" | "debug";
  TIMEIQ_SLACK_MAP?: string;
  TIMEIQ_DRY_RUN: boolean;
}

if (!parsed.success) {
  if (process.env.VITEST) {
    // Inject mock configurations for unit test execution
    config = {
      TIMEIQ_TENANT: "testtenant",
      TIMEIQ_BASE_URL: "https://testtenant.timeiq.com",
      TIMEIQ_EMAIL: "test@example.com",
      TIMEIQ_PASSWORD: "testpassword",
      TIMEIQ_DEFAULT_TZ: "Europe/Berlin",
      TIMEIQ_LOG_LEVEL: "info",
      TIMEIQ_DRY_RUN: true,
    };
  } else {
    console.error("❌ Configuration validation failed:");
    parsed.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join(".")}: ${err.message}`);
    });
    process.exit(1);
  }
} else {
  const validated = parsed.data;
  config = {
    ...validated,
    TIMEIQ_BASE_URL: validated.TIMEIQ_BASE_URL || `https://${validated.TIMEIQ_TENANT}.timeiq.com`,
  };
}


export type Config = typeof config;
