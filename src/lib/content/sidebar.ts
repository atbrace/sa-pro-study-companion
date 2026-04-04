import { getAllDomains } from './loader';
import { parseTopicSections } from './parser';
import type {
  SidebarSection,
  SidebarHierarchy,
} from '@/types/sidebar';

/**
 * Module-level cache for sidebar hierarchy, keyed by examId.
 * Replaces React.cache() (request-scoped) with cross-request caching.
 * Content is static at runtime, so no TTL needed.
 */
const sidebarCache = new Map<string, SidebarHierarchy>();

/** Clear sidebar cache. Exported for testing. */
export function clearSidebarCache(): void {
  sidebarCache.clear();
}

/**
 * Load the full content hierarchy for sidebar navigation
 * Returns domains, topics, and sections in a lightweight format
 */
export function getSidebarHierarchy(examId: string): SidebarHierarchy {
  if (sidebarCache.has(examId)) {
    return sidebarCache.get(examId)!;
  }

  const domains = getAllDomains(examId);

  const hierarchy: SidebarHierarchy = {
    domains: domains.map(domain => ({
      id: domain.meta.id,
      name: domain.meta.name,
      shortName: domain.meta.shortName,
      icon: domain.meta.icon,
      color: domain.meta.color,
      topics: domain.topics.map(topic => {
        // Parse sections if content exists
        const sections: SidebarSection[] = [];

        if (topic.content && topic.content.content) {
          const parsed = parseTopicSections(topic.content.content);
          sections.push(
            ...parsed.allSections.map(s => ({
              id: s.id,
              title: s.title,
              order: s.order,
            }))
          );
        }

        // Add questions as final section if questions exist
        if (topic.questions && topic.questions.length > 0) {
          sections.push({
            id: 'questions',
            title: 'Practice Questions',
            order: 999,
          });
        }

        return {
          id: topic.meta.id,
          name: topic.meta.name,
          shortName: topic.meta.shortName,
          difficulty: topic.meta.difficulty,
          sections,
        };
      }),
    })),
  };

  sidebarCache.set(examId, hierarchy);
  return hierarchy;
}
