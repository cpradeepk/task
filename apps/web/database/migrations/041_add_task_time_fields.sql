-- Migration 041: Add Task Time Fields (PostgreSQL)
-- Date: 2026-06-10
-- Description: Adds start_time and due_time columns to tasks table for precise warnings and reminders.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time TIME DEFAULT NULL;

-- Create indexes for performance in cron lookups
CREATE INDEX IF NOT EXISTS idx_tasks_start_datetime ON tasks(start_date, start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_end_datetime ON tasks(end_date, due_time);
