-- Migration 003: Remove experiment_deployments table (no longer needed)

-- Drop indexes first
DROP INDEX IF EXISTS idx_experiment_deployments_lab;
DROP INDEX IF EXISTS idx_experiment_deployments_status;

-- Drop the table
DROP TABLE IF EXISTS experiment_deployments;
