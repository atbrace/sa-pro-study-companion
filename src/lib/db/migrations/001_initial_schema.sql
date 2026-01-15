-- Initial database schema for AWS Certification Study Companion

-- User progress per topic
CREATE TABLE IF NOT EXISTS topic_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id TEXT NOT NULL DEFAULT 'sap-c02',
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  mastery_level REAL DEFAULT 0.0,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  last_studied_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, domain_id, topic_id)
);

-- Individual question attempts
CREATE TABLE IF NOT EXISTS question_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id TEXT NOT NULL DEFAULT 'sap-c02',
  question_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER,
  mode TEXT NOT NULL,
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assessment sessions
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id TEXT NOT NULL DEFAULT 'sap-c02',
  domain_id TEXT,
  session_type TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  score_percentage REAL NOT NULL,
  time_taken_seconds INTEGER,
  started_at DATETIME NOT NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Experiment deployments
CREATE TABLE IF NOT EXISTS experiment_deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lab_id TEXT NOT NULL,
  stack_name TEXT NOT NULL,
  status TEXT NOT NULL,
  resources_json TEXT,
  deployed_at DATETIME,
  destroyed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Study sessions (for time tracking)
CREATE TABLE IF NOT EXISTS study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id TEXT NOT NULL DEFAULT 'sap-c02',
  domain_id TEXT,
  topic_id TEXT,
  activity_type TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tutor conversations (for context)
CREATE TABLE IF NOT EXISTS tutor_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  context_exam TEXT DEFAULT 'sap-c02',
  context_domain TEXT,
  context_topic TEXT,
  context_question_id TEXT,
  messages_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Weak areas identified by assessments
CREATE TABLE IF NOT EXISTS weak_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id TEXT NOT NULL DEFAULT 'sap-c02',
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  identified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_attempt_at DATETIME,
  attempts_since_identification INTEGER DEFAULT 0,
  resolved INTEGER DEFAULT 0 CHECK(resolved IN (0, 1)),
  UNIQUE(exam_id, domain_id, topic_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_topic_progress_exam_domain ON topic_progress(exam_id, domain_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_exam ON question_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question ON question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_exam_question ON question_attempts(exam_id, question_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_topic ON question_attempts(domain_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_exam ON assessment_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_domain ON assessment_sessions(domain_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_exam ON study_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_weak_areas_exam ON weak_areas(exam_id);
CREATE INDEX IF NOT EXISTS idx_weak_areas_unresolved ON weak_areas(resolved) WHERE resolved = 0;
