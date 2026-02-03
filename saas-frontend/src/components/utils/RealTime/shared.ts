/**
 * Safely merges an incoming real-time update into an existing object,
 * replacing only top-level fields.
 *
 * ⚠️ Nested fields are replaced as whole objects. No deep merge.
 * ⚠️ Ignores `undefined` fields in the update to prevent accidental erasure.
 */
export function safePatch<T extends object>(existing: T, update: Partial<T>): T {
  const result: T = { ...existing };

  for (const key of Object.keys(update) as (keyof T)[]) {
    const incomingValue = update[key];
    if (incomingValue !== undefined) {
      result[key] = incomingValue;
    }
  }

  return result;
}
