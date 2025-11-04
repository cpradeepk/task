-- Migration 018: Add name field to tasks table
-- Date: 2025-01-04
-- Purpose: Add a short name/title field to tasks to fix description overflow issues
--          and improve task list display

-- Step 1: Add name column to tasks table (before description column)
-- Using VARCHAR(150) to match the feature field in bugs table
ALTER TABLE tasks 
ADD COLUMN name VARCHAR(150);

-- Step 2: Populate name field from existing description
-- Truncate at word boundaries with "..." for descriptions longer than 147 characters
UPDATE tasks
SET name = CASE
    WHEN LENGTH(description) <= 150 THEN description
    WHEN POSITION(' ' IN SUBSTRING(description FROM 148)) > 0 THEN
        SUBSTRING(description FROM 1 FOR 147 + POSITION(' ' IN SUBSTRING(description FROM 148))) || '...'
    ELSE
        SUBSTRING(description FROM 1 FOR 147) || '...'
END
WHERE name IS NULL;

-- Step 3: Make name column NOT NULL after populating data
ALTER TABLE tasks 
ALTER COLUMN name SET NOT NULL;

-- Step 4: Add check constraint for minimum length (3 characters)
ALTER TABLE tasks
ADD CONSTRAINT tasks_name_min_length CHECK (LENGTH(TRIM(name)) >= 3);

-- Step 5: Add index on name for faster searching
CREATE INDEX idx_tasks_name ON tasks(name);

-- Verification queries (run these manually to verify migration)
-- SELECT task_id, name, SUBSTRING(description, 1, 50) as description_preview FROM tasks LIMIT 10;
-- SELECT COUNT(*) as total_tasks, COUNT(name) as tasks_with_name FROM tasks;

