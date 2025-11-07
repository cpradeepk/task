-- Migration 034: Fix feed_topics unique constraint for personal topics
-- Date: 2025-11-07
-- Description: Remove global UNIQUE constraint on topic_name and add composite unique constraint
--              to allow multiple users to have "Personal Notes" and "Saved Posts" topics

-- Drop the existing unique constraint on topic_name
ALTER TABLE feed_topics DROP CONSTRAINT IF EXISTS feed_topics_topic_name_key;

-- Add a composite unique constraint that allows duplicate topic names for personal topics
-- but prevents duplicate public topic names
-- For personal topics (is_personal = true OR is_saved = true), uniqueness is per user
-- For public topics, topic_name must be globally unique

-- Create a partial unique index for public topics (where is_personal = false AND is_saved = false)
CREATE UNIQUE INDEX IF NOT EXISTS feed_topics_public_name_unique 
ON feed_topics (topic_name) 
WHERE (is_personal = false OR is_personal IS NULL) 
  AND (is_saved = false OR is_saved IS NULL)
  AND deleted_at IS NULL;

-- Create a composite unique index for personal topics (per user)
CREATE UNIQUE INDEX IF NOT EXISTS feed_topics_personal_per_user_unique 
ON feed_topics (owner_user_id, is_personal) 
WHERE is_personal = true AND deleted_at IS NULL;

-- Create a composite unique index for saved topics (per user)
CREATE UNIQUE INDEX IF NOT EXISTS feed_topics_saved_per_user_unique 
ON feed_topics (owner_user_id, is_saved) 
WHERE is_saved = true AND deleted_at IS NULL;

-- Note: This allows:
-- 1. Each user to have ONE "Personal Notes" topic (is_personal = true)
-- 2. Each user to have ONE "Saved Posts" topic (is_saved = true)
-- 3. Public topics to have unique names globally

