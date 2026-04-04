import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDomain, createDomainMeta, createTopic, createTopicMeta } from '@/lib/test-helpers/factories';

// Mock react cache as passthrough
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...(actual as object),
    cache: (fn: Function) => fn,
  };
});

// Use vi.hoisted for mock objects referenced in vi.mock factories
const { mockStatement } = vi.hoisted(() => {
  const mockStatement = {
    run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
    get: vi.fn().mockReturnValue(null),
    all: vi.fn().mockReturnValue([]),
  };
  return { mockStatement };
});

vi.mock('@/lib/db/client', () => ({
  db: {
    prepare: vi.fn().mockReturnValue(mockStatement),
  },
}));

// Mock content loader - these don't need hoisting since they use wrapper functions
const mockGetAllDomains = vi.fn().mockReturnValue([]);
const mockGetTopicById = vi.fn().mockReturnValue(null);

vi.mock('@/lib/content/loader', () => ({
  getAllDomains: (...args: unknown[]) => mockGetAllDomains(...args),
  getTopicById: (...args: unknown[]) => mockGetTopicById(...args),
}));

import {
  calculateDomainMastery,
  calculateOverallMastery,
  getAllTopicMasteryScores,
  getWeakAreasByDomain,
  getDomainProgress,
  getOverallProgress,
  getRecentActivity,
  getReadinessEstimate,
  getProgressSummary,
} from '../calculator';

beforeEach(() => {
  vi.clearAllMocks();
  mockStatement.get.mockReturnValue(null);
  mockStatement.all.mockReturnValue([]);
  mockGetAllDomains.mockReturnValue([]);
  mockGetTopicById.mockReturnValue(null);
});

describe('calculateDomainMastery', () => {
  it('returns mastery percentage (avg_mastery * 100)', () => {
    mockStatement.get.mockReturnValue({ avg_mastery: 0.85 });

    const result = calculateDomainMastery('sap-c02', 'domain-1');
    expect(result).toBe(85);
  });

  it('returns 0 when avg_mastery is null', () => {
    mockStatement.get.mockReturnValue({ avg_mastery: null });

    const result = calculateDomainMastery('sap-c02', 'domain-1');
    expect(result).toBe(0);
  });

  it('passes examId and domainId to query', () => {
    mockStatement.get.mockReturnValue({ avg_mastery: 0.5 });

    calculateDomainMastery('sap-c02', 'domain-1');

    expect(mockStatement.get).toHaveBeenCalledWith('sap-c02', 'domain-1');
  });
});

describe('calculateOverallMastery', () => {
  it('calculates weighted average across domains', () => {
    const domain1 = createDomain({
      meta: createDomainMeta({ id: 'domain-1', weight: 60 }),
    });
    const domain2 = createDomain({
      meta: createDomainMeta({ id: 'domain-2', weight: 40 }),
    });
    mockGetAllDomains.mockReturnValue([domain1, domain2]);

    // getAllDomainMasteryScores query
    mockStatement.all.mockReturnValueOnce([
      { domain_id: 'domain-1', avg_mastery: 0.8 },
      { domain_id: 'domain-2', avg_mastery: 0.6 },
    ]);

    const result = calculateOverallMastery('sap-c02');
    // weighted: (80 * 0.6 + 60 * 0.4) / (0.6 + 0.4) = (48 + 24) / 1.0 = 72
    expect(result).toBe(72);
  });

  it('returns 0 when no domains have progress', () => {
    mockGetAllDomains.mockReturnValue([
      createDomain({ meta: createDomainMeta({ id: 'domain-1', weight: 50 }) }),
    ]);
    mockStatement.all.mockReturnValueOnce([]);

    const result = calculateOverallMastery('sap-c02');
    expect(result).toBe(0);
  });

  it('handles single domain', () => {
    mockGetAllDomains.mockReturnValue([
      createDomain({ meta: createDomainMeta({ id: 'domain-1', weight: 100 }) }),
    ]);
    mockStatement.all.mockReturnValueOnce([
      { domain_id: 'domain-1', avg_mastery: 0.9 },
    ]);

    const result = calculateOverallMastery('sap-c02');
    expect(result).toBe(90);
  });
});

describe('getAllTopicMasteryScores', () => {
  it('returns Map keyed by "domainId/topicId" with mastery percentages', () => {
    mockStatement.all.mockReturnValueOnce([
      { domain_id: 'domain-1', topic_id: 'topic-a', mastery_level: 0.85 },
      { domain_id: 'domain-1', topic_id: 'topic-b', mastery_level: 0.6 },
      { domain_id: 'domain-2', topic_id: 'topic-c', mastery_level: 0.4 },
    ]);

    const result = getAllTopicMasteryScores('sap-c02');
    expect(result.size).toBe(3);
    expect(result.get('domain-1/topic-a')).toBe(85);
    expect(result.get('domain-1/topic-b')).toBe(60);
    expect(result.get('domain-2/topic-c')).toBe(40);
  });

  it('returns empty Map when no progress exists', () => {
    mockStatement.all.mockReturnValueOnce([]);

    const result = getAllTopicMasteryScores('sap-c02');
    expect(result.size).toBe(0);
  });

  it('treats null mastery_level as 0', () => {
    mockStatement.all.mockReturnValueOnce([
      { domain_id: 'domain-1', topic_id: 'topic-a', mastery_level: null },
    ]);

    const result = getAllTopicMasteryScores('sap-c02');
    expect(result.get('domain-1/topic-a')).toBe(0);
  });
});

describe('getWeakAreasByDomain', () => {
  it('returns Map of domainId -> Set of weak topicIds', () => {
    mockStatement.all.mockReturnValueOnce([
      { domain_id: 'domain-1', topic_id: 'topic-a' },
      { domain_id: 'domain-1', topic_id: 'topic-b' },
      { domain_id: 'domain-2', topic_id: 'topic-c' },
    ]);

    const result = getWeakAreasByDomain('sap-c02');
    expect(result.size).toBe(2);
    expect(result.get('domain-1')?.has('topic-a')).toBe(true);
    expect(result.get('domain-1')?.has('topic-b')).toBe(true);
    expect(result.get('domain-2')?.has('topic-c')).toBe(true);
  });

  it('returns empty Map when no weak areas exist', () => {
    mockStatement.all.mockReturnValueOnce([]);

    const result = getWeakAreasByDomain('sap-c02');
    expect(result.size).toBe(0);
  });

  it('deduplicates topic IDs within a domain', () => {
    mockStatement.all.mockReturnValueOnce([
      { domain_id: 'domain-1', topic_id: 'topic-a' },
      { domain_id: 'domain-1', topic_id: 'topic-a' },
    ]);

    const result = getWeakAreasByDomain('sap-c02');
    expect(result.get('domain-1')?.size).toBe(1);
  });
});

describe('getDomainProgress', () => {
  it('returns complete DomainProgress with all fields', () => {
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1', shortName: 'Complexity', weight: 26 }),
      topics: [createTopic(), createTopic({ meta: createTopicMeta({ id: 'topic-2' }) })],
    });
    mockGetAllDomains.mockReturnValue([domain]);

    // topicStats query
    mockStatement.get
      .mockReturnValueOnce({ topics_with_progress: 2, completed_topics: 1 })
      // questionStats query
      .mockReturnValueOnce({ attempted: 20, correct: 15 })
      // calculateDomainMastery query
      .mockReturnValueOnce({ avg_mastery: 0.75 });

    // weakAreas query
    mockStatement.all.mockReturnValueOnce([
      { topic_id: 'topic-1' },
    ]);

    // getTopicById for weak area validation
    mockGetTopicById.mockReturnValue(createTopic());

    const result = getDomainProgress('sap-c02', 'domain-1');
    expect(result).not.toBeNull();
    expect(result!.domainId).toBe('domain-1');
    expect(result!.domainName).toBe('Complexity');
    expect(result!.weight).toBe(26);
    expect(result!.topicsCompleted).toBe(1);
    expect(result!.totalTopics).toBe(2);
    expect(result!.questionsAttempted).toBe(20);
    expect(result!.questionsCorrect).toBe(15);
    expect(result!.weakAreas).toHaveLength(1);
  });

  it('returns null for unknown domain ID', () => {
    mockGetAllDomains.mockReturnValue([]);

    const result = getDomainProgress('sap-c02', 'nonexistent');
    expect(result).toBeNull();
  });

  it('filters weak areas to only topics that exist in content', () => {
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1' }),
    });
    mockGetAllDomains.mockReturnValue([domain]);

    mockStatement.get
      .mockReturnValueOnce({ topics_with_progress: 1, completed_topics: 0 })
      .mockReturnValueOnce({ attempted: 5, correct: 2 })
      .mockReturnValueOnce({ avg_mastery: 0.4 });

    mockStatement.all.mockReturnValueOnce([
      { topic_id: 'existing-topic' },
      { topic_id: 'deleted-topic' },
    ]);

    // First call: topic exists. Second call: topic doesn't exist.
    mockGetTopicById
      .mockReturnValueOnce(createTopic())
      .mockReturnValueOnce(null);

    const result = getDomainProgress('sap-c02', 'domain-1');
    expect(result!.weakAreas).toHaveLength(1);
    expect(result!.weakAreas[0].topicId).toBe('existing-topic');
  });

  it('handles zero question attempts', () => {
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1' }),
    });
    mockGetAllDomains.mockReturnValue([domain]);

    mockStatement.get
      .mockReturnValueOnce({ topics_with_progress: 0, completed_topics: 0 })
      .mockReturnValueOnce({ attempted: 0, correct: null })
      .mockReturnValueOnce({ avg_mastery: null });

    mockStatement.all.mockReturnValueOnce([]);

    const result = getDomainProgress('sap-c02', 'domain-1');
    expect(result!.questionsAttempted).toBe(0);
    expect(result!.questionsCorrect).toBe(0);
  });
});

describe('getOverallProgress', () => {
  it('returns aggregate question statistics', () => {
    mockGetAllDomains.mockReturnValue([]);

    // questionStats query
    mockStatement.get
      .mockReturnValueOnce({ attempted: 50, correct: 35 })
      // studyTime query
      .mockReturnValueOnce({ total_seconds: 3600 });

    // calculateOverallMastery -> getAllDomainMasteryScores
    mockStatement.all.mockReturnValueOnce([]);

    const result = getOverallProgress('sap-c02');
    expect(result.questionsAttempted).toBe(50);
    expect(result.questionsCorrect).toBe(35);
  });

  it('calculates studyTimeMinutes from total_seconds / 60', () => {
    mockGetAllDomains.mockReturnValue([]);

    mockStatement.get
      .mockReturnValueOnce({ attempted: 0, correct: 0 })
      .mockReturnValueOnce({ total_seconds: 5400 });

    mockStatement.all.mockReturnValueOnce([]);

    const result = getOverallProgress('sap-c02');
    expect(result.studyTimeMinutes).toBe(90);
  });

  it('returns 0 for experimentsCompleted', () => {
    mockGetAllDomains.mockReturnValue([]);

    mockStatement.get
      .mockReturnValueOnce({ attempted: 0, correct: 0 })
      .mockReturnValueOnce({ total_seconds: 0 });

    mockStatement.all.mockReturnValueOnce([]);

    const result = getOverallProgress('sap-c02');
    expect(result.experimentsCompleted).toBe(0);
  });

  it('handles zero study time', () => {
    mockGetAllDomains.mockReturnValue([]);

    mockStatement.get
      .mockReturnValueOnce({ attempted: 0, correct: 0 })
      .mockReturnValueOnce({ total_seconds: 0 });

    mockStatement.all.mockReturnValueOnce([]);

    const result = getOverallProgress('sap-c02');
    expect(result.studyTimeMinutes).toBe(0);
  });
});

describe('getRecentActivity', () => {
  it('merges assessments and study sessions sorted by timestamp', () => {
    mockStatement.all
      .mockReturnValueOnce([
        { domain_id: 'domain-1', session_type: 'initial', score_percentage: 80, completed_at: '2025-01-02T10:00:00Z' },
      ])
      .mockReturnValueOnce([
        { domain_id: 'domain-1', topic_id: 'topic-1', activity_type: 'study', ended_at: '2025-01-03T10:00:00Z' },
      ]);

    const result = getRecentActivity('sap-c02', 10);
    expect(result).toHaveLength(2);
    // Sorted by timestamp desc
    expect(result[0].type).toBe('study');
    expect(result[1].type).toBe('assessment');
  });

  it('limits results to specified count', () => {
    mockStatement.all
      .mockReturnValueOnce([
        { domain_id: 'd1', session_type: 'initial', score_percentage: 80, completed_at: '2025-01-01T10:00:00Z' },
        { domain_id: 'd2', session_type: 'initial', score_percentage: 70, completed_at: '2025-01-02T10:00:00Z' },
      ])
      .mockReturnValueOnce([]);

    const result = getRecentActivity('sap-c02', 1);
    expect(result).toHaveLength(1);
  });

  it('formats assessment with domain_id', () => {
    mockStatement.all
      .mockReturnValueOnce([
        { domain_id: 'domain-1', session_type: 'initial', score_percentage: 85.5, completed_at: '2025-01-01T10:00:00Z' },
      ])
      .mockReturnValueOnce([]);

    const result = getRecentActivity('sap-c02', 10);
    expect(result[0].description).toContain('domain-1');
    expect(result[0].description).toContain('86%');
  });

  it('formats assessment without domain_id as full practice exam', () => {
    mockStatement.all
      .mockReturnValueOnce([
        { domain_id: null, session_type: 'initial', score_percentage: 75, completed_at: '2025-01-01T10:00:00Z' },
      ])
      .mockReturnValueOnce([]);

    const result = getRecentActivity('sap-c02', 10);
    expect(result[0].description).toContain('full practice exam');
  });

  it('formats study session with topic_id', () => {
    mockStatement.all
      .mockReturnValueOnce([])
      .mockReturnValueOnce([
        { domain_id: 'domain-1', topic_id: 'vpc-topic', activity_type: 'study', ended_at: '2025-01-01T10:00:00Z' },
      ]);

    const result = getRecentActivity('sap-c02', 10);
    expect(result[0].description).toContain('vpc-topic');
  });

  it('formats study session with only domain_id', () => {
    mockStatement.all
      .mockReturnValueOnce([])
      .mockReturnValueOnce([
        { domain_id: 'domain-1', topic_id: null, activity_type: 'study', ended_at: '2025-01-01T10:00:00Z' },
      ]);

    const result = getRecentActivity('sap-c02', 10);
    expect(result[0].description).toContain('domain-1');
  });
});

describe('getReadinessEstimate', () => {
  function setupOverallProgress(mastery: number, attempted: number) {
    // getOverallProgress calls:
    // 1. questionStats query
    mockStatement.get
      .mockReturnValueOnce({ attempted, correct: Math.round(attempted * 0.8) })
      // 2. studyTime query
      .mockReturnValueOnce({ total_seconds: 3600 });
    // calculateOverallMastery calls getAllDomainMasteryScores
    mockStatement.all.mockReturnValueOnce(
      mastery > 0
        ? [{ domain_id: 'domain-1', avg_mastery: mastery / 100 }]
        : []
    );
  }

  it('returns low confidence when too few questions attempted', () => {
    const domains = [
      createDomain({ meta: createDomainMeta({ id: 'domain-1' }) }),
      createDomain({ meta: createDomainMeta({ id: 'domain-2' }) }),
    ];
    mockGetAllDomains.mockReturnValue(domains);

    setupOverallProgress(0, 5); // need 20 (2 domains * 10)

    const result = getReadinessEstimate('sap-c02');
    expect(result.confidence).toBe('low');
    expect(result.score).toBe(0);
    expect(result.recommendation).toContain('5/20');
  });

  it('returns high confidence for mastery >= 85', () => {
    const domains = [
      createDomain({ meta: createDomainMeta({ id: 'domain-1', weight: 100 }) }),
    ];
    mockGetAllDomains.mockReturnValue(domains);

    setupOverallProgress(90, 50);

    const result = getReadinessEstimate('sap-c02');
    expect(result.confidence).toBe('high');
    expect(result.score).toBe(900);
  });

  it('returns medium confidence for mastery 75-84', () => {
    const domains = [
      createDomain({ meta: createDomainMeta({ id: 'domain-1', weight: 100 }) }),
    ];
    mockGetAllDomains.mockReturnValue(domains);

    setupOverallProgress(80, 50);

    const result = getReadinessEstimate('sap-c02');
    expect(result.confidence).toBe('medium');
  });

  it('returns medium confidence for mastery 60-74', () => {
    const domains = [
      createDomain({ meta: createDomainMeta({ id: 'domain-1', weight: 100 }) }),
    ];
    mockGetAllDomains.mockReturnValue(domains);

    setupOverallProgress(65, 50);

    const result = getReadinessEstimate('sap-c02');
    expect(result.confidence).toBe('medium');
  });

  it('returns low confidence for mastery < 60', () => {
    const domains = [
      createDomain({ meta: createDomainMeta({ id: 'domain-1', weight: 100 }) }),
    ];
    mockGetAllDomains.mockReturnValue(domains);

    setupOverallProgress(50, 50);

    const result = getReadinessEstimate('sap-c02');
    expect(result.confidence).toBe('low');
  });

  it('calculates estimatedScore as mastery * 10', () => {
    const domains = [
      createDomain({ meta: createDomainMeta({ id: 'domain-1', weight: 100 }) }),
    ];
    mockGetAllDomains.mockReturnValue(domains);

    setupOverallProgress(75, 50);

    const result = getReadinessEstimate('sap-c02');
    expect(result.score).toBe(750);
  });
});

describe('getProgressSummary', () => {
  it('composes overall, domains, recentActivity, readinessEstimate', () => {
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1', weight: 100 }),
    });
    mockGetAllDomains.mockReturnValue([domain]);

    // getOverallProgress: questionStats, studyTime
    mockStatement.get
      .mockReturnValueOnce({ attempted: 10, correct: 8 })
      .mockReturnValueOnce({ total_seconds: 600 });
    // calculateOverallMastery -> getAllDomainMasteryScores
    mockStatement.all.mockReturnValueOnce([
      { domain_id: 'domain-1', avg_mastery: 0.8 },
    ]);

    // getAllDomainProgressBatch:
    // getAllDomainMasteryScores for batch
    mockStatement.all
      .mockReturnValueOnce([{ domain_id: 'domain-1', avg_mastery: 0.8 }])
      // topicStats batch
      .mockReturnValueOnce([{ domain_id: 'domain-1', topics_with_progress: 1, completed_topics: 0 }])
      // questionStats batch
      .mockReturnValueOnce([{ domain_id: 'domain-1', attempted: 10, correct: 8 }])
      // weakAreas batch
      .mockReturnValueOnce([]);

    // getRecentActivity: assessments, sessions
    mockStatement.all
      .mockReturnValueOnce([])
      .mockReturnValueOnce([]);

    // getReadinessEstimate -> getOverallProgress (again):
    mockStatement.get
      .mockReturnValueOnce({ attempted: 10, correct: 8 })
      .mockReturnValueOnce({ total_seconds: 600 });
    mockStatement.all.mockReturnValueOnce([
      { domain_id: 'domain-1', avg_mastery: 0.8 },
    ]);

    const result = getProgressSummary('sap-c02');
    expect(result).toHaveProperty('overall');
    expect(result).toHaveProperty('domains');
    expect(result).toHaveProperty('recentActivity');
    expect(result).toHaveProperty('readinessEstimate');
    expect(result.domains).toHaveLength(1);
    expect(result.overall.questionsAttempted).toBe(10);
  });
});
