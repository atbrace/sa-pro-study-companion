-- AWS SAP-C02 Study Companion Database Schema

-- Domains table
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  weight INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  name TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  estimated_study_time INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (domain_id) REFERENCES domains(id)
);

-- Topic progress tracking
CREATE TABLE IF NOT EXISTS topic_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  mastery_level REAL DEFAULT 0.0,
  last_studied DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(domain_id, topic_id),
  FOREIGN KEY (domain_id) REFERENCES domains(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

-- Assessment sessions
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('timed', 'relaxed')),
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  score_percentage REAL NOT NULL,
  time_taken INTEGER,
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (domain_id) REFERENCES domains(id)
);

-- Individual question attempts
CREATE TABLE IF NOT EXISTS question_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct INTEGER NOT NULL CHECK(is_correct IN (0, 1)),
  time_taken INTEGER,
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id),
  FOREIGN KEY (domain_id) REFERENCES domains(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

-- Tutor conversations
CREATE TABLE IF NOT EXISTS tutor_conversations (
  id TEXT PRIMARY KEY,
  domain_id TEXT,
  topic_id TEXT,
  question_id TEXT,
  user_message TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  context TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (domain_id) REFERENCES domains(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

-- Weak areas identification
CREATE TABLE IF NOT EXISTS weak_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  identified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_attempt_at DATETIME,
  attempts_since_identification INTEGER DEFAULT 0,
  resolved INTEGER DEFAULT 0 CHECK(resolved IN (0, 1)),
  UNIQUE(domain_id, topic_id),
  FOREIGN KEY (domain_id) REFERENCES domains(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

-- User preferences and settings
CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Study streaks tracking
CREATE TABLE IF NOT EXISTS study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL UNIQUE,
  minutes_studied INTEGER DEFAULT 0,
  topics_reviewed INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_topic_progress_domain ON topic_progress(domain_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_topic ON topic_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_domain ON assessment_sessions(domain_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_session ON question_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_topic ON question_attempts(topic_id);
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_domain ON tutor_conversations(domain_id);
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_topic ON tutor_conversations(topic_id);
CREATE INDEX IF NOT EXISTS idx_weak_areas_domain ON weak_areas(domain_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(date);
