import { config } from "../config.js";

/**
 * Returns today's date formatted as YYYY-MM-DD in the target IANA timezone.
 */
export function getTodayDateString(timeZone: string = config.TIMEIQ_DEFAULT_TZ): string {
  try {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
  } catch {
    // Fallback if timezone is invalid
    const d = new Date();
    return d.toISOString().split("T")[0]!;
  }
}

/**
 * Returns the current local time formatted as YYYY-MM-DD HH:MM:SS in the target IANA timezone.
 */
export function getCurrentDateTimeString(timeZone: string = config.TIMEIQ_DEFAULT_TZ): string {
  try {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;
    const second = parts.find((p) => p.type === "second")?.value;
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } catch {
    const d = new Date();
    return d.toISOString().replace("T", " ").substring(0, 19);
  }
}

export interface DateSanityResult {
  valid: boolean;
  warning?: string;
  error?: string;
}

/**
 * Validates a YYYY-MM-DD date string.
 * - Rejects dates more than 365 days in the future.
 * - Warns (but permits) dates more than 90 days in the past.
 */
export function checkDateSanity(dateStr: string): DateSanityResult {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return { valid: false, error: "Invalid date format. Must be YYYY-MM-DD" };
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const entryDate = new Date(`${dateStr}T00:00:00`);
  if (isNaN(entryDate.getTime())) {
    return { valid: false, error: "Invalid date value" };
  }

  // Strict check to prevent JavaScript date rollover (e.g., Feb 30 -> March 2)
  if (
    entryDate.getFullYear() !== y ||
    (entryDate.getMonth() + 1) !== m ||
    entryDate.getDate() !== d
  ) {
    return { valid: false, error: `Invalid calendar date: '${dateStr}' does not exist on the calendar.` };
  }

  const todayStr = getTodayDateString();
  const today = new Date(`${todayStr}T00:00:00`);

  const oneYearFuture = new Date(today);
  oneYearFuture.setFullYear(oneYearFuture.getFullYear() + 1);

  const ninetyDaysPast = new Date(today);
  ninetyDaysPast.setDate(ninetyDaysPast.getDate() - 90);


  if (entryDate > oneYearFuture) {
    return {
      valid: false,
      error: `Date is too far in the future (${dateStr}). Must be within 365 days.`,
    };
  }

  if (entryDate < ninetyDaysPast) {
    return {
      valid: true,
      warning: `Date is older than 90 days (${dateStr}). Entry is permitted but flagged as retro-active.`,
    };
  }

  return { valid: true };
}
