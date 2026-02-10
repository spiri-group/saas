export function resolvePlaceholders(
  content: string,
  globalPlaceholders: Record<string, string>,
  documentPlaceholders?: Record<string, string>
): string {
  const merged = { ...globalPlaceholders, ...(documentPlaceholders || {}) };
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return merged[key] !== undefined ? merged[key] : match;
  });
}
