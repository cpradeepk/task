-- Migration 034: Create Feed Mentions Table (PostgreSQL)
-- Date: 2025-11-07
-- Description: Creates table for tracking @mentions in feed posts and comments

-- Feed Mentions Table
CREATE TABLE IF NOT EXISTS feed_mentions (
  id SERIAL PRIMARY KEY,
  mention_id VARCHAR(100) UNIQUE NOT NULL, -- format: 'MENTION-{timestamp}-{random}'
  post_id VARCHAR(100), -- references feed_posts.post_id (NULL if mention is in comment)
  comment_id VARCHAR(100), -- references feed_comments.comment_id (NULL if mention is in post)
  mentioned_user_id VARCHAR(50) NOT NULL, -- references users.employee_id (the user being mentioned)
  mentioned_by_user_id VARCHAR(50) NOT NULL, -- references users.employee_id (the user who mentioned)
  mention_text VARCHAR(255) NOT NULL, -- the actual mention text (e.g., "@john.doe")
  context_text TEXT, -- surrounding text for context (optional)
  is_read BOOLEAN DEFAULT false, -- whether the mentioned user has seen the mention
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(50) NULL,
  
  -- Constraints
  CONSTRAINT chk_post_or_comment CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Create indexes for feed_mentions
CREATE INDEX IF NOT EXISTS idx_feed_mentions_post ON feed_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_mentions_comment ON feed_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_feed_mentions_mentioned_user ON feed_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_feed_mentions_mentioned_by ON feed_mentions(mentioned_by_user_id);
CREATE INDEX IF NOT EXISTS idx_feed_mentions_is_read ON feed_mentions(is_read);
CREATE INDEX IF NOT EXISTS idx_feed_mentions_created_at ON feed_mentions(created_at);
CREATE INDEX IF NOT EXISTS idx_feed_mentions_deleted ON feed_mentions(deleted_at);

-- Add comment for documentation
COMMENT ON TABLE feed_mentions IS 'Stores @mentions in feed posts and comments for notification purposes';
COMMENT ON COLUMN feed_mentions.post_id IS 'References feed_posts.post_id if mention is in a post';
COMMENT ON COLUMN feed_mentions.comment_id IS 'References feed_comments.comment_id if mention is in a comment';
COMMENT ON COLUMN feed_mentions.mentioned_user_id IS 'The user who was mentioned (@username)';
COMMENT ON COLUMN feed_mentions.mentioned_by_user_id IS 'The user who created the mention';
COMMENT ON COLUMN feed_mentions.is_read IS 'Whether the mentioned user has seen/read the mention';

