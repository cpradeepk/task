-- Migration 017: Add icon metadata to settings table
-- This migration adds icon mappings to the metadata field for dropdown settings

-- Update severities with icon metadata
UPDATE settings 
SET metadata = JSON_OBJECT(
  'icons', JSON_OBJECT(
    'Critical', '🔴',
    'Major', '🟠',
    'Minor', '🟡'
  )
)
WHERE `key` = 'severities';

-- Update categories with icon metadata
UPDATE settings 
SET metadata = JSON_OBJECT(
  'icons', JSON_OBJECT(
    'UI', '🎨',
    'API', '🔌',
    'Backend', '⚙️',
    'Performance', '⚡',
    'Security', '🔒',
    'Database', '🗄️',
    'Integration', '🔗',
    'Other', '📋'
  )
)
WHERE `key` = 'categories';

-- Update platforms with icon metadata
UPDATE settings 
SET metadata = JSON_OBJECT(
  'icons', JSON_OBJECT(
    'Web', '🌐',
    'iOS', '📱',
    'Android', '🤖',
    'All', '🔄'
  )
)
WHERE `key` = 'platforms';

-- Update environments with icon metadata
UPDATE settings 
SET metadata = JSON_OBJECT(
  'icons', JSON_OBJECT(
    'Production', '🚀',
    'Staging', '🧪',
    'UAT', '🔍',
    'Development', '💻'
  )
)
WHERE `key` = 'environments';

-- Update bug_types with icon metadata
UPDATE settings 
SET metadata = JSON_OBJECT(
  'icons', JSON_OBJECT(
    'testcase', '🧪',
    'feature', '✨',
    'other', '📋'
  )
)
WHERE `key` = 'bug_types';

-- Update task_statuses with icon metadata
UPDATE settings 
SET metadata = JSON_OBJECT(
  'icons', JSON_OBJECT(
    'Not Started', '⚪',
    'In Progress', '🔵',
    'On Hold', '🟡',
    'Done', '🟢',
    'Cancelled', '🔴',
    'Blocked', '🚫',
    'Review', '👀',
    'Testing', '🧪'
  )
)
WHERE `key` = 'task_statuses';

-- Update bug_statuses with icon metadata
UPDATE settings 
SET metadata = JSON_OBJECT(
  'icons', JSON_OBJECT(
    'New', '🆕',
    'In Progress', '🔵',
    'Resolved', '✅',
    'Closed', '🔒',
    'Reopened', '🔄'
  )
)
WHERE `key` = 'bug_statuses';

-- Update task_priorities with icon metadata (Eisenhower Matrix)
UPDATE settings 
SET metadata = JSON_OBJECT(
  'icons', JSON_OBJECT(
    'IU&I (Important & Urgent)', '🔴',
    'IU&NI (Important & Not Urgent)', '🟠',
    'NU&I (Not Urgent & Important)', '🟡',
    'NU&NI (Not Urgent & Not Important)', '⚪'
  )
)
WHERE `key` = 'task_priorities';

-- Verify the updates
SELECT 
  `key`,
  value,
  metadata,
  description
FROM settings
WHERE metadata IS NOT NULL
ORDER BY `key`;

