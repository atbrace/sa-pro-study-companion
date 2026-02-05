import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGETRequest } from '@/lib/test-helpers/request';
import { createQuestion } from '@/lib/test-helpers/factories';

const mockGetTopicQuestions = vi.fn();
const mockGetRandomDomainQuestions = vi.fn();

vi.mock('@/lib/content/loader', () => ({
  getTopicQuestions: (...args: unknown[]) => mockGetTopicQuestions(...args),
  getRandomDomainQuestions: (...args: unknown[]) => mockGetRandomDomainQuestions(...args),
}));

import { GET } from '../route';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTopicQuestions.mockReturnValue([]);
  mockGetRandomDomainQuestions.mockReturnValue([]);
});

describe('GET /api/questions', () => {
  it('returns topic questions when topic param provided', async () => {
    const questions = [createQuestion({ id: 'q1' }), createQuestion({ id: 'q2' })];
    mockGetTopicQuestions.mockReturnValue(questions);

    const req = createGETRequest('/api/questions', {
      domain: 'domain-1',
      topic: 'topic-1',
    });

    const res = await GET(req);
    const body = await res.json();

    expect(body.questions).toHaveLength(2);
    expect(body.count).toBe(2);
    expect(mockGetTopicQuestions).toHaveBeenCalledWith('sap-c02', 'domain-1', 'topic-1');
  });

  it('returns random domain questions when only domain provided', async () => {
    const questions = [createQuestion({ id: 'q1' })];
    mockGetRandomDomainQuestions.mockReturnValue(questions);

    const req = createGETRequest('/api/questions', { domain: 'domain-1' });

    const res = await GET(req);
    const body = await res.json();

    expect(body.questions).toHaveLength(1);
    expect(mockGetRandomDomainQuestions).toHaveBeenCalledWith('sap-c02', 'domain-1', 15);
  });

  it('returns 400 when domain param missing', async () => {
    const req = createGETRequest('/api/questions');

    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Domain ID');
  });

  it('defaults exam to sap-c02', async () => {
    mockGetTopicQuestions.mockReturnValue([]);

    const req = createGETRequest('/api/questions', { domain: 'd1', topic: 't1' });
    await GET(req);

    expect(mockGetTopicQuestions).toHaveBeenCalledWith('sap-c02', 'd1', 't1');
  });

  it('uses custom exam ID from query param', async () => {
    mockGetTopicQuestions.mockReturnValue([]);

    const req = createGETRequest('/api/questions', { exam: 'mla-c01', domain: 'd1', topic: 't1' });
    await GET(req);

    expect(mockGetTopicQuestions).toHaveBeenCalledWith('mla-c01', 'd1', 't1');
  });

  it('defaults count to 15', async () => {
    mockGetRandomDomainQuestions.mockReturnValue([]);

    const req = createGETRequest('/api/questions', { domain: 'd1' });
    await GET(req);

    expect(mockGetRandomDomainQuestions).toHaveBeenCalledWith('sap-c02', 'd1', 15);
  });

  it('uses custom count from query param', async () => {
    mockGetRandomDomainQuestions.mockReturnValue([]);

    const req = createGETRequest('/api/questions', { domain: 'd1', count: '25' });
    await GET(req);

    expect(mockGetRandomDomainQuestions).toHaveBeenCalledWith('sap-c02', 'd1', 25);
  });

  it('returns 500 when loader throws', async () => {
    mockGetRandomDomainQuestions.mockImplementation(() => {
      throw new Error('File system error');
    });

    const req = createGETRequest('/api/questions', { domain: 'd1' });
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Failed');
  });
});
