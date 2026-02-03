/**
 * Utility for auto-extracting loved ones' names from mediumship reading messages
 *
 * This allows practitioners to mention loved ones in their delivery message,
 * and have them automatically added to the customer's "Loved Ones in Spirit" area.
 */

export interface ExtractedLovedOne {
  name: string;
  relationship?: string;
}

/**
 * Extract loved ones' names from a mediumship reading message
 * Uses pattern matching to find mentions of deceased loved ones with relationships
 *
 * @param text - The delivery message from the medium
 * @returns Array of extracted loved ones with names and optional relationships
 */
export function extractLovedOnesFromText(text: string): ExtractedLovedOne[] {
  if (!text) return [];

  const lovedOnes: ExtractedLovedOne[] = [];
  const seenNames = new Set<string>();

  // Pattern 1: "your [relationship] [Name]" (e.g., "your grandmother Mary", "your uncle Robert")
  const pattern1 = /your\s+(grandmother|grandfather|mother|father|sister|brother|aunt|uncle|cousin|friend|wife|husband|partner|son|daughter|child)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
  const matches1 = [...text.matchAll(pattern1)];
  for (const match of matches1) {
    const relationship = match[1].charAt(0).toUpperCase() + match[1].slice(1); // Capitalize
    const name = match[2].trim();
    const normalized = name.toLowerCase();

    if (!seenNames.has(normalized) && name.length >= 2) {
      lovedOnes.push({ name, relationship });
      seenNames.add(normalized);
    }
  }

  // Pattern 2: Named people with strong indicators (e.g., "**Mary**", "spirit named John", "connected with Sarah")
  const pattern2 = /(?:\*\*|spirit\s+named|connected\s+with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\**/gi;
  const matches2 = [...text.matchAll(pattern2)];
  for (const match of matches2) {
    const name = match[1].replace(/\*\*/g, '').trim();
    const normalized = name.toLowerCase();

    if (!seenNames.has(normalized) && name.length >= 2) {
      // Check if we already have this person with relationship
      const existing = lovedOnes.find(lo => lo.name.toLowerCase() === normalized);
      if (!existing) {
        lovedOnes.push({ name });
        seenNames.add(normalized);
      }
    }
  }

  // Pattern 3: Numbered list format (e.g., "1. **Mary**", "2. **Uncle Robert**")
  const pattern3 = /\d+\.\s+\*\*([^*]+)\*\*/g;
  const matches3 = [...text.matchAll(pattern3)];
  for (const match of matches3) {
    const fullText = match[1].trim();

    // Extract relationship and name if present
    const relationshipMatch = fullText.match(/^(Grandmother|Grandfather|Mother|Father|Sister|Brother|Aunt|Uncle|Cousin|Friend|Wife|Husband|Partner|Son|Daughter|Child|Your\s+\w+)\s+(.+)$/i);

    if (relationshipMatch) {
      const relationship = relationshipMatch[1]
        .replace(/^Your\s+/i, '')
        .charAt(0)
        .toUpperCase() + relationshipMatch[1]
        .replace(/^Your\s+/i, '')
        .slice(1)
        .toLowerCase();
      const name = relationshipMatch[2].trim();
      const normalized = name.toLowerCase();

      if (!seenNames.has(normalized) && name.length >= 2) {
        lovedOnes.push({ name, relationship });
        seenNames.add(normalized);
      }
    } else {
      // Just a name
      const name = fullText.trim();
      const normalized = name.toLowerCase();

      if (!seenNames.has(normalized) && name.length >= 2) {
        const existing = lovedOnes.find(lo => lo.name.toLowerCase() === normalized);
        if (!existing) {
          lovedOnes.push({ name });
          seenNames.add(normalized);
        }
      }
    }
  }

  return lovedOnes;
}

/**
 * Check if a reading type indicates mediumship
 */
export function isMediumshipReading(readingType?: string): boolean {
  if (!readingType) return false;
  const normalized = readingType.toLowerCase().trim();
  return normalized === 'medium' || normalized === 'mediumship' || normalized === 'mediumship reading';
}
