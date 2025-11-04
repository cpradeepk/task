-- Migration 022: Add name field to tasks table (PostgreSQL version)
-- Date: 2025-01-04
-- Purpose: Add a short name/title field to tasks to fix description overflow issues
--          and improve task list display
-- Database: PostgreSQL (Supabase)

-- Step 1: Add name column to tasks table (if it doesn't exist)
-- Using VARCHAR(150) to match the feature field in bugs table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'name'
    ) THEN
        ALTER TABLE tasks 
        ADD COLUMN name VARCHAR(150);
        
        RAISE NOTICE 'Column "name" added to tasks table';
    ELSE
        RAISE NOTICE 'Column "name" already exists in tasks table';
    END IF;
END $$;

-- Step 2: Populate name field from existing description (only for NULL values)
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
DO $$
BEGIN
    -- Check if column is already NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'name' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE tasks 
        ALTER COLUMN name SET NOT NULL;
        
        RAISE NOTICE 'Column "name" set to NOT NULL';
    ELSE
        RAISE NOTICE 'Column "name" is already NOT NULL';
    END IF;
END $$;

-- Step 4: Add check constraint for minimum length (3 characters)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'tasks' AND constraint_name = 'tasks_name_min_length'
    ) THEN
        ALTER TABLE tasks
        ADD CONSTRAINT tasks_name_min_length CHECK (LENGTH(TRIM(name)) >= 3);
        
        RAISE NOTICE 'Check constraint "tasks_name_min_length" added';
    ELSE
        RAISE NOTICE 'Check constraint "tasks_name_min_length" already exists';
    END IF;
END $$;

-- Step 5: Add index on name for faster searching
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'tasks' AND indexname = 'idx_tasks_name'
    ) THEN
        CREATE INDEX idx_tasks_name ON tasks(name);
        
        RAISE NOTICE 'Index "idx_tasks_name" created';
    ELSE
        RAISE NOTICE 'Index "idx_tasks_name" already exists';
    END IF;
END $$;

-- Verification queries (run these manually to verify migration)
-- SELECT task_id, name, SUBSTRING(description, 1, 50) as description_preview FROM tasks LIMIT 10;
-- SELECT COUNT(*) as total_tasks, COUNT(name) as tasks_with_name FROM tasks;

