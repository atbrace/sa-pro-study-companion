import { getAllDomains } from './loader';

export interface ContentIndexEntry {
  name: string;
  type: 'service' | 'concept' | 'topic';
  route: string;
  domainName: string;
  topicName: string;
}

export interface ContentIndex {
  services: Map<string, ContentIndexEntry[]>;
  concepts: Map<string, ContentIndexEntry[]>;
  topics: Map<string, ContentIndexEntry>;
}

// Cached indices by exam - built once on first access per exam
const cachedIndices: Map<string, ContentIndex> = new Map();

/**
 * Normalize service name for matching (strips AWS/Amazon prefix, lowercases)
 */
function normalizeServiceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^aws\s+/, '')
    .replace(/^amazon\s+/, '')
    .trim();
}

/**
 * Build the content index from all domains and topics for a specific exam
 */
export function buildContentIndex(examId: string): ContentIndex {
  if (cachedIndices.has(examId)) {
    return cachedIndices.get(examId)!;
  }

  const domains = getAllDomains(examId);
  const index: ContentIndex = {
    services: new Map(),
    concepts: new Map(),
    topics: new Map(),
  };

  for (const domain of domains) {
    for (const topic of domain.topics) {
      const route = `/${examId}/study/${domain.meta.id}/${topic.meta.id}`;
      const baseEntry = {
        route,
        domainName: domain.meta.shortName,
        topicName: topic.meta.name,
      };

      // Index by topic name
      index.topics.set(topic.meta.id, {
        ...baseEntry,
        name: topic.meta.name,
        type: 'topic',
      });

      // Index by services (if defined)
      const keyServices = topic.meta.keyServices || [];
      for (const service of keyServices) {
        const normalized = normalizeServiceName(service);
        if (!index.services.has(normalized)) {
          index.services.set(normalized, []);
        }
        index.services.get(normalized)!.push({
          ...baseEntry,
          name: service,
          type: 'service',
        });
      }

      // Index by concepts (if defined)
      const keyConcepts = topic.meta.keyConcepts || [];
      for (const concept of keyConcepts) {
        const normalized = concept.toLowerCase();
        if (!index.concepts.has(normalized)) {
          index.concepts.set(normalized, []);
        }
        index.concepts.get(normalized)!.push({
          ...baseEntry,
          name: concept,
          type: 'concept',
        });
      }
    }
  }

  cachedIndices.set(examId, index);
  return index;
}

/**
 * Serialize the content index for inclusion in the tutor system prompt
 */
export function serializeIndexForPrompt(examId: string): string {
  const index = buildContentIndex(examId);
  const lines: string[] = [];

  lines.push('## App Navigation Reference');
  lines.push('');
  lines.push('When users ask where to learn about specific AWS services or concepts, use these routes:');
  lines.push('');

  // Group services by domain for readability
  const byDomain = new Map<string, { service: string; route: string }[]>();

  for (const entries of index.services.values()) {
    for (const entry of entries) {
      if (!byDomain.has(entry.domainName)) {
        byDomain.set(entry.domainName, []);
      }
      // Avoid duplicates within the same domain
      const existing = byDomain.get(entry.domainName)!;
      if (!existing.some(e => e.service === entry.name && e.route === entry.route)) {
        existing.push({
          service: entry.name,
          route: entry.route,
        });
      }
    }
  }

  for (const [domain, items] of byDomain) {
    lines.push(`**${domain}:**`);
    for (const item of items) {
      lines.push(`- ${item.service}: ${item.route}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Clear the cached indices (useful for testing or if content changes)
 */
export function clearIndexCache(examId?: string): void {
  if (examId) {
    cachedIndices.delete(examId);
  } else {
    cachedIndices.clear();
  }
}
