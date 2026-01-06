-- Migration 002: Update experiment_deployments table to match API expectations

-- Drop the old table
DROP TABLE IF EXISTS experiment_deployments;

-- Create the new table with correct schema
CREATE TABLE experiment_deployments (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('deploying', 'deployed', 'destroying', 'destroyed', 'failed')),
  stack_name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'us-east-1',
  resource_arns TEXT,
  console_urls TEXT,
  outputs TEXT,
  error_message TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  destroyed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_experiment_deployments_lab ON experiment_deployments(lab_id);
CREATE INDEX IF NOT EXISTS idx_experiment_deployments_status ON experiment_deployments(status);
