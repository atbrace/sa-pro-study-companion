/**
 * Extract content from a heading to the next heading of same or higher level
 *
 * This utility extracts a subsection of markdown content between headings,
 * which is used to provide context-specific content to the AI tutor.
 *
 * @param fullContent - The full markdown content of the section
 * @param headingText - The text of the heading to find
 * @param headingLevel - The level of the heading (2, 3, or 4)
 * @returns The extracted content including the heading, or empty string if not found
 */
export function extractSubsectionContent(
  fullContent: string,
  headingText: string,
  headingLevel: 2 | 3 | 4
): string {
  // Escape special regex characters in heading text
  const escapedHeading = headingText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Build regex to find this specific heading
  // Matches: ## Heading, ### Heading, or #### Heading
  const headingMarker = '#'.repeat(headingLevel);
  const headingRegex = new RegExp(
    `^${headingMarker} ${escapedHeading}\\s*$`,
    'mi'
  );

  const headingMatch = fullContent.match(headingRegex);
  if (!headingMatch || headingMatch.index === undefined) {
    // Heading not found - return empty string
    return '';
  }

  const startPos = headingMatch.index;

  // Find next heading of same or higher level
  // For H2: find next ## (same level)
  // For H3: find next ## or ### (higher or same level)
  // For H4: find next ##, ###, or #### (higher or same level)
  const maxLevel = headingLevel;
  const minLevel = 2;
  const levelPattern = maxLevel === minLevel ? String(maxLevel) : `${minLevel},${maxLevel}`;

  const nextHeadingRegex = new RegExp(
    `^#{${levelPattern}}\\s+`,
    'gm'
  );

  // Start search after current heading
  const remainingContent = fullContent.slice(startPos + headingMatch[0].length);
  const nextMatch = remainingContent.match(nextHeadingRegex);

  const endPos = nextMatch && nextMatch.index !== undefined
    ? startPos + headingMatch[0].length + nextMatch.index
    : fullContent.length;

  let extracted = fullContent.slice(startPos, endPos).trim();

  // Truncate if needed (same limit as current implementation)
  if (extracted.length > 5000) {
    extracted = extracted.substring(0, 5000) + '\n\n[Content truncated...]';
  }

  return extracted;
}
