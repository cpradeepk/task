-- Migration 032: Create Feed Feature Tables (PostgreSQL)
-- Date: 2025-11-07
-- Description: Creates all tables required for the social feed feature

-- 1. Feed Topics Table
CREATE TABLE IF NOT EXISTS feed_topics (
  id SERIAL PRIMARY KEY,
  topic_name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- emoji or Lucide icon name
  display_order INTEGER DEFAULT 0,
  is_personal BOOLEAN DEFAULT false, -- true for Personal Notes
  is_saved BOOLEAN DEFAULT false, -- true for Saved Posts
  owner_user_id VARCHAR(50), -- NULL for public, user_id for personal/saved
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50) NOT NULL,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(50) NULL
);

-- Create indexes for feed_topics
CREATE INDEX IF NOT EXISTS idx_feed_topics_owner ON feed_topics(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_feed_topics_deleted ON feed_topics(deleted_at);
CREATE INDEX IF NOT EXISTS idx_feed_topics_display_order ON feed_topics(display_order);

-- 2. Feed Posts Table
CREATE TABLE IF NOT EXISTS feed_posts (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR(100) UNIQUE NOT NULL, -- format: 'POST-{timestamp}-{random}'
  user_id VARCHAR(50) NOT NULL, -- references users.employee_id
  content_type VARCHAR(20) NOT NULL, -- 'text', 'link', 'pdf', 'youtube', 'image', 'video'
  content_url TEXT, -- S3 URL for uploaded files, or external URL for links/YouTube
  content_text TEXT, -- for text posts
  description TEXT, -- optional post description (supports markdown)
  og_title VARCHAR(500), -- Open Graph title for link previews
  og_description TEXT, -- Open Graph description for link previews
  og_image TEXT, -- Open Graph image URL for link previews
  status VARCHAR(20) DEFAULT 'published', -- 'published', 'pending', 'rejected'
  approved_by VARCHAR(50), -- user_id of approver (NULL if auto-published)
  approved_at TIMESTAMP, -- approval timestamp (used for sorting in feed)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(50) NULL
);

-- Create indexes for feed_posts
CREATE INDEX IF NOT EXISTS idx_feed_posts_user ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_status ON feed_posts(status);
CREATE INDEX IF NOT EXISTS idx_feed_posts_approved_at ON feed_posts(approved_at);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_feed_posts_deleted ON feed_posts(deleted_at);

-- 3. Feed Post Topics (many-to-many relationship)
CREATE TABLE IF NOT EXISTS feed_post_topics (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR(100) NOT NULL, -- references feed_posts.post_id
  topic_id INTEGER NOT NULL, -- references feed_topics.id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, topic_id)
);

-- Create indexes for feed_post_topics
CREATE INDEX IF NOT EXISTS idx_feed_post_topics_post ON feed_post_topics(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_post_topics_topic ON feed_post_topics(topic_id);

-- 4. Feed Reactions Table
CREATE TABLE IF NOT EXISTS feed_reactions (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR(100) NOT NULL, -- references feed_posts.post_id
  user_id VARCHAR(50) NOT NULL, -- references users.employee_id
  emoji VARCHAR(10) NOT NULL, -- the emoji character (UTF-8)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, user_id, emoji)
);

-- Create indexes for feed_reactions
CREATE INDEX IF NOT EXISTS idx_feed_reactions_post ON feed_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_user ON feed_reactions(user_id);

-- 5. Feed Comments Table
CREATE TABLE IF NOT EXISTS feed_comments (
  id SERIAL PRIMARY KEY,
  comment_id VARCHAR(100) UNIQUE NOT NULL, -- format: 'CMT-{timestamp}-{random}'
  post_id VARCHAR(100) NOT NULL, -- references feed_posts.post_id
  user_id VARCHAR(50) NOT NULL, -- references users.employee_id
  parent_comment_id VARCHAR(100), -- references feed_comments.comment_id (NULL for top-level)
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(50) NULL
);

-- Create indexes for feed_comments
CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON feed_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_parent ON feed_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_user ON feed_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_deleted ON feed_comments(deleted_at);

-- 6. Feed Views Table (view tracking)
CREATE TABLE IF NOT EXISTS feed_views (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR(100) NOT NULL, -- references feed_posts.post_id
  user_id VARCHAR(50) NOT NULL, -- references users.employee_id
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, user_id)
);

-- Create indexes for feed_views
CREATE INDEX IF NOT EXISTS idx_feed_views_post ON feed_views(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_views_user ON feed_views(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_views_viewed_at ON feed_views(viewed_at);

-- Insert initial public topics
INSERT INTO feed_topics (topic_name, description, icon, display_order, created_by)
VALUES 
  ('Latest Technologies', 'Stay updated with the latest tech trends and innovations', '💻', 1, 'system'),
  ('Amtariksha Updates', 'Company news, announcements, and updates', '🏢', 2, 'system'),
  ('AI', 'Artificial Intelligence, Machine Learning, and related topics', '🤖', 3, 'system'),
  ('Robotics', 'Robotics, automation, and hardware innovations', '🦾', 4, 'system'),
  ('Software Development', 'Programming, frameworks, tools, and best practices', '⚙️', 5, 'system'),
  ('Ideas', 'Share your innovative ideas and suggestions', '💡', 6, 'system')
ON CONFLICT (topic_name) DO NOTHING;

-- Migration complete
SELECT 'Feed tables created successfully!' AS status;

