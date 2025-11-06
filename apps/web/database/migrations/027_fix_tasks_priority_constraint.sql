-- Migration 027: Fix tasks_priority_check Constraint
-- Date: 2025-11-06
-- Description: Update tasks priority constraint to allow new Eisenhower Matrix values
-- Issue: Task creation fails with "violates check constraint tasks_priority_check"
-- Old values: IU&I (Important & Urgent), IU&NI (Important & Not Urgent), NU&I (Not Urgent & Important), NU&NI (Not Urgent & Not Important)
-- New values: U&I, NU&I, NI&U, NU&NI

-- Step 1: Drop the old constraint FIRST (to allow updates)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

-- Step 2: Update existing data to use new priority values
UPDATE tasks SET priority = 'U&I' WHERE priority = 'IU&I (Important & Urgent)';
UPDATE tasks SET priority = 'NI&U' WHERE priority = 'IU&NI (Important & Not Urgent)';
UPDATE tasks SET priority = 'NU&I' WHERE priority = 'NU&I (Not Urgent & Important)';
UPDATE tasks SET priority = 'NU&NI' WHERE priority = 'NU&NI (Not Urgent & Not Important)';

-- Step 3: Add the new constraint with updated priority values
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
  CHECK (
    priority IS NULL OR
    priority IN ('U&I', 'NU&I', 'NI&U', 'NU&NI', '')
  );

-- Verify the constraint was created
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'tasks_priority_check';

