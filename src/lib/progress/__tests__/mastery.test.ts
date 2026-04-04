import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    run: vi.fn(),
    get: vi.fn(),
    all: vi.fn().mockReturnValue([]),
  };
  return { mockStatement };
});

vi.mock('@/lib/db/client', () => ({
  db: { prepare: vi.fn().mockReturnValue(mockStatement) },
}));

import { calculateSmoothedMastery, getTopicWindowedMastery, getAllTopicWindowedMasteries } from '../mastery';

describe('calculateSmoothedMastery', () => {
  // Formula: (correct + k * prior) / (attempts + k) where k=5, prior=0.5
  it('returns 50% with zero attempts (pure prior)', () => {
    expect(calculateSmoothedMastery(0, 0)).toBeCloseTo(50);
  });

  it('returns ~58% for 1/1 correct (heavily smoothed)', () => {
    expect(calculateSmoothedMastery(1, 1)).toBeCloseTo(58.33, 1);
  });

  it('returns ~75% for 5/5 correct', () => {
    expect(calculateSmoothedMastery(5, 5)).toBeCloseTo(75);
  });

  it('returns ~77% for 9/10 correct', () => {
    expect(calculateSmoothedMastery(9, 10)).toBeCloseTo(76.67, 1);
  });

  it('returns ~78% for 17/20 correct', () => {
    expect(calculateSmoothedMastery(17, 20)).toBeCloseTo(78);
  });

  it('returns 90% for 20/20 correct', () => {
    expect(calculateSmoothedMastery(20, 20)).toBeCloseTo(90);
  });

  it('returns ~25% for 0/5 correct (smoothed toward prior)', () => {
    expect(calculateSmoothedMastery(0, 5)).toBeCloseTo(25);
  });

  it('returns ~10% for 0/20 correct', () => {
    expect(calculateSmoothedMastery(0, 20)).toBeCloseTo(10);
  });
});

describe('getTopicWindowedMastery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatement.all.mockReturnValue([]);
  });

  it('returns smoothed 50% when no attempts exist', () => {
    mockStatement.all.mockReturnValue([]);
    const result = getTopicWindowedMastery('sap-c02', 'domain-1', 'topic-1');
    expect(result.mastery).toBeCloseTo(50);
    expect(result.attempts).toBe(0);
  });

  it('uses only the last 20 attempts', () => {
    // 18/20 correct in window
    const attempts = Array.from({ length: 20 }, (_, i) => ({
      is_correct: i < 18 ? 1 : 0,
    }));
    mockStatement.all.mockReturnValue(attempts);

    const result = getTopicWindowedMastery('sap-c02', 'domain-1', 'topic-1');
    // Smoothed: (18 + 2.5) / (20 + 5) = 82%
    expect(result.mastery).toBeCloseTo(82);
    expect(result.attempts).toBe(20);
  });

  it('handles fewer than 20 attempts with smoothing', () => {
    const attempts = [{ is_correct: 1 }, { is_correct: 1 }, { is_correct: 0 }];
    mockStatement.all.mockReturnValue(attempts);

    const result = getTopicWindowedMastery('sap-c02', 'domain-1', 'topic-1');
    // Smoothed: (2 + 2.5) / (3 + 5) = 56.25%
    expect(result.mastery).toBeCloseTo(56.25);
    expect(result.attempts).toBe(3);
  });
});

describe('getAllTopicWindowedMasteries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatement.all.mockReturnValue([]);
  });

  it('returns Map keyed by domainId/topicId', () => {
    mockStatement.all.mockReturnValue([
      { domain_id: 'd1', topic_id: 't1', is_correct: 1, rn: 1 },
      { domain_id: 'd1', topic_id: 't1', is_correct: 1, rn: 2 },
      { domain_id: 'd1', topic_id: 't1', is_correct: 0, rn: 3 },
      { domain_id: 'd2', topic_id: 't2', is_correct: 1, rn: 1 },
    ]);

    const result = getAllTopicWindowedMasteries('sap-c02');
    expect(result.has('d1/t1')).toBe(true);
    expect(result.has('d2/t2')).toBe(true);
  });

  it('returns empty Map when no attempts exist', () => {
    mockStatement.all.mockReturnValue([]);
    const result = getAllTopicWindowedMasteries('sap-c02');
    expect(result.size).toBe(0);
  });

  it('calculates smoothed mastery per topic from grouped rows', () => {
    mockStatement.all.mockReturnValue([
      { domain_id: 'd1', topic_id: 't1', is_correct: 1, rn: 1 },
      { domain_id: 'd1', topic_id: 't1', is_correct: 1, rn: 2 },
      { domain_id: 'd1', topic_id: 't1', is_correct: 1, rn: 3 },
      { domain_id: 'd1', topic_id: 't1', is_correct: 1, rn: 4 },
      { domain_id: 'd1', topic_id: 't1', is_correct: 1, rn: 5 },
    ]);

    const result = getAllTopicWindowedMasteries('sap-c02');
    const t1 = result.get('d1/t1')!;
    // 5/5 correct, smoothed: (5 + 2.5) / (5 + 5) = 75%
    expect(t1.mastery).toBeCloseTo(75);
    expect(t1.attempts).toBe(5);
    expect(t1.correct).toBe(5);
  });
});
