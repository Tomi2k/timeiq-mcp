import { describe, it, expect, beforeEach, vi } from "vitest";
import { config } from "../src/config.js";
import { enforceUserOwnership, resolveSlackUser, _resetSlackCache } from "../src/utils/slack.js";
import { client } from "../src/client.js";

// Mock the client to prevent actual API calls during test
vi.mock("../src/client.js", () => {
  return {
    TimeIQError: class TimeIQError extends Error {
      public status: number;
      constructor(message: string, status: number) {
        super(message);
        this.status = status;
      }
    },
    client: {
      get: vi.fn(),
    },
  };
});

describe("Slack Utilities & Security Policies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    config.TIMEIQ_SLACK_MAP = undefined;
    _resetSlackCache();
  });

  describe("resolveSlackUser", () => {
    it("should return null if TIMEIQ_SLACK_MAP is not set", async () => {
      const result = await resolveSlackUser("U12345");
      expect(result).toBeNull();
    });

    it("should throw if TIMEIQ_SLACK_MAP is set but slack_id is missing", async () => {
      config.TIMEIQ_SLACK_MAP = '{"U12345": "cara@domain.com"}';
      await expect(resolveSlackUser(undefined)).rejects.toThrow(
        "Security Policy Violation: 'requesting_slack_id' must be provided for this operation."
      );
    });

    it("should throw if slack_id is not mapped in JSON map", async () => {
      config.TIMEIQ_SLACK_MAP = '{"U12345": "cara@domain.com"}';
      await expect(resolveSlackUser("U99999")).rejects.toThrow(
        "Security Policy Violation: Slack ID 'U99999' is not mapped to any TimeIQ account."
      );
    });

    it("should throw if mapped email is not found in coworker directory", async () => {
      config.TIMEIQ_SLACK_MAP = '{"U12345": "cara@domain.com"}';
      vi.mocked(client.get).mockResolvedValue([
        { id: 2, email: "emily@domain.com", slug: "emily" },
      ]);

      await expect(resolveSlackUser("U12345")).rejects.toThrow(
        "Security Policy Violation: Mapped email 'cara@domain.com' not found in the TimeIQ directory."
      );
    });

    it("should resolve correct coworker record when matching email is found", async () => {
      config.TIMEIQ_SLACK_MAP = '{"U12345": "cara@domain.com"}';
      const expectedRecord = { id: 1, email: "cara@domain.com", slug: "cara" };
      vi.mocked(client.get).mockResolvedValue([
        expectedRecord,
        { id: 2, email: "emily@domain.com", slug: "emily" },
      ]);

      const result = await resolveSlackUser("U12345");
      expect(result).toEqual(expectedRecord);
    });
  });

  describe("enforceUserOwnership", () => {
    it("should do nothing if resolvedPerson is null", () => {
      expect(() => enforceUserOwnership(null, 2)).not.toThrow();
    });

    it("should throw if resolvedPerson id does not match entry person id", () => {
      const resolved = { id: 1, email: "cara@domain.com" };
      expect(() => enforceUserOwnership(resolved, 2)).toThrow(
        "Security Policy Violation: Access denied. You do not have permission to modify or access entries belonging to person ID 2."
      );
    });

    it("should not throw if resolvedPerson id matches entry person id", () => {
      const resolved = { id: 1, email: "cara@domain.com" };
      expect(() => enforceUserOwnership(resolved, 1)).not.toThrow();
      expect(() => enforceUserOwnership(resolved, "1")).not.toThrow();
    });
  });
});
