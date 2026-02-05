import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGETRequest } from '@/lib/test-helpers/request';

const mockGetProgressSummary = vi.fn();

vi.mock('@/lib/progress/calculator', () => ({
  getProgressSummary: (...args: unknown[]) => mockGetProgressSummary(...args),
}));

import { GET } from '../route';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/progress', () => {
  it('returns progress summary as JSON', async () => {
    const summary = {
      overall: { masteryScore: 75, questionsAttempted: 50, questionsCorrect: 38, studyTimeMinutes: 120, experimentsCompleted: 0 },
      domains: [],
      recentActivity: [],
      readinessEstimate: { score: 750, confidence: 'medium', recommendation: 'Keep studying' },
    };
    mockGetProgressSummary.mockReturnValue(summary);

    const req = createGETRequest('/api/progress');
    const res = await GET(req);
    const body = await res.json();

    expect(body.overall.masteryScore).toBe(75);
    expect(body.readinessEstimate.confidence).toBe('medium');
  });

  it('defaults exam to sap-c02', async () => {
    mockGetProgressSummary.mockReturnValue({ overall: {}, domains: [], recentActivity: [], readinessEstimate: {} });

    const req = createGETRequest('/api/progress');
    await GET(req);

    expect(mockGetProgressSummary).toHaveBeenCalledWith('sap-c02');
  });

  it('passes custom exam ID to calculator', async () => {
    mockGetProgressSummary.mockReturnValue({ overall: {}, domains: [], recentActivity: [], readinessEstimate: {} });

    const req = createGETRequest('/api/progress', { exam: 'mla-c01' });
    await GET(req);

    expect(mockGetProgressSummary).toHaveBeenCalledWith('mla-c01');
  });

  it('returns 500 when calculator throws', async () => {
    mockGetProgressSummary.mockImplementation(() => {
      throw new Error('DB error');
    });

    const req = createGETRequest('/api/progress');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Failed');
  });

  it('returns 200 status on success', async () => {
    mockGetProgressSummary.mockReturnValue({ overall: {}, domains: [], recentActivity: [], readinessEstimate: {} });

    const req = createGETRequest('/api/progress');
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});
