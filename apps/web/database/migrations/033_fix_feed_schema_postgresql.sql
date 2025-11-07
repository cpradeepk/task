-- Migration 033: Fix Feed Tables Schema (PostgreSQL)
-- Date: 2025-11-07
-- Description: Adds missing columns and fixes schema mismatches in feed tables

-- Fix feed_posts table
-- Add missing columns
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS title VARCHAR(500);
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);

-- Rename columns to match API expectations
-- user_id -> created_by (if not already added)
-- content_url -> link_url (for links)
-- content_text -> content (for text content)
-- description -> content (merge if needed)

-- Drop old columns that are no longer needed
ALTER TABLE feed_posts DROP COLUMN IF EXISTS content_url;
ALTER TABLE feed_posts DROP COLUMN IF EXISTS content_text;
ALTER TABLE feed_posts DROP COLUMN IF EXISTS description;

-- Update user_id to created_by if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feed_posts' AND column_name = 'user_id'
  ) THEN
    -- Copy data from user_id to created_by if created_by is empty
    UPDATE feed_posts SET created_by = user_id WHERE created_by IS NULL;
    -- Drop user_id column
    ALTER TABLE feed_posts DROP COLUMN user_id;
  END IF;
END $$;

-- Fix feed_reactions table - add deleted_at column
ALTER TABLE feed_reactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Create index for deleted_at
CREATE INDEX IF NOT EXISTS idx_feed_reactions_deleted ON feed_reactions(deleted_at);

-- Fix feed_comments table - rename columns to match API expectations
ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);
ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS content TEXT;

-- Migrate data from old columns to new columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feed_comments' AND column_name = 'user_id'
  ) THEN
    -- Copy data from user_id to created_by if created_by is empty
    UPDATE feed_comments SET created_by = user_id WHERE created_by IS NULL;
    -- Copy data from comment_text to content if content is empty
    UPDATE feed_comments SET content = comment_text WHERE content IS NULL;
    -- Drop old columns
    ALTER TABLE feed_comments DROP COLUMN user_id;
    ALTER TABLE feed_comments DROP COLUMN comment_text;
  END IF;
END $$;

-- Fix feed_post_topics table - add created_by column
ALTER TABLE feed_post_topics ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);

-- Migration complete
SELECT 'Feed schema fixed successfully!' AS status;

