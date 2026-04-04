import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPOSTRequest } from '@/lib/test-helpers/request';
import { createQuestion } from '@/lib/test-helpers/factories';
import type { AssessmentResult } from '@/types/assessment';

// Use vi.hoisted so mock objects are available in vi.mock factories (which are hoisted)
const { mockStatement, mockTransaction } = vi.hoisted(() => {
  const mockStatement = {
    run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 42 }),
    get: vi.fn().mockReturnValue(null),
    all: vi.fn().mockReturnValue([]),
  };
  const mockTransaction = vi.fn().mockImplementation(
    (fn: Function) => (...args: unknown[]) => fn(...args)
  );
  return { mockStatement, mockTransaction };
});

vi.mock('@/lib/db/client', () => ({
  db: {
    prepare: vi.fn().mockReturnValue(mockStatement),
    transaction: mockTransaction,
  },
}));

// Mock content loader
const mockGetTopicQuestions = vi.fn();
const mockGetRandomDomainQuestions = vi.fn();

vi.mock('@/lib/content/loader', () => ({
  getTopicQuestions: (...args: unknown[]) => mockGetTopicQuestions(...args),
  getRandomDomainQuestions: (...args: unknown[]) => mockGetRandomDomainQuestions(...args),
}));

// Mock assessment engine
const mockCreateAssessmentResult = vi.fn();

vi.mock('@/lib/assess/engine', () => ({
  createAssessmentResult: (...args: unknown[]) => mockCreateAssessmentResult(...args),
}));

import { POST } from '../route';

function createMockAssessmentResult(overrides: Partial<AssessmentResult> = {}): AssessmentResult {
  return {
    sessionId: 'test-session',
    score: 80,
    correctCount: 4,
    totalCount: 5,
    timeSeconds: 300,
    results: [
      {
        questionId: 'q1',
        question: createQuestion({ id: 'q1', domainId: 'domain-1', topicId: 'topic-1' }),
        selectedAnswer: 'A',
        correctAnswer: 'A',
        isCorrect: true,
        explanation: 'Correct',
        timeSeconds: 60,
      },
    ],
    weakAreas: [],
    recommendations: { reviewTopics: [], suggestedExperiments: [] },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStatement.run.mockReturnValue({ changes: 1, lastInsertRowid: 42 });
  mockStatement.get.mockReturnValue(null);
  mockTransaction.mockImplementation(
    (fn: Function) => (...args: unknown[]) => fn(...args)
  );
  mockGetTopicQuestions.mockReturnValue([]);
  mockGetRandomDomainQuestions.mockReturnValue([]);
  mockCreateAssessmentResult.mockReturnValue(createMockAssessmentResult());
});

describe('POST /api/assess', () => {
  describe('request validation', () => {
    it('returns 400 for non-object body', async () => {
      const req = createPOSTRequest('/api/assess', 'not an object');
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing answers', async () => {
      const req = createPOSTRequest('/api/assess', { domainId: 'd1' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for empty answers array', async () => {
      const req = createPOSTRequest('/api/assess', { domainId: 'd1', answers: [] });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for answer without questionId', async () => {
      const req = createPOSTRequest('/api/assess', {
        domainId: 'd1',
        answers: [{ selectedAnswer: 'A', timeSeconds: 30 }],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for answer without selectedAnswer', async () => {
      const req = createPOSTRequest('/api/assess', {
        domainId: 'd1',
        answers: [{ questionId: 'q1', timeSeconds: 30 }],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid mode', async () => {
      const req = createPOSTRequest('/api/assess', {
        domainId: 'd1',
        mode: 'invalid',
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when domainId missing', async () => {
      const req = createPOSTRequest('/api/assess', {
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('question loading', () => {
    it('loads topic questions when topicId + domainId provided', async () => {
      const questions = [createQuestion({ id: 'q1', domainId: 'domain-1', topicId: 'topic-1' })];
      mockGetTopicQuestions.mockReturnValue(questions);
      mockCreateAssessmentResult.mockReturnValue(createMockAssessmentResult());

      const req = createPOSTRequest('/api/assess', {
        domainId: 'domain-1',
        topicId: 'topic-1',
        sessionId: 's1',
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });

      await POST(req);
      expect(mockGetTopicQuestions).toHaveBeenCalledWith('sap-c02', 'domain-1', 'topic-1');
    });

    it('loads domain questions when only domainId provided', async () => {
      const questions = [createQuestion({ id: 'q1', domainId: 'domain-1', topicId: 'topic-1' })];
      mockGetRandomDomainQuestions.mockReturnValue(questions);
      mockCreateAssessmentResult.mockReturnValue(createMockAssessmentResult());

      const req = createPOSTRequest('/api/assess', {
        domainId: 'domain-1',
        sessionId: 's1',
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });

      await POST(req);
      expect(mockGetRandomDomainQuestions).toHaveBeenCalledWith('sap-c02', 'domain-1', 100);
    });

    it('returns 400 when no matching questions found', async () => {
      mockGetTopicQuestions.mockReturnValue([createQuestion({ id: 'different-q' })]);

      const req = createPOSTRequest('/api/assess', {
        domainId: 'domain-1',
        topicId: 'topic-1',
        sessionId: 's1',
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('assessment processing', () => {
    it('returns assessment result with score', async () => {
      const questions = [createQuestion({ id: 'q1', domainId: 'domain-1', topicId: 'topic-1' })];
      mockGetTopicQuestions.mockReturnValue(questions);
      mockCreateAssessmentResult.mockReturnValue(createMockAssessmentResult({ score: 80 }));

      const req = createPOSTRequest('/api/assess', {
        domainId: 'domain-1',
        topicId: 'topic-1',
        sessionId: 's1',
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.score).toBe(80);
    });

    it('includes databaseSessionId in response', async () => {
      const questions = [createQuestion({ id: 'q1', domainId: 'domain-1', topicId: 'topic-1' })];
      mockGetTopicQuestions.mockReturnValue(questions);
      mockCreateAssessmentResult.mockReturnValue(createMockAssessmentResult());

      const req = createPOSTRequest('/api/assess', {
        domainId: 'domain-1',
        topicId: 'topic-1',
        sessionId: 's1',
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });

      const res = await POST(req);
      const body = await res.json();

      expect(body.databaseSessionId).toBeDefined();
    });

    it('defaults examId to sap-c02', async () => {
      const questions = [createQuestion({ id: 'q1', domainId: 'domain-1', topicId: 'topic-1' })];
      mockGetTopicQuestions.mockReturnValue(questions);
      mockCreateAssessmentResult.mockReturnValue(createMockAssessmentResult());

      const req = createPOSTRequest('/api/assess', {
        domainId: 'domain-1',
        topicId: 'topic-1',
        sessionId: 's1',
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });

      await POST(req);
      expect(mockGetTopicQuestions).toHaveBeenCalledWith('sap-c02', 'domain-1', 'topic-1');
    });
  });

  describe('database operations', () => {
    it('calls db.transaction', async () => {
      const questions = [createQuestion({ id: 'q1', domainId: 'domain-1', topicId: 'topic-1' })];
      mockGetTopicQuestions.mockReturnValue(questions);
      mockCreateAssessmentResult.mockReturnValue(createMockAssessmentResult());

      const req = createPOSTRequest('/api/assess', {
        domainId: 'domain-1',
        topicId: 'topic-1',
        sessionId: 's1',
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });

      await POST(req);
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('inserts assessment session and question attempts', async () => {
      const questions = [createQuestion({ id: 'q1', domainId: 'domain-1', topicId: 'topic-1' })];
      mockGetTopicQuestions.mockReturnValue(questions);
      mockCreateAssessmentResult.mockReturnValue(createMockAssessmentResult());

      const req = createPOSTRequest('/api/assess', {
        domainId: 'domain-1',
        topicId: 'topic-1',
        sessionId: 's1',
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });

      await POST(req);
      // Multiple db.prepare calls: session insert, question attempt insert, topic progress upsert
      expect(mockStatement.run).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns computed results with warning when transaction fails', async () => {
      const questions = [createQuestion({ id: 'q1', domainId: 'domain-1', topicId: 'topic-1' })];
      mockGetTopicQuestions.mockReturnValue(questions);
      const expectedResult = createMockAssessmentResult({ score: 75 });
      mockCreateAssessmentResult.mockReturnValue(expectedResult);

      mockTransaction.mockImplementation(() => () => {
        throw new Error('DB transaction failed');
      });

      const req = createPOSTRequest('/api/assess', {
        domainId: 'domain-1',
        topicId: 'topic-1',
        sessionId: 's1',
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.score).toBe(75);
      expect(body.correctCount).toBe(expectedResult.correctCount);
      expect(body.totalCount).toBe(expectedResult.totalCount);
      expect(body.results).toHaveLength(expectedResult.results.length);
      expect(body.warning).toBe('Assessment results could not be saved');
      expect(body.databaseSessionId).toBeNull();
    });

    it('logs transaction failure context', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const questions = [createQuestion({ id: 'q1', domainId: 'domain-1', topicId: 'topic-1' })];
      mockGetTopicQuestions.mockReturnValue(questions);
      mockCreateAssessmentResult.mockReturnValue(createMockAssessmentResult());

      mockTransaction.mockImplementation(() => () => {
        throw new Error('SQLITE_BUSY: database is locked');
      });

      const req = createPOSTRequest('/api/assess', {
        domainId: 'domain-1',
        topicId: 'topic-1',
        sessionId: 's1',
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });

      await POST(req);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Assessment transaction failed:',
        expect.objectContaining({
          error: 'SQLITE_BUSY: database is locked',
          examId: 'sap-c02',
          domainId: 'domain-1',
          topicId: 'topic-1',
        })
      );
      consoleSpy.mockRestore();
    });

    it('returns 500 when content loader throws', async () => {
      mockGetTopicQuestions.mockImplementation(() => {
        throw new Error('File not found');
      });

      const req = createPOSTRequest('/api/assess', {
        domainId: 'domain-1',
        topicId: 'topic-1',
        sessionId: 's1',
        answers: [{ questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 }],
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});
