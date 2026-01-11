import { cache } from 'react';
import { getAllDomains } from './loader';
import { parseTopicSections } from './parser';
import type {
  SidebarSection,
  SidebarHierarchy,
} from '@/types/sidebar';

/**
 * Load the full content hierarchy for sidebar navigation
 * Returns domains, topics, and sections in a lightweight format
 * Uses React.cache() to deduplicate requests within the same render pass
 */
export const getSidebarHierarchy = cache((examId: string): SidebarHierarchy => {
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

  return hierarchy;
});
