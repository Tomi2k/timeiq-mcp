/**
 * Compares an updated object against the original entity and returns a partial changeset
 * containing only the fields that actually changed.
 * Handles arrays, Dates, and nested objects via deep stringification comparison.
 */
export function diffChangeset<T extends Record<string, any>>(
  original: T,
  updates: Partial<T>
): Partial<T> {
  const changeset: Partial<T> = {};

  for (const key of Object.keys(updates) as Array<keyof T>) {
    const originalVal = original[key];
    const updateVal = updates[key];

    if (originalVal === updateVal) {
      continue;
    }

    // Handle array comparisons
    if (Array.isArray(originalVal) && Array.isArray(updateVal)) {
      if (JSON.stringify(originalVal) !== JSON.stringify(updateVal)) {
        changeset[key] = updateVal;
      }
    }
    // Handle Date comparisons
    else if ((originalVal as any) instanceof Date && (updateVal as any) instanceof Date) {
      if ((originalVal as any).getTime() !== (updateVal as any).getTime()) {
        changeset[key] = updateVal;
      }
    }
    // Handle object comparisons (deep check)
    else if (
      originalVal && typeof originalVal === "object" &&
      updateVal && typeof updateVal === "object"
    ) {
      if (JSON.stringify(originalVal) !== JSON.stringify(updateVal)) {
        changeset[key] = updateVal;
      }
    }
    // Primitive values
    else {
      changeset[key] = updateVal;
    }
  }

  return changeset;
}
