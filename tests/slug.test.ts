import { describe, it, expect } from "vitest";
import { toSlug } from "../src/utils/slug.js";

describe("Slug Utilities", () => {
  it("should lowercase and replace spaces with underscores", () => {
    expect(toSlug("SEO Project")).toBe("seo_project");
  });

  it("should match reverse-engineered specimen 'SEO monatlich 06/2026'", () => {
    expect(toSlug("SEO monatlich 06/2026")).toBe("seo_monatlich_06_2026");
  });

  it("should handle German umlauts explicitly", () => {
    expect(toSlug("Ärzte & Söhne Düsseldorf")).toBe("aerzte_soehne_duesseldorf");
    expect(toSlug("Großes Projekt")).toBe("grosses_projekt");
  });

  it("should strip accents/diacritics", () => {
    expect(toSlug("Café des Artistes")).toBe("cafe_des_artistes");
  });

  it("should collapse multiple consecutive underscores", () => {
    expect(toSlug("Webseite  ---   Relaunch")).toBe("webseite_relaunch");
  });

  it("should trim leading and trailing underscores", () => {
    expect(toSlug("---  SEO  ---")).toBe("seo");
  });

  it("should return empty string for empty input", () => {
    expect(toSlug("")).toBe("");
  });
});
