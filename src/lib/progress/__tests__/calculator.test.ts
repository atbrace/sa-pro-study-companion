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

// Mock mastery module
vi.mock('../mastery', () => ({
  getAllTopicWindowedMasteries: vi.fn().mockReturnValue(new Map()),
}));

import { getAllTopicWindowedMasteries } from '../mastery';

import {
  calculateOverallMastery,
  getWeakAreasByDomain,
  getDomainProgress,
  getOverallProgress,
  getRecentActivity,
  getReadinessEstimate,
  getProgressSummary,
  calculateCoverageAwareDomainMastery,
} from '../calculator';

beforeEach(() => {
  vi.clearAllMocks();
  mockStatement.get.mockReturnValue(null);
  mockStatement.all.mockReturnValue([]);
  mockGetAllDomains.mockReturnValue([]);
  mockGetTopicById.mockReturnValue(null);
});

describe('calculateOverallMastery', () => {
  it('calculates weighted average across domains using windowed mastery', () => {
    const domain1 = createDomain({
      meta: createDomainMeta({ id: 'domain-1', weight: 60 }),
      topics: [createTopic({ meta: createTopicMeta({ id: 'topic-1' }) })],
    });
    const domain2 = createDomain({
      meta: createDomainMeta({ id: 'domain-2', weight: 40 }),
      topics: [createTopic({ meta: createTopicMeta({ id: 'topic-2' }) })],
    });
    mockGetAllDomains.mockReturnValue([domain1, domain2]);

    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map([
      ['domain-1/topic-1', { mastery: 80, attempts: 10, correct: 8 }],
      ['domain-2/topic-2', { mastery: 60, attempts: 10, correct: 6 }],
    ]));

    const result = calculateOverallMastery('sap-c02');
    // weighted: (80 * 0.6 + 60 * 0.4) / (0.6 + 0.4) = (48 + 24) / 1.0 = 72
    expect(result).toBe(72);
  });

  it('returns 0 when no domains have progress', () => {
    mockGetAllDomains.mockReturnValue([
      createDomain({
        meta: createDomainMeta({ id: 'domain-1', weight: 50 }),
        topics: [createTopic({ meta: createTopicMeta({ id: 'topic-1' }) })],
      }),
    ]);
    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map());

    const result = calculateOverallMastery('sap-c02');
    expect(result).toBe(0);
  });

  it('handles single domain', () => {
    mockGetAllDomains.mockReturnValue([
      createDomain({
        meta: createDomainMeta({ id: 'domain-1', weight: 100 }),
        topics: [createTopic({ meta: createTopicMeta({ id: 'topic-1' }) })],
      }),
    ]);
    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map([
      ['domain-1/topic-1', { mastery: 90, attempts: 10, correct: 9 }],
    ]));

    const result = calculateOverallMastery('sap-c02');
    expect(result).toBe(90);
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
      .mockReturnValueOnce({ attempted: 20, correct: 15 });

    // weakAreas query
    mockStatement.all.mockReturnValueOnce([
      { topic_id: 'topic-1' },
    ]);

    // getTopicById for weak area validation
    mockGetTopicById.mockReturnValue(createTopic());

    // getAllTopicWindowedMasteries returns empty map (masteryScore will be 0)
    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map());

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
      .mockReturnValueOnce({ attempted: 5, correct: 2 });

    mockStatement.all.mockReturnValueOnce([
      { topic_id: 'existing-topic' },
      { topic_id: 'deleted-topic' },
    ]);

    // First call: topic exists. Second call: topic doesn't exist.
    mockGetTopicById
      .mockReturnValueOnce(createTopic())
      .mockReturnValueOnce(null);

    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map());

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
      .mockReturnValueOnce({ attempted: 0, correct: null });

    mockStatement.all.mockReturnValueOnce([]);

    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map());

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

    const result = getOverallProgress('sap-c02');
    expect(result.questionsAttempted).toBe(50);
    expect(result.questionsCorrect).toBe(35);
  });

  it('calculates studyTimeMinutes from total_seconds / 60', () => {
    mockGetAllDomains.mockReturnValue([]);

    mockStatement.get
      .mockReturnValueOnce({ attempted: 0, correct: 0 })
      .mockReturnValueOnce({ total_seconds: 5400 });

    const result = getOverallProgress('sap-c02');
    expect(result.studyTimeMinutes).toBe(90);
  });

  it('returns 0 for experimentsCompleted', () => {
    mockGetAllDomains.mockReturnValue([]);

    mockStatement.get
      .mockReturnValueOnce({ attempted: 0, correct: 0 })
      .mockReturnValueOnce({ total_seconds: 0 });

    const result = getOverallProgress('sap-c02');
    expect(result.experimentsCompleted).toBe(0);
  });

  it('handles zero study time', () => {
    mockGetAllDomains.mockReturnValue([]);

    mockStatement.get
      .mockReturnValueOnce({ attempted: 0, correct: 0 })
      .mockReturnValueOnce({ total_seconds: 0 });

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
  function setupTotalAttempts(count: number) {
    mockStatement.get.mockReturnValueOnce({ total_attempts: count });
  }

  it('returns building level with empty state when fewer than 5 attempts', () => {
    setupTotalAttempts(3);

    const result = getReadinessEstimate('sap-c02');
    expect(result.level).toBe('building');
    expect(result.score).toBe(0);
    expect(result.totalAttempts).toBe(3);
    expect(result.domainBreakdown).toEqual([]);
    expect(result.focusAreas).toEqual([]);
  });

  it('returns building level with score 0 when exactly 0 attempts', () => {
    setupTotalAttempts(0);

    const result = getReadinessEstimate('sap-c02');
    expect(result.level).toBe('building');
    expect(result.score).toBe(0);
    expect(result.totalAttempts).toBe(0);
  });

  it('returns ready level when overall mastery >= 85', () => {
    setupTotalAttempts(50);

    const topic1 = createTopic({ meta: createTopicMeta({ id: 'topic-1', shortName: 'T1' }) });
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1', shortName: 'D1', weight: 100 }),
      topics: [topic1],
    });
    mockGetAllDomains.mockReturnValue([domain]);

    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map([
      ['domain-1/topic-1', { mastery: 90, attempts: 20, correct: 18 }],
    ]));

    const result = getReadinessEstimate('sap-c02');
    expect(result.level).toBe('ready');
    expect(result.score).toBe(900);
    expect(result.overallMastery).toBe(90);
  });

  it('returns approaching level when overall mastery 65-84', () => {
    setupTotalAttempts(30);

    const topic1 = createTopic({ meta: createTopicMeta({ id: 'topic-1', shortName: 'T1' }) });
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1', shortName: 'D1', weight: 100 }),
      topics: [topic1],
    });
    mockGetAllDomains.mockReturnValue([domain]);

    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map([
      ['domain-1/topic-1', { mastery: 75, attempts: 15, correct: 11 }],
    ]));

    const result = getReadinessEstimate('sap-c02');
    expect(result.level).toBe('approaching');
    expect(result.overallMastery).toBe(75);
  });

  it('returns building level when overall mastery < 65', () => {
    setupTotalAttempts(10);

    const topic1 = createTopic({ meta: createTopicMeta({ id: 'topic-1', shortName: 'T1' }) });
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1', shortName: 'D1', weight: 100 }),
      topics: [topic1],
    });
    mockGetAllDomains.mockReturnValue([domain]);

    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map([
      ['domain-1/topic-1', { mastery: 50, attempts: 10, correct: 5 }],
    ]));

    const result = getReadinessEstimate('sap-c02');
    expect(result.level).toBe('building');
    expect(result.overallMastery).toBe(50);
  });

  it('calculates score as overallMastery * 10', () => {
    setupTotalAttempts(20);

    const topic1 = createTopic({ meta: createTopicMeta({ id: 'topic-1', shortName: 'T1' }) });
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1', shortName: 'D1', weight: 100 }),
      topics: [topic1],
    });
    mockGetAllDomains.mockReturnValue([domain]);

    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map([
      ['domain-1/topic-1', { mastery: 75, attempts: 15, correct: 11 }],
    ]));

    const result = getReadinessEstimate('sap-c02');
    expect(result.score).toBe(750);
  });

  it('builds domain breakdown with weak topics sorted ascending', () => {
    setupTotalAttempts(30);

    const topic1 = createTopic({ meta: createTopicMeta({ id: 'topic-1', shortName: 'VPC' }) });
    const topic2 = createTopic({ meta: createTopicMeta({ id: 'topic-2', shortName: 'IAM' }) });
    const topic3 = createTopic({ meta: createTopicMeta({ id: 'topic-3', shortName: 'S3' }) });
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1', shortName: 'D1', weight: 100 }),
      topics: [topic1, topic2, topic3],
    });
    mockGetAllDomains.mockReturnValue([domain]);

    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map([
      ['domain-1/topic-1', { mastery: 90, attempts: 20, correct: 18 }],  // not weak
      ['domain-1/topic-2', { mastery: 60, attempts: 15, correct: 9 }],   // weak
      ['domain-1/topic-3', { mastery: 40, attempts: 10, correct: 4 }],   // weakest
    ]));

    const result = getReadinessEstimate('sap-c02');
    expect(result.domainBreakdown).toHaveLength(1);

    const breakdown = result.domainBreakdown[0];
    expect(breakdown.domainId).toBe('domain-1');
    expect(breakdown.topicsCovered).toBe(3);
    expect(breakdown.totalTopics).toBe(3);
    expect(breakdown.weakTopics).toHaveLength(2);
    // Sorted ascending by mastery
    expect(breakdown.weakTopics[0].topicId).toBe('topic-3');
    expect(breakdown.weakTopics[0].mastery).toBe(40);
    expect(breakdown.weakTopics[1].topicId).toBe('topic-2');
    expect(breakdown.weakTopics[1].mastery).toBe(60);
  });

  it('includes unstudied topics as weak with 0 mastery and 0 attempts', () => {
    setupTotalAttempts(10);

    const topic1 = createTopic({ meta: createTopicMeta({ id: 'topic-1', shortName: 'VPC' }) });
    const topic2 = createTopic({ meta: createTopicMeta({ id: 'topic-2', shortName: 'IAM' }) });
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1', shortName: 'D1', weight: 100 }),
      topics: [topic1, topic2],
    });
    mockGetAllDomains.mockReturnValue([domain]);

    // Only topic-1 has attempts
    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map([
      ['domain-1/topic-1', { mastery: 90, attempts: 10, correct: 9 }],
    ]));

    const result = getReadinessEstimate('sap-c02');
    const breakdown = result.domainBreakdown[0];
    expect(breakdown.topicsCovered).toBe(1);
    expect(breakdown.weakTopics).toHaveLength(1);
    expect(breakdown.weakTopics[0].topicId).toBe('topic-2');
    expect(breakdown.weakTopics[0].mastery).toBe(0);
    expect(breakdown.weakTopics[0].attempts).toBe(0);
  });

  it('builds focus areas ordered by impact descending', () => {
    setupTotalAttempts(50);

    const topic1 = createTopic({ meta: createTopicMeta({ id: 'topic-1', shortName: 'T1' }) });
    const topic2 = createTopic({ meta: createTopicMeta({ id: 'topic-2', shortName: 'T2' }) });

    const domain1 = createDomain({
      meta: createDomainMeta({ id: 'domain-1', shortName: 'D1', weight: 60 }),
      topics: [topic1],
    });
    const domain2 = createDomain({
      meta: createDomainMeta({ id: 'domain-2', shortName: 'D2', weight: 40 }),
      topics: [topic2],
    });
    mockGetAllDomains.mockReturnValue([domain1, domain2]);

    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map([
      ['domain-1/topic-1', { mastery: 80, attempts: 20, correct: 16 }],
      ['domain-2/topic-2', { mastery: 40, attempts: 15, correct: 6 }],
    ]));

    const result = getReadinessEstimate('sap-c02');
    expect(result.focusAreas).toHaveLength(2);
    // domain-2: impact = (100-40) * 40/100 = 24
    // domain-1: impact = (100-80) * 60/100 = 12
    expect(result.focusAreas[0].domainId).toBe('domain-2');
    expect(result.focusAreas[0].impact).toBe(24);
    expect(result.focusAreas[1].domainId).toBe('domain-1');
    expect(result.focusAreas[1].impact).toBe(12);
  });

  it('calculates weighted overall mastery across multiple domains', () => {
    setupTotalAttempts(50);

    const topic1 = createTopic({ meta: createTopicMeta({ id: 'topic-1', shortName: 'T1' }) });
    const topic2 = createTopic({ meta: createTopicMeta({ id: 'topic-2', shortName: 'T2' }) });

    const domain1 = createDomain({
      meta: createDomainMeta({ id: 'domain-1', shortName: 'D1', weight: 60 }),
      topics: [topic1],
    });
    const domain2 = createDomain({
      meta: createDomainMeta({ id: 'domain-2', shortName: 'D2', weight: 40 }),
      topics: [topic2],
    });
    mockGetAllDomains.mockReturnValue([domain1, domain2]);

    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map([
      ['domain-1/topic-1', { mastery: 80, attempts: 20, correct: 16 }],
      ['domain-2/topic-2', { mastery: 60, attempts: 15, correct: 9 }],
    ]));

    const result = getReadinessEstimate('sap-c02');
    // weighted: (80 * 0.6 + 60 * 0.4) / (0.6 + 0.4) = (48 + 24) / 1.0 = 72
    expect(result.overallMastery).toBe(72);
  });

  it('returns empty state when no domains exist', () => {
    setupTotalAttempts(10);
    mockGetAllDomains.mockReturnValue([]);

    const result = getReadinessEstimate('sap-c02');
    expect(result.level).toBe('building');
    expect(result.score).toBe(0);
    expect(result.domainBreakdown).toEqual([]);
  });
});

describe('calculateCoverageAwareDomainMastery', () => {
  it('divides by total topics, not just studied topics', () => {
    const topicMasteries = new Map([
      ['domain-1/topic-1', { mastery: 90, attempts: 20, correct: 18 }],
      ['domain-1/topic-2', { mastery: 90, attempts: 20, correct: 18 }],
    ]);
    const result = calculateCoverageAwareDomainMastery(topicMasteries, 'domain-1', 5);
    expect(result).toBeCloseTo(36);
  });

  it('returns full mastery when all topics studied', () => {
    const topicMasteries = new Map([
      ['domain-1/topic-1', { mastery: 90, attempts: 20, correct: 18 }],
      ['domain-1/topic-2', { mastery: 80, attempts: 20, correct: 16 }],
    ]);
    const result = calculateCoverageAwareDomainMastery(topicMasteries, 'domain-1', 2);
    expect(result).toBeCloseTo(85);
  });

  it('returns 0 when no topics studied', () => {
    const topicMasteries = new Map<string, { mastery: number; attempts: number; correct: number }>();
    const result = calculateCoverageAwareDomainMastery(topicMasteries, 'domain-1', 5);
    expect(result).toBe(0);
  });

  it('handles single topic domain', () => {
    const topicMasteries = new Map([
      ['domain-1/topic-1', { mastery: 75, attempts: 15, correct: 11 }],
    ]);
    const result = calculateCoverageAwareDomainMastery(topicMasteries, 'domain-1', 1);
    expect(result).toBeCloseTo(75);
  });
});

describe('getProgressSummary', () => {
  it('composes overall, domains, recentActivity, readinessEstimate', () => {
    const domain = createDomain({
      meta: createDomainMeta({ id: 'domain-1', shortName: 'D1', weight: 100 }),
    });
    mockGetAllDomains.mockReturnValue([domain]);

    // getAllTopicWindowedMasteries used by calculateOverallMastery, getDomainProgress batch, and getReadinessEstimate
    vi.mocked(getAllTopicWindowedMasteries).mockReturnValue(new Map());

    // getOverallProgress: questionStats, studyTime
    mockStatement.get
      .mockReturnValueOnce({ attempted: 10, correct: 8 })
      .mockReturnValueOnce({ total_seconds: 600 });

    // getAllDomainProgressBatch:
    // topicStats batch
    mockStatement.all
      .mockReturnValueOnce([{ domain_id: 'domain-1', topics_with_progress: 1, completed_topics: 0 }])
      // questionStats batch
      .mockReturnValueOnce([{ domain_id: 'domain-1', attempted: 10, correct: 8 }])
      // weakAreas batch
      .mockReturnValueOnce([]);

    // getRecentActivity: assessments, sessions
    mockStatement.all
      .mockReturnValueOnce([])
      .mockReturnValueOnce([]);

    // getReadinessEstimate: total_attempts query
    mockStatement.get
      .mockReturnValueOnce({ total_attempts: 10 });

    const result = getProgressSummary('sap-c02');
    expect(result).toHaveProperty('overall');
    expect(result).toHaveProperty('domains');
    expect(result).toHaveProperty('recentActivity');
    expect(result).toHaveProperty('readinessEstimate');
    expect(result.domains).toHaveLength(1);
    expect(result.overall.questionsAttempted).toBe(10);
    expect(result.readinessEstimate).toHaveProperty('level');
    expect(result.readinessEstimate).toHaveProperty('domainBreakdown');
    expect(result.readinessEstimate).toHaveProperty('focusAreas');
  });
});
