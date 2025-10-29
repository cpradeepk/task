-- Migration 012: Add timer fields to bugs table
-- Description: Add timer tracking fields to bugs table to support time tracking functionality
-- Date: 2025-10-29

-- Add timer fields to bugs table
ALTER TABLE bugs
ADD COLUMN timer_state VARCHAR(50) AFTER actual_hours,
ADD COLUMN timer_start_time TIMESTAMP NULL AFTER timer_state,
ADD COLUMN timer_paused_time BIGINT AFTER timer_start_time,
ADD COLUMN timer_total_time BIGINT AFTER timer_paused_time,
ADD COLUMN timer_sessions JSON AFTER timer_total_time;

-- Add indexes for timer queries
CREATE INDEX idx_timer_state ON bugs(timer_state);
CREATE INDEX idx_timer_start_time ON bugs(timer_start_time);

