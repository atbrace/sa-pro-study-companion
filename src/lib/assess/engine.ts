import type { Question } from '@/types/domain';
import type { QuestionAnswer, QuestionResult, WeakArea, AssessmentResult } from '@/types/assessment';

/**
 * Check if a single answer is correct
 */
export function isAnswerCorrect(question: Question, answer: string | string[]): boolean {
  if (question.type === 'multi') {
    if (!Array.isArray(answer) || !Array.isArray(question.correctAnswer)) {
      return false;
    }
    return (
      answer.length === question.correctAnswer.length &&
      answer.every(ans => question.correctAnswer.includes(ans))
    );
  }

  return question.correctAnswer === answer;
}

/**
 * Score a completed assessment
 */
export function scoreAssessment(
  questions: Question[],
  answers: QuestionAnswer[]
): QuestionResult[] {
  const results: QuestionResult[] = [];

  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (!question) continue;

    const isCorrect = isAnswerCorrect(question, answer.selectedAnswer);

    results.push({
      questionId: question.id,
      question,
      selectedAnswer: answer.selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      explanation: question.explanation,
      awsDocLink: question.awsDocLink,
      timeSeconds: answer.timeSeconds,
    });
  }

  return results;
}

/**
 * Calculate overall score percentage
 */
export function calculateScore(results: QuestionResult[]): number {
  if (results.length === 0) return 0;
  const correct = results.filter(r => r.isCorrect).length;
  return Math.round((correct / results.length) * 100);
}

/**
 * Identify weak areas from incorrect answers
 */
export function identifyWeakAreas(
  results: QuestionResult[],
  threshold: number = 0.6
): WeakArea[] {
  const topicMap = new Map<string, {
    services: Set<string>;
    total: number;
    incorrect: number;
  }>();

  // Group by topic (from question metadata)
  for (const result of results) {
    // For now, we'll group by services since we don't have topic metadata in questions
    // In a real implementation, questions would have topicId
    if (!result.isCorrect) {
      for (const service of result.question.services) {
        if (!topicMap.has(service)) {
          topicMap.set(service, {
            services: new Set([service]),
            total: 0,
            incorrect: 0,
          });
        }
        const data = topicMap.get(service)!;
        data.total++;
        data.incorrect++;
      }
    } else {
      for (const service of result.question.services) {
        if (!topicMap.has(service)) {
          topicMap.set(service, {
            services: new Set([service]),
            total: 0,
            incorrect: 0,
          });
        }
        const data = topicMap.get(service)!;
        data.total++;
      }
    }
  }

  // Filter topics below threshold
  const weakAreas: WeakArea[] = [];
  Array.from(topicMap.entries()).forEach(([topicId, data]) => {
    const score = (data.total - data.incorrect) / data.total;
    if (score < threshold && data.incorrect > 0) {
      weakAreas.push({
        topicId,
        topicName: topicId,
        services: Array.from(data.services),
        incorrectCount: data.incorrect,
      });
    }
  });

  return weakAreas.sort((a, b) => b.incorrectCount - a.incorrectCount);
}

/**
 * Generate recommendations based on assessment results
 */
export function generateRecommendations(
  results: QuestionResult[],
  weakAreas: WeakArea[]
): {
  reviewTopics: string[];
  suggestedExperiments: string[];
} {
  // Topics to review (from weak areas)
  const reviewTopics = weakAreas.slice(0, 3).map(wa => wa.topicName);

  // Suggest experiments based on incorrect answers
  const experimentServices = new Set<string>();
  for (const result of results) {
    if (!result.isCorrect) {
      result.question.services.forEach(s => experimentServices.add(s));
    }
  }

  // Map services to suggested experiments (simplified for now)
  const suggestedExperiments: string[] = [];
  if (experimentServices.has('AWS Transit Gateway') || experimentServices.has('Amazon VPC')) {
    suggestedExperiments.push('lab-transit-gateway');
  }
  if (experimentServices.has('AWS Direct Connect')) {
    suggestedExperiments.push('lab-direct-connect');
  }

  return {
    reviewTopics,
    suggestedExperiments,
  };
}

/**
 * Create a full assessment result
 */
export function createAssessmentResult(
  sessionId: string,
  questions: Question[],
  answers: QuestionAnswer[]
): AssessmentResult {
  const results = scoreAssessment(questions, answers);
  const score = calculateScore(results);
  const correctCount = results.filter(r => r.isCorrect).length;
  const totalTime = answers.reduce((sum, a) => sum + a.timeSeconds, 0);
  const weakAreas = identifyWeakAreas(results);
  const recommendations = generateRecommendations(results, weakAreas);

  return {
    sessionId,
    score,
    correctCount,
    totalCount: results.length,
    timeSeconds: totalTime,
    results,
    weakAreas,
    recommendations,
  };
}
