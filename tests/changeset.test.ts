import { describe, it, expect } from "vitest";
import { diffChangeset } from "../src/utils/changeset.js";

describe("Changeset Diffing Utilities", () => {
  it("should yield only modified primitive fields", () => {
    const original = { name: "John", age: 30, active: true };
    const updates = { name: "John", age: 31 };
    
    const result = diffChangeset(original, updates);
    expect(result).toEqual({ age: 31 });
  });

  it("should return empty object when no fields changed", () => {
    const original = { name: "John", age: 30 };
    const updates = { name: "John", age: 30 };
    
    const result = diffChangeset(original, updates);
    expect(result).toEqual({});
  });

  it("should diff arrays correctly using deep comparison", () => {
    const original = { ids: [1, 2, 3] };
    const updates1 = { ids: [1, 2, 3] };
    const updates2 = { ids: [1, 2, 4] };
    
    expect(diffChangeset(original, updates1)).toEqual({});
    expect(diffChangeset(original, updates2)).toEqual({ ids: [1, 2, 4] });
  });

  it("should compare dates by timestamp", () => {
    const d1 = new Date("2026-05-29T10:00:00Z");
    const d2 = new Date("2026-05-29T10:00:00Z");
    const d3 = new Date("2026-05-29T11:00:00Z");

    const original = { date: d1 };
    
    expect(diffChangeset(original, { date: d2 })).toEqual({});
    expect(diffChangeset(original, { date: d3 })).toEqual({ date: d3 });
  });

  it("should compare deep objects safely via serialization", () => {
    const original = { settings: { alert: true, count: 5 } };
    const updates1 = { settings: { alert: true, count: 5 } };
    const updates2 = { settings: { alert: false, count: 5 } };

    expect(diffChangeset(original, updates1)).toEqual({});
    expect(diffChangeset(original, updates2)).toEqual({ settings: { alert: false, count: 5 } });
  });
});
