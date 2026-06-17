-- Migration: Add meeting link and meeting reminder to tasks table
-- Date: 2026-06-16

ALTER TABLE tasks ADD COLUMN meeting_link VARCHAR(1000) NULL;
ALTER TABLE tasks ADD COLUMN meeting_reminder BOOLEAN DEFAULT FALSE;
