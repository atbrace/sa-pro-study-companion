import { describe, it, expect } from 'vitest';
import {
  isAnswerCorrect,
  scoreAssessment,
  calculateScore,
  identifyWeakAreas,
  generateRecommendations,
  createAssessmentResult,
} from '../engine';
import type { Question } from '@/types/domain';
import type { QuestionAnswer, QuestionResult } from '@/types/assessment';

// Helper to create minimal Question objects for testing
function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    type: 'single',
    text: 'Test question',
    options: [
      { id: 'A', text: 'Option A' },
      { id: 'B', text: 'Option B' },
    ],
    correctAnswer: 'A',
    explanation: 'Test explanation',
    services: [],
    concepts: [],
    ...overrides,
  };
}

// Helper to create QuestionResult for calculateScore/identifyWeakAreas tests
function createResult(overrides: Partial<QuestionResult> = {}): QuestionResult {
  const question = createQuestion(overrides.question);
  return {
    questionId: question.id,
    question,
    selectedAnswer: 'A',
    correctAnswer: question.correctAnswer,
    isCorrect: true,
    explanation: question.explanation,
    timeSeconds: 30,
    ...overrides,
  };
}

describe('isAnswerCorrect', () => {
  describe('single-select questions', () => {
    it('returns true for correct single-select answer', () => {
      const question = createQuestion({ type: 'single', correctAnswer: 'B' });
      expect(isAnswerCorrect(question, 'B')).toBe(true);
    });

    it('returns false for incorrect single-select answer', () => {
      const question = createQuestion({ type: 'single', correctAnswer: 'B' });
      expect(isAnswerCorrect(question, 'A')).toBe(false);
    });

    it('returns false when array provided for single-select', () => {
      const question = createQuestion({ type: 'single', correctAnswer: 'A' });
      expect(isAnswerCorrect(question, ['A'])).toBe(false);
    });
  });

  describe('multi-select questions', () => {
    it('returns true for correct multi-select answer with same order', () => {
      const question = createQuestion({
        type: 'multi',
        correctAnswer: ['A', 'C'],
      });
      expect(isAnswerCorrect(question, ['A', 'C'])).toBe(true);
    });

    it('returns true for correct multi-select answer with different order', () => {
      const question = createQuestion({
        type: 'multi',
        correctAnswer: ['A', 'C'],
      });
      expect(isAnswerCorrect(question, ['C', 'A'])).toBe(true);
    });

    it('returns false for partial multi-select answer (missing one)', () => {
      const question = createQuestion({
        type: 'multi',
        correctAnswer: ['A', 'C'],
      });
      expect(isAnswerCorrect(question, ['A'])).toBe(false);
    });

    it('returns false for multi-select answer with extra option', () => {
      const question = createQuestion({
        type: 'multi',
        correctAnswer: ['A', 'C'],
      });
      expect(isAnswerCorrect(question, ['A', 'B', 'C'])).toBe(false);
    });

    it('returns false when string provided for multi-select', () => {
      const question = createQuestion({
        type: 'multi',
        correctAnswer: ['A', 'C'],
      });
      expect(isAnswerCorrect(question, 'A')).toBe(false);
    });

    it('returns false when correctAnswer is not an array for multi type', () => {
      const question = createQuestion({
        type: 'multi',
        correctAnswer: 'A' as unknown as string[],
      });
      expect(isAnswerCorrect(question, ['A'])).toBe(false);
    });

    it('handles empty array for multi-select', () => {
      const question = createQuestion({
        type: 'multi',
        correctAnswer: ['A', 'C'],
      });
      expect(isAnswerCorrect(question, [])).toBe(false);
    });
  });
});

describe('scoreAssessment', () => {
  it('scores all correct answers', () => {
    const questions = [
      createQuestion({ id: 'q1', correctAnswer: 'A' }),
      createQuestion({ id: 'q2', correctAnswer: 'B' }),
    ];
    const answers: QuestionAnswer[] = [
      { questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 },
      { questionId: 'q2', selectedAnswer: 'B', timeSeconds: 45 },
    ];

    const results = scoreAssessment(questions, answers);

    expect(results).toHaveLength(2);
    expect(results[0].isCorrect).toBe(true);
    expect(results[1].isCorrect).toBe(true);
  });

  it('scores mixed correct/incorrect answers', () => {
    const questions = [
      createQuestion({ id: 'q1', correctAnswer: 'A' }),
      createQuestion({ id: 'q2', correctAnswer: 'B' }),
    ];
    const answers: QuestionAnswer[] = [
      { questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 },
      { questionId: 'q2', selectedAnswer: 'C', timeSeconds: 45 },
    ];

    const results = scoreAssessment(questions, answers);

    expect(results[0].isCorrect).toBe(true);
    expect(results[1].isCorrect).toBe(false);
  });

  it('skips answers for non-existent questions', () => {
    const questions = [createQuestion({ id: 'q1', correctAnswer: 'A' })];
    const answers: QuestionAnswer[] = [
      { questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 },
      { questionId: 'nonexistent', selectedAnswer: 'B', timeSeconds: 45 },
    ];

    const results = scoreAssessment(questions, answers);

    expect(results).toHaveLength(1);
    expect(results[0].questionId).toBe('q1');
  });

  it('preserves time tracking in results', () => {
    const questions = [createQuestion({ id: 'q1', correctAnswer: 'A' })];
    const answers: QuestionAnswer[] = [
      { questionId: 'q1', selectedAnswer: 'A', timeSeconds: 42 },
    ];

    const results = scoreAssessment(questions, answers);

    expect(results[0].timeSeconds).toBe(42);
  });

  it('handles empty questions array', () => {
    const answers: QuestionAnswer[] = [
      { questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 },
    ];

    const results = scoreAssessment([], answers);

    expect(results).toHaveLength(0);
  });

  it('handles empty answers array', () => {
    const questions = [createQuestion({ id: 'q1', correctAnswer: 'A' })];

    const results = scoreAssessment(questions, []);

    expect(results).toHaveLength(0);
  });
});

describe('calculateScore', () => {
  it('returns 100 for all correct', () => {
    const results = [
      createResult({ isCorrect: true }),
      createResult({ isCorrect: true }),
    ];
    expect(calculateScore(results)).toBe(100);
  });

  it('returns 0 for all incorrect', () => {
    const results = [
      createResult({ isCorrect: false }),
      createResult({ isCorrect: false }),
    ];
    expect(calculateScore(results)).toBe(0);
  });

  it('returns 0 for empty results array', () => {
    expect(calculateScore([])).toBe(0);
  });

  it('calculates 50% correctly', () => {
    const results = [
      createResult({ isCorrect: true }),
      createResult({ isCorrect: false }),
    ];
    expect(calculateScore(results)).toBe(50);
  });

  it('rounds 66.67% to 67', () => {
    const results = [
      createResult({ isCorrect: true }),
      createResult({ isCorrect: true }),
      createResult({ isCorrect: false }),
    ];
    expect(calculateScore(results)).toBe(67);
  });

  it('rounds 33.33% to 33', () => {
    const results = [
      createResult({ isCorrect: true }),
      createResult({ isCorrect: false }),
      createResult({ isCorrect: false }),
    ];
    expect(calculateScore(results)).toBe(33);
  });

  it('handles single correct result', () => {
    const results = [createResult({ isCorrect: true })];
    expect(calculateScore(results)).toBe(100);
  });

  it('handles single incorrect result', () => {
    const results = [createResult({ isCorrect: false })];
    expect(calculateScore(results)).toBe(0);
  });
});

describe('identifyWeakAreas', () => {
  function createResultWithTopic(
    topicId: string,
    domainId: string,
    isCorrect: boolean,
    services: string[] = []
  ): QuestionResult {
    return createResult({
      isCorrect,
      question: createQuestion({
        id: `q-${topicId}-${Math.random()}`,
        topicId,
        domainId,
        services,
      }),
    });
  }

  it('identifies topic with score below threshold as weak', () => {
    const results = [
      createResultWithTopic('networking', 'domain-1', false),
      createResultWithTopic('networking', 'domain-1', false),
      createResultWithTopic('networking', 'domain-1', true),
    ];

    const weakAreas = identifyWeakAreas(results, 0.6);

    expect(weakAreas).toHaveLength(1);
    expect(weakAreas[0].topicId).toBe('networking');
    expect(weakAreas[0].incorrectCount).toBe(2);
  });

  it('does not identify topic with score above threshold', () => {
    const results = [
      createResultWithTopic('security', 'domain-1', true),
      createResultWithTopic('security', 'domain-1', true),
      createResultWithTopic('security', 'domain-1', true),
      createResultWithTopic('security', 'domain-1', false),
    ];

    // 75% correct, above 60% threshold
    const weakAreas = identifyWeakAreas(results, 0.6);

    expect(weakAreas).toHaveLength(0);
  });

  it('handles exactly-at-threshold score (not weak)', () => {
    const results = [
      createResultWithTopic('compute', 'domain-2', true),
      createResultWithTopic('compute', 'domain-2', true),
      createResultWithTopic('compute', 'domain-2', true),
      createResultWithTopic('compute', 'domain-2', false),
      createResultWithTopic('compute', 'domain-2', false),
    ];

    // 60% correct, exactly at threshold
    const weakAreas = identifyWeakAreas(results, 0.6);

    expect(weakAreas).toHaveLength(0);
  });

  it('handles just-below-threshold score (is weak)', () => {
    const results = [
      createResultWithTopic('storage', 'domain-2', true),
      createResultWithTopic('storage', 'domain-2', false),
    ];

    // 50% correct, below 60% threshold
    const weakAreas = identifyWeakAreas(results, 0.6);

    expect(weakAreas).toHaveLength(1);
    expect(weakAreas[0].topicId).toBe('storage');
  });

  it('groups multiple topics correctly', () => {
    const results = [
      createResultWithTopic('networking', 'domain-1', false),
      createResultWithTopic('networking', 'domain-1', false),
      createResultWithTopic('security', 'domain-1', true),
      createResultWithTopic('security', 'domain-1', true),
    ];

    const weakAreas = identifyWeakAreas(results, 0.6);

    expect(weakAreas).toHaveLength(1);
    expect(weakAreas[0].topicId).toBe('networking');
  });

  it('sorts weak areas by incorrect count descending', () => {
    const results = [
      createResultWithTopic('topic-a', 'domain-1', false),
      createResultWithTopic('topic-b', 'domain-1', false),
      createResultWithTopic('topic-b', 'domain-1', false),
      createResultWithTopic('topic-b', 'domain-1', false),
      createResultWithTopic('topic-c', 'domain-1', false),
      createResultWithTopic('topic-c', 'domain-1', false),
    ];

    const weakAreas = identifyWeakAreas(results, 0.6);

    expect(weakAreas[0].topicId).toBe('topic-b');
    expect(weakAreas[0].incorrectCount).toBe(3);
    expect(weakAreas[1].topicId).toBe('topic-c');
    expect(weakAreas[1].incorrectCount).toBe(2);
    expect(weakAreas[2].topicId).toBe('topic-a');
    expect(weakAreas[2].incorrectCount).toBe(1);
  });

  it('collects services from questions in weak area', () => {
    const results = [
      createResultWithTopic('networking', 'domain-1', false, ['Amazon VPC']),
      createResultWithTopic('networking', 'domain-1', false, ['AWS Transit Gateway']),
      createResultWithTopic('networking', 'domain-1', false, ['Amazon VPC']),
    ];

    const weakAreas = identifyWeakAreas(results, 0.6);

    expect(weakAreas[0].services).toContain('Amazon VPC');
    expect(weakAreas[0].services).toContain('AWS Transit Gateway');
    // Should dedupe services
    expect(weakAreas[0].services.filter(s => s === 'Amazon VPC')).toHaveLength(1);
  });

  it('formats topic name from kebab-case to Title Case', () => {
    const results = [
      createResultWithTopic('network-connectivity', 'domain-1', false),
    ];

    const weakAreas = identifyWeakAreas(results, 0.6);

    expect(weakAreas[0].topicName).toBe('Network Connectivity');
  });

  it('skips questions without topicId', () => {
    const results = [
      createResult({
        isCorrect: false,
        question: createQuestion({ topicId: undefined, domainId: 'domain-1' }),
      }),
    ];

    const weakAreas = identifyWeakAreas(results, 0.6);

    expect(weakAreas).toHaveLength(0);
  });

  it('skips questions without domainId', () => {
    const results = [
      createResult({
        isCorrect: false,
        question: createQuestion({ topicId: 'networking', domainId: undefined }),
      }),
    ];

    const weakAreas = identifyWeakAreas(results, 0.6);

    expect(weakAreas).toHaveLength(0);
  });

  it('returns empty array for empty results', () => {
    const weakAreas = identifyWeakAreas([], 0.6);
    expect(weakAreas).toHaveLength(0);
  });

  it('returns empty array when all answers correct', () => {
    const results = [
      createResultWithTopic('networking', 'domain-1', true),
      createResultWithTopic('security', 'domain-1', true),
    ];

    const weakAreas = identifyWeakAreas(results, 0.6);

    expect(weakAreas).toHaveLength(0);
  });

  it('uses default threshold of 0.6 when not specified', () => {
    const results = [
      createResultWithTopic('topic', 'domain-1', true),
      createResultWithTopic('topic', 'domain-1', false),
    ];

    // 50% correct, should be weak with default 0.6 threshold
    const weakAreas = identifyWeakAreas(results);

    expect(weakAreas).toHaveLength(1);
  });

  it('includes missed questions in weak area', () => {
    const q1 = createQuestion({ id: 'missed-q1', topicId: 'topic', domainId: 'domain-1' });
    const results = [
      createResult({ isCorrect: false, question: q1 }),
    ];

    const weakAreas = identifyWeakAreas(results, 0.6);

    expect(weakAreas[0].missedQuestions).toHaveLength(1);
    expect(weakAreas[0].missedQuestions[0].id).toBe('missed-q1');
  });
});

describe('generateRecommendations', () => {
  it('returns review topics from weak areas', () => {
    const weakAreas = [
      { topicId: 't1', topicName: 'Networking', domainId: 'd1', services: [], incorrectCount: 3, missedQuestions: [] },
      { topicId: 't2', topicName: 'Security', domainId: 'd1', services: [], incorrectCount: 2, missedQuestions: [] },
    ];

    const { reviewTopics } = generateRecommendations([], weakAreas);

    expect(reviewTopics).toEqual(['Networking', 'Security']);
  });

  it('limits review topics to 3', () => {
    const weakAreas = [
      { topicId: 't1', topicName: 'Topic 1', domainId: 'd1', services: [], incorrectCount: 4, missedQuestions: [] },
      { topicId: 't2', topicName: 'Topic 2', domainId: 'd1', services: [], incorrectCount: 3, missedQuestions: [] },
      { topicId: 't3', topicName: 'Topic 3', domainId: 'd1', services: [], incorrectCount: 2, missedQuestions: [] },
      { topicId: 't4', topicName: 'Topic 4', domainId: 'd1', services: [], incorrectCount: 1, missedQuestions: [] },
    ];

    const { reviewTopics } = generateRecommendations([], weakAreas);

    expect(reviewTopics).toHaveLength(3);
    expect(reviewTopics).not.toContain('Topic 4');
  });

  it('suggests transit-gateway lab for Transit Gateway or VPC services', () => {
    const results = [
      createResult({
        isCorrect: false,
        question: createQuestion({ services: ['AWS Transit Gateway'] }),
      }),
    ];

    const { suggestedExperiments } = generateRecommendations(results, []);

    expect(suggestedExperiments).toContain('lab-transit-gateway');
  });

  it('suggests transit-gateway lab for Amazon VPC service', () => {
    const results = [
      createResult({
        isCorrect: false,
        question: createQuestion({ services: ['Amazon VPC'] }),
      }),
    ];

    const { suggestedExperiments } = generateRecommendations(results, []);

    expect(suggestedExperiments).toContain('lab-transit-gateway');
  });

  it('suggests direct-connect lab for Direct Connect service', () => {
    const results = [
      createResult({
        isCorrect: false,
        question: createQuestion({ services: ['AWS Direct Connect'] }),
      }),
    ];

    const { suggestedExperiments } = generateRecommendations(results, []);

    expect(suggestedExperiments).toContain('lab-direct-connect');
  });

  it('does not suggest experiments for correct answers', () => {
    const results = [
      createResult({
        isCorrect: true,
        question: createQuestion({ services: ['AWS Transit Gateway'] }),
      }),
    ];

    const { suggestedExperiments } = generateRecommendations(results, []);

    expect(suggestedExperiments).toHaveLength(0);
  });

  it('returns empty arrays for no weak areas and no incorrect answers', () => {
    const { reviewTopics, suggestedExperiments } = generateRecommendations([], []);

    expect(reviewTopics).toHaveLength(0);
    expect(suggestedExperiments).toHaveLength(0);
  });
});

describe('createAssessmentResult', () => {
  it('composes all functions into complete result', () => {
    const questions = [
      createQuestion({ id: 'q1', correctAnswer: 'A', topicId: 'topic', domainId: 'domain' }),
      createQuestion({ id: 'q2', correctAnswer: 'B', topicId: 'topic', domainId: 'domain' }),
    ];
    const answers: QuestionAnswer[] = [
      { questionId: 'q1', selectedAnswer: 'A', timeSeconds: 30 },
      { questionId: 'q2', selectedAnswer: 'C', timeSeconds: 45 },
    ];

    const result = createAssessmentResult('session-123', questions, answers);

    expect(result.sessionId).toBe('session-123');
    expect(result.score).toBe(50);
    expect(result.correctCount).toBe(1);
    expect(result.totalCount).toBe(2);
    expect(result.timeSeconds).toBe(75);
    expect(result.results).toHaveLength(2);
    expect(result.weakAreas).toBeDefined();
    expect(result.recommendations).toBeDefined();
  });

  it('aggregates total time from all answers', () => {
    const questions = [
      createQuestion({ id: 'q1', correctAnswer: 'A' }),
      createQuestion({ id: 'q2', correctAnswer: 'B' }),
      createQuestion({ id: 'q3', correctAnswer: 'C' }),
    ];
    const answers: QuestionAnswer[] = [
      { questionId: 'q1', selectedAnswer: 'A', timeSeconds: 10 },
      { questionId: 'q2', selectedAnswer: 'B', timeSeconds: 20 },
      { questionId: 'q3', selectedAnswer: 'C', timeSeconds: 30 },
    ];

    const result = createAssessmentResult('session', questions, answers);

    expect(result.timeSeconds).toBe(60);
  });
});
