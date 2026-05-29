import { describe, it, expect, beforeEach, vi } from "vitest";
import { projectTools } from "../src/tools/projects.js";
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
      put: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe("Project Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("timeiq_project_archive", () => {
    it("should fetch project ID and call bulk update with active:false", async () => {
      vi.mocked(client.get).mockResolvedValue({
        projects: [{ id: 42, slug: "test-project", name: "Test Project", active: true }],
      });
      vi.mocked(client.put).mockResolvedValue({ success: true });

      const result = await projectTools.timeiq_project_archive.handler({ slug: "test-project" });

      expect(client.get).toHaveBeenCalledWith("/api/projects/test-project");
      expect(client.put).toHaveBeenCalledWith("/api/projects/actions/update", {
        project_ids: [42],
        changeset: { active: false }
      });
      expect(result).toEqual({
        success: true,
        project_id: 42,
        slug: "test-project",
        active: false,
      });
    });

    it("should throw a 404 if project to archive is not found", async () => {
      vi.mocked(client.get).mockResolvedValue({ projects: [] });

      await expect(
        projectTools.timeiq_project_archive.handler({ slug: "missing" })
      ).rejects.toThrow("Project with slug 'missing' not found.");
    });
  });

  describe("timeiq_project_activate", () => {
    it("should fetch project ID and call bulk update with active:true", async () => {
      vi.mocked(client.get).mockResolvedValue({
        projects: [{ id: 42, slug: "test-project", name: "Test Project", active: false }],
      });
      vi.mocked(client.put).mockResolvedValue({ success: true });

      const result = await projectTools.timeiq_project_activate.handler({ slug: "test-project" });

      expect(client.get).toHaveBeenCalledWith("/api/projects/test-project");
      expect(client.put).toHaveBeenCalledWith("/api/projects/actions/update", {
        project_ids: [42],
        changeset: { active: true }
      });
      expect(result).toEqual({
        success: true,
        project_id: 42,
        slug: "test-project",
        active: true,
      });
    });
  });

  describe("timeiq_project_update_many", () => {
    it("should invoke PUT /api/projects/actions/update with project_ids", async () => {
      vi.mocked(client.put).mockResolvedValue({ success: true });

      const result = await projectTools.timeiq_project_update_many.handler({
        ids: [10, 20],
        changeset: { budget_total: 5000 },
        confirm_bulk: true
      });

      expect(client.put).toHaveBeenCalledWith(
        "/api/projects/actions/update",
        {
          project_ids: [10, 20],
          changeset: { budget_total: 5000 },
        },
        { dryRun: undefined }
      );
      expect(result).toEqual({ success: true });
    });
  });
});
