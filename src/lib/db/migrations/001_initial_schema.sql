-- Initial database schema for SAP-C02 Study Companion
-- Based on SPEC.md database schema

-- User progress per topic
CREATE TABLE IF NOT EXISTS topic_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  mastery_level REAL DEFAULT 0.0,      -- 0.0 to 1.0
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  last_studied_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(domain_id, topic_id)
);

-- Individual question attempts
CREATE TABLE IF NOT EXISTS question_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER,
  mode TEXT NOT NULL,                   -- 'timed' or 'relaxed'
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assessment sessions
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT,                       -- NULL for full assessment
  session_type TEXT NOT NULL,           -- 'initial', 'deep_dive', 'review'
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
  status TEXT NOT NULL,                 -- 'deploying', 'deployed', 'failed', 'destroyed'
  resources_json TEXT,                  -- JSON of deployed resources
  deployed_at DATETIME,
  destroyed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Study sessions (for time tracking)
CREATE TABLE IF NOT EXISTS study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT,
  topic_id TEXT,
  activity_type TEXT NOT NULL,          -- 'study', 'assess', 'experiment'
  duration_seconds INTEGER NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tutor conversations (for context)
CREATE TABLE IF NOT EXISTS tutor_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  context_domain TEXT,
  context_topic TEXT,
  context_question_id TEXT,
  messages_json TEXT NOT NULL,          -- JSON array of messages
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Weak areas identified by assessments
CREATE TABLE IF NOT EXISTS weak_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  service_or_concept TEXT NOT NULL,
  identified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  UNIQUE(domain_id, topic_id, service_or_concept)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_topic_progress_domain ON topic_progress(domain_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question ON question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_topic ON question_attempts(domain_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_domain ON assessment_sessions(domain_id);
CREATE INDEX IF NOT EXISTS idx_weak_areas_unresolved ON weak_areas(resolved_at) WHERE resolved_at IS NULL;
