-- Migration 013: Ensure timer fields exist in both tasks and bugs tables
-- Description: Safely add timer fields if they don't exist (idempotent migration)
-- Date: 2025-10-29

-- Add timer fields to tasks table if they don't exist
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS timer_state VARCHAR(50),
ADD COLUMN IF NOT EXISTS timer_start_time TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS timer_paused_time BIGINT,
ADD COLUMN IF NOT EXISTS timer_total_time BIGINT,
ADD COLUMN IF NOT EXISTS timer_sessions JSON;

-- Add timer fields to bugs table if they don't exist
ALTER TABLE bugs
ADD COLUMN IF NOT EXISTS timer_state VARCHAR(50),
ADD COLUMN IF NOT EXISTS timer_start_time TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS timer_paused_time BIGINT,
ADD COLUMN IF NOT EXISTS timer_total_time BIGINT,
ADD COLUMN IF NOT EXISTS timer_sessions JSON;

-- Add indexes for timer queries if they don't exist
CREATE INDEX IF NOT EXISTS idx_tasks_timer_state ON tasks(timer_state);
CREATE INDEX IF NOT EXISTS idx_tasks_timer_start_time ON tasks(timer_start_time);
CREATE INDEX IF NOT EXISTS idx_bugs_timer_state ON bugs(timer_state);
CREATE INDEX IF NOT EXISTS idx_bugs_timer_start_time ON bugs(timer_start_time);

