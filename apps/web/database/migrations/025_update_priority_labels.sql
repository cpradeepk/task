-- ============================================================================
-- Migration 025: Update Priority Labels in Settings Table
-- Description: Update task_priority and bug_priority to use new labels
-- Date: 2025-11-06
-- Database: MySQL/PostgreSQL
-- ============================================================================

-- Update task_priority setting with new labels
-- Old values: Critical, High, Medium, Low (or similar)
-- New values: U&I, NU&I, NI&U, NU&NI
UPDATE settings
SET value = '["U&I", "NU&I", "NI&U", "NU&NI"]',
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'task_priority';

-- Update bug_priority setting with new labels
-- Old values: Critical, High, Medium, Low (or similar)
-- New values: U&I, NU&I, NI&U, NU&NI
UPDATE settings
SET value = '["U&I", "NU&I", "NI&U", "NU&NI"]',
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'bug_priority';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check if priority values were updated
SELECT key, value, updated_at
FROM settings
WHERE key IN ('task_priority', 'bug_priority');

-- ============================================================================
-- Priority Label Meanings
-- ============================================================================

-- U&I   = Urgent & Important
-- NU&I  = Not Urgent & Important
-- NI&U  = Not Important & Urgent
-- NU&NI = Not Urgent & Not Important

-- These labels follow the Eisenhower Matrix prioritization framework:
-- 1. U&I (Urgent & Important) - Do first, highest priority
-- 2. NU&I (Not Urgent & Important) - Schedule, plan ahead
-- 3. NI&U (Not Important & Urgent) - Delegate if possible
-- 4. NU&NI (Not Urgent & Not Important) - Eliminate or do last

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- To rollback to old priority labels (example):
-- UPDATE settings
-- SET value = '["Critical", "High", "Medium", "Low"]',
--     updated_at = CURRENT_TIMESTAMP
-- WHERE key = 'task_priority';

-- UPDATE settings
-- SET value = '["Critical", "High", "Medium", "Low"]',
--     updated_at = CURRENT_TIMESTAMP
-- WHERE key = 'bug_priority';

-- ============================================================================

