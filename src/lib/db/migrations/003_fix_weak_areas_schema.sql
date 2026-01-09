-- Fix weak_areas table schema
-- The old schema had service_or_concept column and 3-column unique constraint
-- New schema uses just domain_id + topic_id

-- Create new table with correct schema
CREATE TABLE IF NOT EXISTS weak_areas_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  identified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_attempt_at DATETIME,
  attempts_since_identification INTEGER DEFAULT 0,
  resolved INTEGER DEFAULT 0 CHECK(resolved IN (0, 1)),
  UNIQUE(domain_id, topic_id)
);

-- Copy data from old table (if any exists), taking first record per domain_id/topic_id
INSERT OR IGNORE INTO weak_areas_new (domain_id, topic_id, identified_at, resolved)
SELECT domain_id, topic_id, MIN(identified_at), 0
FROM weak_areas
GROUP BY domain_id, topic_id;

-- Drop old table
DROP TABLE IF EXISTS weak_areas;

-- Rename new table
ALTER TABLE weak_areas_new RENAME TO weak_areas;

-- Create index for unresolved weak areas
CREATE INDEX IF NOT EXISTS idx_weak_areas_unresolved ON weak_areas(resolved) WHERE resolved = 0;
