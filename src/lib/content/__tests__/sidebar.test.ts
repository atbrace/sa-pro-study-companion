import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDomain, createDomainMeta, createTopic, createTopicMeta, createTopicContent } from '@/lib/test-helpers/factories';
import type { TopicMasteryResult } from '@/lib/progress/mastery';

// Mock content loader
const mockGetAllDomains = vi.fn().mockReturnValue([]);
vi.mock('@/lib/content/loader', () => ({
  getAllDomains: (...args: unknown[]) => mockGetAllDomains(...args),
}));

// Mock content parser
const mockParseTopicSections = vi.fn().mockReturnValue({ allSections: [] });
vi.mock('@/lib/content/parser', () => ({
  parseTopicSections: (...args: unknown[]) => mockParseTopicSections(...args),
}));

// Mock progress modules
const mockGetAllTopicWindowedMasteries = vi.fn().mockReturnValue(new Map());
vi.mock('@/lib/progress/mastery', () => ({
  getAllTopicWindowedMasteries: (...args: unknown[]) => mockGetAllTopicWindowedMasteries(...args),
}));

const mockGetWeakAreasByDomain = vi.fn().mockReturnValue(new Map());
const mockCalculateOverallMastery = vi.fn().mockReturnValue(0);
vi.mock('@/lib/progress/calculator', () => ({
  getWeakAreasByDomain: (...args: unknown[]) => mockGetWeakAreasByDomain(...args),
  calculateOverallMastery: (...args: unknown[]) => mockCalculateOverallMastery(...args),
}));

import {
  getSidebarHierarchy,
  getSidebarHierarchyWithProgress,
  clearSidebarCache,
} from '../sidebar';

beforeEach(() => {
  vi.clearAllMocks();
  clearSidebarCache();
  mockGetAllDomains.mockReturnValue([]);
  mockGetAllTopicWindowedMasteries.mockReturnValue(new Map());
  mockGetWeakAreasByDomain.mockReturnValue(new Map());
  mockCalculateOverallMastery.mockReturnValue(0);
  mockParseTopicSections.mockReturnValue({ allSections: [] });
});

// --- Helper to build a standard two-domain setup ---
function setupTwoDomains() {
  const topic1 = createTopic({ meta: createTopicMeta({ id: 'topic-1', shortName: 'VPC' }) });
  const topic2 = createTopic({ meta: createTopicMeta({ id: 'topic-2', shortName: 'IAM' }) });
  const topic3 = createTopic({ meta: createTopicMeta({ id: 'topic-3', shortName: 'S3' }) });

  const domain1 = createDomain({
    meta: createDomainMeta({ id: 'domain-1', shortName: 'D1', weight: 60 }),
    topics: [topic1, topic2],
  });
  const domain2 = createDomain({
    meta: createDomainMeta({ id: 'domain-2', shortName: 'D2', weight: 40 }),
    topics: [topic3],
  });

  mockGetAllDomains.mockReturnValue([domain1, domain2]);
  return { domain1, domain2, topic1, topic2, topic3 };
}

describe('getSidebarHierarchy', () => {
  it('returns empty domains for unknown exam', () => {
    const result = getSidebarHierarchy('unknown-exam');
    expect(result.domains).toEqual([]);
  });

  it('maps domain metadata correctly', () => {
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1', name: 'Full Name', shortName: 'D1', icon: '🏗️', color: 'blue' }),
      topics: [],
    });
    mockGetAllDomains.mockReturnValue([domain]);

    const result = getSidebarHierarchy('sap-c02');
    expect(result.domains).toHaveLength(1);
    expect(result.domains[0]).toMatchObject({
      id: 'domain-1',
      name: 'Full Name',
      shortName: 'D1',
      icon: '🏗️',
      color: 'blue',
    });
  });

  it('maps topic metadata and includes sections from parsed content', () => {
    mockParseTopicSections.mockReturnValue({
      allSections: [
        { id: 'overview', title: 'Overview', order: 1 },
        { id: 'best-practices', title: 'Best Practices', order: 2 },
      ],
    });

    const topic = createTopic({
      meta: createTopicMeta({ id: 'topic-1', name: 'VPC Networking', shortName: 'VPC', difficulty: 'intermediate' }),
      content: createTopicContent({ content: '# Overview\n\n## Best Practices' }),
      questions: [{ id: 'q1' }] as any,
    });
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1' }),
      topics: [topic],
    });
    mockGetAllDomains.mockReturnValue([domain]);

    const result = getSidebarHierarchy('sap-c02');
    const sidebarTopic = result.domains[0].topics[0];

    expect(sidebarTopic.id).toBe('topic-1');
    expect(sidebarTopic.name).toBe('VPC Networking');
    expect(sidebarTopic.difficulty).toBe('intermediate');
    // 2 content sections + 1 questions section
    expect(sidebarTopic.sections).toHaveLength(3);
    expect(sidebarTopic.sections[2]).toEqual({
      id: 'questions',
      title: 'Practice Questions',
      order: 999,
    });
  });

  it('omits questions section when topic has no questions', () => {
    const topic = createTopic({ questions: [] });
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1' }),
      topics: [topic],
    });
    mockGetAllDomains.mockReturnValue([domain]);

    const result = getSidebarHierarchy('sap-c02');
    const sectionIds = result.domains[0].topics[0].sections.map(s => s.id);
    expect(sectionIds).not.toContain('questions');
  });

  it('caches hierarchy across calls for same examId', () => {
    mockGetAllDomains.mockReturnValue([]);
    getSidebarHierarchy('sap-c02');
    getSidebarHierarchy('sap-c02');

    expect(mockGetAllDomains).toHaveBeenCalledTimes(1);
  });

  it('does not share cache between different examIds', () => {
    mockGetAllDomains.mockReturnValue([]);
    getSidebarHierarchy('sap-c02');
    getSidebarHierarchy('mla-c01');

    expect(mockGetAllDomains).toHaveBeenCalledTimes(2);
  });
});

describe('getSidebarHierarchyWithProgress', () => {
  it('enriches topics with mastery scores from windowed calculation', () => {
    setupTwoDomains();
    mockGetAllTopicWindowedMasteries.mockReturnValue(new Map<string, TopicMasteryResult>([
      ['domain-1/topic-1', { mastery: 90, attempts: 20, correct: 18 }],
      ['domain-1/topic-2', { mastery: 60, attempts: 10, correct: 6 }],
    ]));
    mockCalculateOverallMastery.mockReturnValue(72);

    const result = getSidebarHierarchyWithProgress('sap-c02');
    const d1Topics = result.domains[0].topics;

    expect(d1Topics[0].progress?.masteryScore).toBe(90);
    expect(d1Topics[1].progress?.masteryScore).toBe(60);
  });

  it('sets masteryScore to 0 for topics without progress data', () => {
    setupTwoDomains();
    // Only topic-1 has mastery data
    mockGetAllTopicWindowedMasteries.mockReturnValue(new Map<string, TopicMasteryResult>([
      ['domain-1/topic-1', { mastery: 80, attempts: 10, correct: 8 }],
    ]));

    const result = getSidebarHierarchyWithProgress('sap-c02');
    const d1Topics = result.domains[0].topics;

    expect(d1Topics[0].progress?.masteryScore).toBe(80);
    expect(d1Topics[1].progress?.masteryScore).toBe(0);
  });

  it('counts topics with mastery >= 85 as completed', () => {
    setupTwoDomains();
    mockGetAllTopicWindowedMasteries.mockReturnValue(new Map<string, TopicMasteryResult>([
      ['domain-1/topic-1', { mastery: 85, attempts: 20, correct: 17 }],
      ['domain-1/topic-2', { mastery: 84, attempts: 20, correct: 17 }],
    ]));

    const result = getSidebarHierarchyWithProgress('sap-c02');
    const d1Progress = result.domains[0].progress;

    expect(d1Progress?.topicsCompleted).toBe(1);
    expect(d1Progress?.totalTopics).toBe(2);
  });

  it('uses coverage-aware domain mastery (divides by total topics, not just studied)', () => {
    setupTwoDomains();
    // Only 1 of 2 topics studied in domain-1
    mockGetAllTopicWindowedMasteries.mockReturnValue(new Map<string, TopicMasteryResult>([
      ['domain-1/topic-1', { mastery: 80, attempts: 10, correct: 8 }],
    ]));

    const result = getSidebarHierarchyWithProgress('sap-c02');
    // Coverage-aware: 80 / 2 topics = 40 (not 80 / 1 studied topic)
    expect(result.domains[0].progress?.masteryScore).toBe(40);
  });

  it('flags weak areas on the correct topics', () => {
    setupTwoDomains();
    mockGetWeakAreasByDomain.mockReturnValue(new Map([
      ['domain-1', new Set(['topic-2'])],
    ]));

    const result = getSidebarHierarchyWithProgress('sap-c02');
    const d1Topics = result.domains[0].topics;

    expect(d1Topics[0].progress?.isWeakArea).toBe(false);
    expect(d1Topics[1].progress?.isWeakArea).toBe(true);
  });

  it('includes weakTopicIds in domain progress', () => {
    setupTwoDomains();
    mockGetWeakAreasByDomain.mockReturnValue(new Map([
      ['domain-1', new Set(['topic-1', 'topic-2'])],
    ]));

    const result = getSidebarHierarchyWithProgress('sap-c02');
    const weakIds = result.domains[0].progress?.weakTopicIds;

    expect(weakIds).toContain('topic-1');
    expect(weakIds).toContain('topic-2');
    expect(weakIds).toHaveLength(2);
  });

  it('sets overallMastery from calculateOverallMastery', () => {
    setupTwoDomains();
    mockCalculateOverallMastery.mockReturnValue(72.5);

    const result = getSidebarHierarchyWithProgress('sap-c02');
    expect(result.overallMastery).toBe(72.5);
  });

  it('handles domain with zero topics without divide-by-zero', () => {
    const emptyDomain = createDomain({
      meta: createDomainMeta({ id: 'domain-empty' }),
      topics: [],
    });
    mockGetAllDomains.mockReturnValue([emptyDomain]);

    const result = getSidebarHierarchyWithProgress('sap-c02');
    expect(result.domains[0].progress?.masteryScore).toBe(0);
    expect(result.domains[0].progress?.topicsCompleted).toBe(0);
    expect(result.domains[0].progress?.totalTopics).toBe(0);
  });

  it('returns unenriched hierarchy on progress query error', () => {
    setupTwoDomains();
    mockGetAllTopicWindowedMasteries.mockImplementation(() => {
      throw new Error('DB connection failed');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = getSidebarHierarchyWithProgress('sap-c02');

    // Should return base hierarchy without progress
    expect(result.domains).toHaveLength(2);
    expect(result.domains[0].progress).toBeUndefined();
    expect(result.overallMastery).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to enrich sidebar'),
      'DB connection failed'
    );

    consoleSpy.mockRestore();
  });

  it('returns unenriched hierarchy when getWeakAreasByDomain throws', () => {
    setupTwoDomains();
    mockGetAllTopicWindowedMasteries.mockReturnValue(new Map());
    mockGetWeakAreasByDomain.mockImplementation(() => {
      throw new Error('weak areas query failed');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = getSidebarHierarchyWithProgress('sap-c02');
    expect(result.domains[0].progress).toBeUndefined();

    consoleSpy.mockRestore();
  });
});
