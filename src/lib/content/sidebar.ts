import { MASTERY_THRESHOLD } from '@/lib/constants';
import { getAllDomains } from './loader';
import { parseTopicSections } from './parser';
import { getAllTopicWindowedMasteries } from '@/lib/progress/mastery';
import {
  getWeakAreasByDomain,
  calculateOverallMastery,
} from '@/lib/progress/calculator';
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

/**
 * Load sidebar hierarchy enriched with progress data from the database.
 * Combines content structure with mastery scores and weak area flags.
 * Uses batch queries to avoid N+1 - only 3 DB queries total regardless of domain/topic count.
 * Not cached — progress data is dynamic and should be re-queried each request.
 */
export function getSidebarHierarchyWithProgress(examId: string): SidebarHierarchy {
  const hierarchy = getSidebarHierarchy(examId);

  try {
    // Batch-fetch all progress data (3 queries total)
    const topicMasteries = getAllTopicWindowedMasteries(examId);
    const weakAreasByDomain = getWeakAreasByDomain(examId);
    const overallMastery = calculateOverallMastery(examId);

    // Enrich domains and topics with progress data
    const enrichedDomains = hierarchy.domains.map(domain => {
      const domainWeakTopics = weakAreasByDomain.get(domain.id) || new Set<string>();

      let topicMasterySum = 0;
      let topicsWithProgress = 0;
      let topicsCompleted = 0;

      const enrichedTopics = domain.topics.map(topic => {
        const key = `${domain.id}/${topic.id}`;
        const topicResult = topicMasteries.get(key);
        const masteryScore = topicResult?.mastery ?? 0;
        const isWeakArea = domainWeakTopics.has(topic.id);

        if (topicResult && topicResult.attempts > 0) {
          topicMasterySum += masteryScore;
          topicsWithProgress++;
          if (masteryScore >= MASTERY_THRESHOLD) topicsCompleted++;
        }

        return {
          ...topic,
          progress: { masteryScore, isWeakArea },
        };
      });

      // Coverage-aware: divide by total topics (not just studied ones)
      // so unstudied topics count as 0%, consistent with ReadinessCard
      const domainMastery = domain.topics.length > 0
        ? topicMasterySum / domain.topics.length
        : 0;

      return {
        ...domain,
        topics: enrichedTopics,
        progress: {
          masteryScore: domainMastery,
          topicsCompleted,
          totalTopics: domain.topics.length,
          weakTopicIds: [...domainWeakTopics],
        },
      };
    });

    return {
      domains: enrichedDomains,
      overallMastery,
    };
  } catch (error) {
    console.error(
      `[sidebar] Failed to enrich sidebar with progress for exam=${examId}, showing sidebar without progress:`,
      error instanceof Error ? error.message : error
    );
    return hierarchy;
  }
}
