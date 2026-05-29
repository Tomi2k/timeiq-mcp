/**
 * Converts a human-readable name into a TimeIQ API-compliant snake_case slug.
 * - Lowercases the string.
 * - Converts German umlauts (ä -> ae, ö -> oe, ü -> ue, ß -> ss).
 * - Strips accents/diacritics.
 * - Replaces all non-alphanumeric characters with underscores.
 * - Collapses consecutive underscores and trims leading/trailing ones.
 * 
 * Example: "SEO monatlich 06/2026" -> "seo_monatlich_06_2026"
 */
export function toSlug(name: string): string {
  if (!name) return "";

  let slug = name.trim().toLowerCase();

  // Handle German umlauts explicitly
  slug = slug.replace(/ä/g, "ae");
  slug = slug.replace(/ö/g, "oe");
  slug = slug.replace(/ü/g, "ue");
  slug = slug.replace(/ß/g, "ss");

  // Normalize diacritics (e.g. é -> e, à -> a)
  slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Replace any character that is not lowercase letter or digit with an underscore
  slug = slug.replace(/[^a-z0-9]/g, "_");

  // Collapse multiple consecutive underscores
  slug = slug.replace(/_+/g, "_");

  // Remove leading and trailing underscores
  slug = slug.replace(/^_+|_+$/g, "");

  return slug;
}
