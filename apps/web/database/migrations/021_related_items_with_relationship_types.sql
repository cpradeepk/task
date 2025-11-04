-- Migration 021: Implement related items with relationship types
-- Date: 2025-01-04
-- Purpose: Create junction tables for task-task and task-development relationships with relationship types
--          Supports: "blocks", "is blocked by", "relates to", "duplicates"

-- ============================================================================
-- PART A: CREATE TASK-TASK RELATIONSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_relationships (
  id SERIAL PRIMARY KEY,
  source_task_id VARCHAR(50) NOT NULL,
  target_task_id VARCHAR(50) NOT NULL,
  relationship_type VARCHAR(20) NOT NULL CHECK (relationship_type IN ('blocks', 'is_blocked_by', 'relates_to', 'duplicates')),
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT task_relationships_source_fkey FOREIGN KEY (source_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  CONSTRAINT task_relationships_target_fkey FOREIGN KEY (target_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  
  -- Prevent duplicate relationships
  CONSTRAINT task_relationships_unique UNIQUE (source_task_id, target_task_id, relationship_type),
  
  -- Prevent self-referencing relationships
  CONSTRAINT task_relationships_no_self_reference CHECK (source_task_id != target_task_id)
);

-- Indexes for faster querying
CREATE INDEX idx_task_relationships_source ON task_relationships(source_task_id);
CREATE INDEX idx_task_relationships_target ON task_relationships(target_task_id);
CREATE INDEX idx_task_relationships_type ON task_relationships(relationship_type);

-- ============================================================================
-- PART B: CREATE TASK-DEVELOPMENT RELATIONSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_development_relationships (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(50) NOT NULL,
  development_id VARCHAR(50) NOT NULL,
  relationship_type VARCHAR(20) NOT NULL CHECK (relationship_type IN ('blocks', 'is_blocked_by', 'relates_to', 'duplicates')),
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT task_dev_relationships_task_fkey FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  CONSTRAINT task_dev_relationships_dev_fkey FOREIGN KEY (development_id) REFERENCES bugs(bug_id) ON DELETE CASCADE,
  
  -- Prevent duplicate relationships
  CONSTRAINT task_dev_relationships_unique UNIQUE (task_id, development_id, relationship_type)
);

-- Indexes for faster querying
CREATE INDEX idx_task_dev_relationships_task ON task_development_relationships(task_id);
CREATE INDEX idx_task_dev_relationships_dev ON task_development_relationships(development_id);
CREATE INDEX idx_task_dev_relationships_type ON task_development_relationships(relationship_type);

-- ============================================================================
-- PART C: CREATE DEVELOPMENT-DEVELOPMENT RELATIONSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS development_relationships (
  id SERIAL PRIMARY KEY,
  source_dev_id VARCHAR(50) NOT NULL,
  target_dev_id VARCHAR(50) NOT NULL,
  relationship_type VARCHAR(20) NOT NULL CHECK (relationship_type IN ('blocks', 'is_blocked_by', 'relates_to', 'duplicates')),
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT dev_relationships_source_fkey FOREIGN KEY (source_dev_id) REFERENCES bugs(bug_id) ON DELETE CASCADE,
  CONSTRAINT dev_relationships_target_fkey FOREIGN KEY (target_dev_id) REFERENCES bugs(bug_id) ON DELETE CASCADE,
  
  -- Prevent duplicate relationships
  CONSTRAINT dev_relationships_unique UNIQUE (source_dev_id, target_dev_id, relationship_type),
  
  -- Prevent self-referencing relationships
  CONSTRAINT dev_relationships_no_self_reference CHECK (source_dev_id != target_dev_id)
);

-- Indexes for faster querying
CREATE INDEX idx_dev_relationships_source ON development_relationships(source_dev_id);
CREATE INDEX idx_dev_relationships_target ON development_relationships(target_dev_id);
CREATE INDEX idx_dev_relationships_type ON development_relationships(relationship_type);

-- ============================================================================
-- PART D: MIGRATE EXISTING RELATED_TASKS DATA (if any)
-- ============================================================================

-- Migrate existing related_tasks from tasks table to task_relationships table
-- Assumes related_tasks is a comma-separated string of task IDs
-- This will create "relates_to" relationships for all existing related tasks

INSERT INTO task_relationships (source_task_id, target_task_id, relationship_type, created_by)
SELECT 
  t.task_id,
  TRIM(unnest(string_to_array(t.related_tasks, ','))),
  'relates_to',
  t.assigned_by
FROM tasks t
WHERE t.related_tasks IS NOT NULL AND t.related_tasks != ''
ON CONFLICT (source_task_id, target_task_id, relationship_type) DO NOTHING;

-- Migrate existing related_bugs from bugs table to development_relationships table
INSERT INTO development_relationships (source_dev_id, target_dev_id, relationship_type, created_by)
SELECT 
  b.bug_id,
  TRIM(unnest(string_to_array(b.related_bugs, ','))),
  'relates_to',
  b.reported_by
FROM bugs b
WHERE b.related_bugs IS NOT NULL AND b.related_bugs != ''
ON CONFLICT (source_dev_id, target_dev_id, relationship_type) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (run these manually to verify migration)
-- ============================================================================

-- Verify tables exist
-- SELECT COUNT(*) as task_relationships_count FROM task_relationships;
-- SELECT COUNT(*) as task_dev_relationships_count FROM task_development_relationships;
-- SELECT COUNT(*) as dev_relationships_count FROM development_relationships;

-- Verify relationship types
-- SELECT relationship_type, COUNT(*) FROM task_relationships GROUP BY relationship_type;
-- SELECT relationship_type, COUNT(*) FROM development_relationships GROUP BY relationship_type;

