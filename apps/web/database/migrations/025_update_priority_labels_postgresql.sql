-- ============================================================================
-- Migration 025: Update Priority Labels in Settings Table (PostgreSQL)
-- Description: Update task_priority and bug_priority to use new labels
-- Date: 2025-11-06
-- Database: PostgreSQL
-- ============================================================================

-- Update task_priorities setting with new labels (note: plural form)
-- Old values: IU&I (Important & Urgent), IU&NI (Important & Not Urgent), etc.
-- New values: U&I, NU&I, NI&U, NU&NI
UPDATE settings
SET value = '["U&I", "NU&I", "NI&U", "NU&NI"]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'task_priorities';

-- Update priorities setting with new labels (used for bug priorities)
-- Old values: High, Medium, Low
-- New values: U&I, NU&I, NI&U, NU&NI
UPDATE settings
SET value = '["U&I", "NU&I", "NI&U", "NU&NI"]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'priorities';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check if priority values were updated
SELECT key, value, updated_at
FROM settings
WHERE key IN ('task_priorities', 'priorities');

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
-- SET value = '["IU&I (Important & Urgent)", "IU&NI (Important & Not Urgent)", "NU&I (Not Urgent & Important)", "NU&NI (Not Urgent & Not Important)"]'::jsonb,
--     updated_at = CURRENT_TIMESTAMP
-- WHERE key = 'task_priorities';

-- UPDATE settings
-- SET value = '["High", "Medium", "Low"]'::jsonb,
--     updated_at = CURRENT_TIMESTAMP
-- WHERE key = 'priorities';

-- ============================================================================

