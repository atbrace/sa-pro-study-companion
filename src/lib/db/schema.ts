// TypeScript type definitions for database schema

export interface TopicProgress {
  id: number;
  domain_id: string;
  topic_id: string;
  mastery_level: number;
  questions_attempted: number;
  questions_correct: number;
  last_studied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionAttempt {
  id: number;
  question_id: string;
  domain_id: string;
  topic_id: string;
  selected_answer: string;
  is_correct: boolean;
  time_taken_seconds: number | null;
  mode: 'timed' | 'relaxed';
  attempted_at: string;
}

export interface AssessmentSession {
  id: number;
  domain_id: string | null;
  session_type: 'initial' | 'deep_dive' | 'review';
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  time_taken_seconds: number | null;
  started_at: string;
  completed_at: string;
}

export interface ExperimentDeployment {
  id: number;
  lab_id: string;
  stack_name: string;
  status: 'deploying' | 'deployed' | 'failed' | 'destroyed';
  resources_json: string | null;
  deployed_at: string | null;
  destroyed_at: string | null;
  created_at: string;
}

export interface StudySession {
  id: number;
  domain_id: string | null;
  topic_id: string | null;
  activity_type: 'study' | 'assess' | 'experiment';
  duration_seconds: number;
  started_at: string;
  ended_at: string;
}

export interface TutorConversation {
  id: number;
  context_domain: string | null;
  context_topic: string | null;
  context_question_id: string | null;
  messages_json: string;
  created_at: string;
  updated_at: string;
}

export interface WeakArea {
  id: number;
  domain_id: string;
  topic_id: string;
  service_or_concept: string;
  identified_at: string;
  resolved_at: string | null;
}
