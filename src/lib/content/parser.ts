import type { ContentSection, ParsedTopicContent } from '@/types/domain';

/**
 * Generate a URL-friendly slug from a heading title
 * "AWS Organizations" → "aws-organizations"
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-');       // Replace multiple hyphens with single
}

/**
 * Parse markdown content by H2 headings (##) into separate sections
 *
 * @param markdown - Raw markdown content from topic content.md file
 * @returns Parsed sections with overview, individual sections, and combined list
 */
export function parseTopicSections(markdown: string): ParsedTopicContent {
  // Split by H2 headings (##) but keep the heading with the content
  const h2Regex = /^## (.+)$/gm;
  const sections: ContentSection[] = [];

  // Find all H2 headings and their positions
  const matches = Array.from(markdown.matchAll(h2Regex));

  if (matches.length === 0) {
    // No H2 sections found - return entire content as overview
    const overviewSection: ContentSection = {
      id: 'overview',
      title: 'Overview',
      content: markdown.trim(),
      order: 0,
    };

    return {
      overview: overviewSection,
      sections: [],
      allSections: [overviewSection],
    };
  }

  // Extract overview content (before first H2)
  const firstH2Index = matches[0].index!;
  const overviewContent = markdown.substring(0, firstH2Index).trim();

  // Check if overview is too short (less than 50 words)
  const overviewWordCount = overviewContent.split(/\s+/).filter(w => w.length > 0).length;
  const hasSubstantialOverview = overviewWordCount >= 50;

  let overviewSection: ContentSection;
  let startIndex = 0;

  if (hasSubstantialOverview) {
    // Create dedicated overview section
    overviewSection = {
      id: 'overview',
      title: 'Overview',
      content: overviewContent,
      order: 0,
    };
    startIndex = 0;
  } else {
    // Merge overview into first H2 section
    overviewSection = {
      id: 'overview',
      title: 'Overview',
      content: '',
      order: 0,
    };
    startIndex = 0; // Will include overview content in first section
  }

  // Parse each H2 section
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const title = match[1].trim();
    const startPos = match.index!;

    // Get content from this H2 to the next H2 (or end of file)
    const endPos = i < matches.length - 1 ? matches[i + 1].index! : markdown.length;
    let content = markdown.substring(startPos, endPos).trim();

    // If this is the first section and overview was too short, prepend overview
    if (i === 0 && !hasSubstantialOverview && overviewContent) {
      content = overviewContent + '\n\n' + content;
    }

    sections.push({
      id: generateSlug(title),
      title,
      content,
      order: i + 1,
    });
  }

  // Build combined sections list
  const allSections = hasSubstantialOverview
    ? [overviewSection, ...sections]
    : sections;

  return {
    overview: overviewSection,
    sections,
    allSections,
  };
}

/**
 * Find a section by its slug ID
 *
 * @param parsed - Parsed topic content
 * @param slug - Section slug to find
 * @returns Found section or null
 */
export function getSectionBySlug(
  parsed: ParsedTopicContent,
  slug: string
): ContentSection | null {
  return parsed.allSections.find(section => section.id === slug) || null;
}

/**
 * Get the previous and next sections for navigation
 *
 * @param parsed - Parsed topic content
 * @param currentSlug - Current section slug
 * @returns Object with prev and next sections (or null)
 */
export function getAdjacentSections(
  parsed: ParsedTopicContent,
  currentSlug: string
): { prev: ContentSection | null; next: ContentSection | null } {
  const currentIndex = parsed.allSections.findIndex(s => s.id === currentSlug);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: currentIndex > 0 ? parsed.allSections[currentIndex - 1] : null,
    next: currentIndex < parsed.allSections.length - 1 ? parsed.allSections[currentIndex + 1] : null,
  };
}
