// Assessment type definitions

import type { Question } from './domain';

export interface QuestionAnswer {
  questionId: string;
  selectedAnswer: string | string[];
  timeSeconds: number;
  isCorrect?: boolean;
}

export interface AssessmentSubmission {
  sessionId: string;
  examId?: string;
  domainId?: string;
  topicId?: string;
  answers: QuestionAnswer[];
  mode: 'timed' | 'relaxed';
}

export interface QuestionResult {
  questionId: string;
  question: Question;
  selectedAnswer: string | string[];
  correctAnswer: string | string[];
  isCorrect: boolean;
  explanation: string;
  awsDocLink?: string;
  timeSeconds: number;
}

export interface WeakArea {
  domainId: string;
  topicId: string;
  topicName: string;
  services: string[];
  incorrectCount: number;
  missedQuestions: Question[];
}

export interface AssessmentResult {
  sessionId: string;
  score: number;
  correctCount: number;
  totalCount: number;
  timeSeconds: number;
  results: QuestionResult[];
  weakAreas: WeakArea[];
  recommendations: {
    reviewTopics: string[];
    suggestedExperiments: string[];
  };
}

export interface AssessmentSession {
  id: string;
  domainId?: string;
  topicId?: string;
  questions: Question[];
  mode: 'timed' | 'relaxed';
  startedAt: Date;
}
