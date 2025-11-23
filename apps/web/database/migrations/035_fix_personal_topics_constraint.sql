-- Migration 035: Fix feed_topics unique constraint for personal topics
-- Date: 2025-11-23
-- Description: Update unique constraint to allow "Saved Posts" (is_personal=true, is_saved=true)
--              to coexist with "Personal Notes" (is_personal=true, is_saved=false)

-- Drop the existing restrictive constraint
DROP INDEX IF EXISTS feed_topics_personal_per_user_unique;

-- Create a new constraint that only applies when is_saved is false
-- This covers "Personal Notes"
CREATE UNIQUE INDEX IF NOT EXISTS feed_topics_personal_per_user_unique 
ON feed_topics (owner_user_id) 
WHERE is_personal = true AND is_saved = false AND deleted_at IS NULL;

-- "Saved Posts" is already covered by feed_topics_saved_per_user_unique (is_saved=true)
-- defined in migration 034.
