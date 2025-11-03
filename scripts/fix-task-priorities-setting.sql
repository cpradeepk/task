-- ============================================================================
-- Fix: Update task_priorities setting to match database constraint
-- Issue: Settings table had abbreviated values (I&U, I&NU, etc.)
--        but database constraint expects full text (IU&I (Important & Urgent), etc.)
-- Date: 2025-11-03
-- ============================================================================

-- Update task_priorities setting with correct values that match the check constraint
UPDATE settings
SET value = '["IU&I (Important & Urgent)", "IU&NI (Important & Not Urgent)", "NU&I (Not Urgent & Important)", "NU&NI (Not Urgent & Not Important)"]'
WHERE key = 'task_priorities';

-- Verify the update
SELECT id, key, value, is_active
FROM settings
WHERE key = 'task_priorities';

