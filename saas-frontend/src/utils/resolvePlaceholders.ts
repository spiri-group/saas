// Map document titles to their URL slugs for cross-reference linking
const DOCUMENT_TITLE_TO_SLUG: Record<string, string> = {
  "Terms of Service": "terms-of-service",
  "Privacy Policy": "privacy-policy",
  "Cookie Policy": "cookie-policy",
  "Merchant Terms": "merchant-terms",
  "Merchant Terms of Service": "merchant-terms",
  "Refund & Returns Policy": "refund-policy",
  "Acceptable Use Policy": "acceptable-use-policy",
  "Community Guidelines": "acceptable-use-policy",
  "Spiritual Services Disclaimer": "spiritual-services-disclaimer",
  "Payment & Fee Terms": "payment-terms",
  "Intellectual Property & DMCA Policy": "intellectual-property-policy",
};

export function resolvePlaceholders(
  content: string,
  globalPlaceholders: Record<string, string>,
  documentPlaceholders?: Record<string, string>
): string {
  const merged = { ...globalPlaceholders, ...(documentPlaceholders || {}) };

  // Resolve [UPPER_SNAKE_CASE] placeholders
  let resolved = content.replace(/\[([A-Z][A-Z0-9_]*)\]/g, (match, key) => {
    return merged[key] !== undefined ? merged[key] : match;
  });

  // Resolve [Document Title] cross-references into links
  resolved = resolved.replace(/\[([A-Z][a-zA-Z &]+)\]/g, (match, title) => {
    const slug = DOCUMENT_TITLE_TO_SLUG[title];
    return slug ? `[${title}](/legal/${slug})` : match;
  });

  return resolved;
}
