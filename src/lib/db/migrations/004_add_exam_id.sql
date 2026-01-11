-- Add exam_id column to support multiple exams
-- Default value 'sap-c02' preserves existing data

-- Step 1: Add exam_id to topic_progress
-- SQLite requires recreating table to modify unique constraint
CREATE TABLE IF NOT EXISTS topic_progress_new (
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

INSERT INTO topic_progress_new (id, exam_id, domain_id, topic_id, mastery_level, questions_attempted, questions_correct, last_studied_at, created_at, updated_at)
SELECT id, 'sap-c02', domain_id, topic_id, mastery_level, questions_attempted, questions_correct, last_studied_at, created_at, updated_at
FROM topic_progress;

DROP TABLE topic_progress;
ALTER TABLE topic_progress_new RENAME TO topic_progress;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_topic_progress_exam_domain ON topic_progress(exam_id, domain_id);

-- Step 2: Add exam_id to question_attempts
ALTER TABLE question_attempts ADD COLUMN exam_id TEXT NOT NULL DEFAULT 'sap-c02';
CREATE INDEX IF NOT EXISTS idx_question_attempts_exam ON question_attempts(exam_id);

-- Step 3: Add exam_id to assessment_sessions
ALTER TABLE assessment_sessions ADD COLUMN exam_id TEXT NOT NULL DEFAULT 'sap-c02';
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_exam ON assessment_sessions(exam_id);

-- Step 4: Add exam_id to weak_areas
-- SQLite requires recreating table to modify unique constraint
CREATE TABLE IF NOT EXISTS weak_areas_new (
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

INSERT INTO weak_areas_new (id, exam_id, domain_id, topic_id, identified_at, last_attempt_at, attempts_since_identification, resolved)
SELECT id, 'sap-c02', domain_id, topic_id, identified_at, last_attempt_at, attempts_since_identification, resolved
FROM weak_areas;

DROP TABLE weak_areas;
ALTER TABLE weak_areas_new RENAME TO weak_areas;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_weak_areas_exam ON weak_areas(exam_id);
CREATE INDEX IF NOT EXISTS idx_weak_areas_unresolved ON weak_areas(resolved) WHERE resolved = 0;

-- Step 5: Add context_exam to tutor_conversations
ALTER TABLE tutor_conversations ADD COLUMN context_exam TEXT DEFAULT 'sap-c02';

-- Step 6: Add exam_id to study_sessions
ALTER TABLE study_sessions ADD COLUMN exam_id TEXT NOT NULL DEFAULT 'sap-c02';
CREATE INDEX IF NOT EXISTS idx_study_sessions_exam ON study_sessions(exam_id);
