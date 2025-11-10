-- Migration 024: Add Collapsible Text Settings
-- Description: Add settings for controlling collapsible text behavior across different pages/components
-- Created: 2025-11-10

-- ============================================================================
-- Collapsible Text Configuration Settings
-- ============================================================================

-- Setting 1: Collapse thresholds for different components
-- This setting controls when text should be collapsed (character and line limits)
INSERT INTO settings (`key`, value, description, metadata, is_active, created_by, created_at, updated_at)
VALUES (
  'collapsible_text_thresholds',
  JSON_OBJECT(
    'bug_description', JSON_OBJECT('maxCharacters', 300, 'maxLines', 5),
    'task_description', JSON_OBJECT('maxCharacters', 300, 'maxLines', 5),
    'activity_description', JSON_OBJECT('maxCharacters', 300, 'maxLines', 5),
    'comment_description', JSON_OBJECT('maxCharacters', 300, 'maxLines', 5),
    'prompt_description', JSON_OBJECT('maxCharacters', 300, 'maxLines', 5),
    'default', JSON_OBJECT('maxCharacters', 300, 'maxLines', 5)
  ),
  'Collapse thresholds for different text components. Each component can have custom maxCharacters and maxLines values.',
  JSON_OBJECT(
    'type', 'object',
    'editable', true,
    'category', 'ui_behavior',
    'components', JSON_ARRAY('bug_description', 'task_description', 'activity_description', 'comment_description', 'prompt_description', 'default')
  ),
  TRUE,
  'system',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  value = JSON_OBJECT(
    'bug_description', JSON_OBJECT('maxCharacters', 300, 'maxLines', 5),
    'task_description', JSON_OBJECT('maxCharacters', 300, 'maxLines', 5),
    'activity_description', JSON_OBJECT('maxCharacters', 300, 'maxLines', 5),
    'comment_description', JSON_OBJECT('maxCharacters', 300, 'maxLines', 5),
    'prompt_description', JSON_OBJECT('maxCharacters', 300, 'maxLines', 5),
    'default', JSON_OBJECT('maxCharacters', 300, 'maxLines', 5)
  ),
  updated_at = NOW();

-- Setting 2: Persist expanded state preference
-- This setting controls whether the expanded/collapsed state should be remembered
INSERT INTO settings (`key`, value, description, metadata, is_active, created_by, created_at, updated_at)
VALUES (
  'collapsible_text_persist_state',
  JSON_OBJECT(
    'bug_description', false,
    'task_description', false,
    'activity_description', false,
    'comment_description', false,
    'prompt_description', false,
    'default', false
  ),
  'Controls whether expanded/collapsed state should persist in localStorage for different components. Set to true to remember user preference.',
  JSON_OBJECT(
    'type', 'object',
    'editable', true,
    'category', 'ui_behavior',
    'components', JSON_ARRAY('bug_description', 'task_description', 'activity_description', 'comment_description', 'prompt_description', 'default')
  ),
  TRUE,
  'system',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  value = JSON_OBJECT(
    'bug_description', false,
    'task_description', false,
    'activity_description', false,
    'comment_description', false,
    'prompt_description', false,
    'default', false
  ),
  updated_at = NOW();

-- Setting 3: UI customization options
-- This setting controls visual aspects of the collapsible text component
INSERT INTO settings (`key`, value, description, metadata, is_active, created_by, created_at, updated_at)
VALUES (
  'collapsible_text_ui_options',
  JSON_OBJECT(
    'showGradient', true,
    'gradientColor', 'white',
    'buttonPosition', 'right',
    'showLineCount', true
  ),
  'UI customization options for collapsible text components. Controls gradient overlay, button position, and line count display.',
  JSON_OBJECT(
    'type', 'object',
    'editable', true,
    'category', 'ui_appearance',
    'options', JSON_OBJECT(
      'showGradient', JSON_OBJECT('type', 'boolean', 'default', true),
      'gradientColor', JSON_OBJECT('type', 'string', 'default', 'white', 'options', JSON_ARRAY('white', 'gray-50', 'blue-50')),
      'buttonPosition', JSON_OBJECT('type', 'string', 'default', 'right', 'options', JSON_ARRAY('left', 'right')),
      'showLineCount', JSON_OBJECT('type', 'boolean', 'default', true)
    )
  ),
  TRUE,
  'system',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  value = JSON_OBJECT(
    'showGradient', true,
    'gradientColor', 'white',
    'buttonPosition', 'right',
    'showLineCount', true
  ),
  updated_at = NOW();

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify the settings were created:
-- SELECT * FROM settings WHERE `key` LIKE 'collapsible_text%';

-- ============================================================================
-- Example Usage in Code
-- ============================================================================
-- // Fetch thresholds for a specific component
-- const thresholds = await getSettingValue('collapsible_text_thresholds', {})
-- const bugThresholds = thresholds.bug_description || thresholds.default
-- 
-- // Fetch persist state preference
-- const persistState = await getSettingValue('collapsible_text_persist_state', {})
-- const shouldPersist = persistState.activity_description || persistState.default
-- 
-- // Fetch UI options
-- const uiOptions = await getSettingValue('collapsible_text_ui_options', {})
-- const { showGradient, buttonPosition } = uiOptions

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- DELETE FROM settings WHERE `key` IN (
--   'collapsible_text_thresholds',
--   'collapsible_text_persist_state',
--   'collapsible_text_ui_options'
-- );

