-- Fix corrupted support field in tasks table
-- This script fixes any tasks where the support field is not valid JSON

-- First, let's see which tasks have invalid support field
SELECT task_id, support, LENGTH(support) as support_length
FROM tasks
WHERE support IS NOT NULL 
  AND support != ''
  AND support != '[]'
  AND (
    support NOT LIKE '[%]'
    OR support = ''
    OR TRIM(support) = ''
  );

-- Fix empty or whitespace-only support fields
UPDATE tasks
SET support = '[]'
WHERE support IS NOT NULL 
  AND (
    support = ''
    OR TRIM(support) = ''
  );

-- Fix any remaining invalid JSON in support field
-- This will set them to empty array
UPDATE tasks
SET support = '[]'
WHERE support IS NOT NULL
  AND support != '[]'
  AND (
    support NOT LIKE '[%]'
    OR support NOT LIKE '%]'
  );

-- Verify the fix
SELECT task_id, support
FROM tasks
WHERE support IS NOT NULL
LIMIT 10;

