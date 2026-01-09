-- Add resolved column to weak_areas table if it doesn't exist
-- This was missing from the initial migration

-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we need to check first
-- We use a PRAGMA approach: if the column doesn't exist, the ALTER will succeed
-- If it does exist, we catch the error (handled by the migration system)

-- Add the resolved column
ALTER TABLE weak_areas ADD COLUMN resolved INTEGER DEFAULT 0 CHECK(resolved IN (0, 1));

-- Create index for unresolved weak areas (may already exist)
CREATE INDEX IF NOT EXISTS idx_weak_areas_unresolved ON weak_areas(resolved) WHERE resolved = 0;
