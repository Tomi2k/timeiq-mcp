import { describe, it, expect } from "vitest";
import { getTodayDateString, getCurrentDateTimeString, checkDateSanity } from "../src/utils/dates.js";

describe("Date Utilities", () => {
  describe("getTodayDateString", () => {
    it("should return a valid YYYY-MM-DD date format", () => {
      const today = getTodayDateString("Europe/Berlin");
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should fallback gracefully for invalid timezones", () => {
      const today = getTodayDateString("Invalid/Timezone");
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getCurrentDateTimeString", () => {
    it("should return a valid YYYY-MM-DD HH:MM:SS datetime format", () => {
      const dt = getCurrentDateTimeString("Europe/Berlin");
      expect(dt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe("checkDateSanity", () => {
    it("should reject invalid formatting", () => {
      const result = checkDateSanity("29-05-2026");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid date format");
    });

    it("should reject non-existent dates", () => {
      const result = checkDateSanity("2026-02-30");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should permit today's date cleanly", () => {
      const today = getTodayDateString();
      const result = checkDateSanity(today);
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it("should reject dates more than 365 days in the future", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const futureStr = futureDate.toISOString().split("T")[0]!;
      const result = checkDateSanity(futureStr);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too far in the future");
    });

    it("should warn (but permit) dates older than 90 days in the past", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 100);
      const pastStr = pastDate.toISOString().split("T")[0]!;
      const result = checkDateSanity(pastStr);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain("older than 90 days");
    });
  });
});
