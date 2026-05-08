-- Migration 038: Create project_users junction table
-- Purpose: Enable user-project assignment for access control
-- Users assigned to a project can see it; admin/top_management see all projects

-- Create project_users junction table
CREATE TABLE IF NOT EXISTS project_users (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    employee_id TEXT NOT NULL,
    assigned_by TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, employee_id)
);

-- Add foreign key to projects table
DO $$ BEGIN
    ALTER TABLE project_users
    ADD CONSTRAINT fk_project_users_project
    FOREIGN KEY (project_id)
    REFERENCES projects(project_id)
    ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign key to users table (employee_id)
DO $$ BEGIN
    ALTER TABLE project_users
    ADD CONSTRAINT fk_project_users_user
    FOREIGN KEY (employee_id)
    REFERENCES users(employee_id)
    ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign key for assigned_by
DO $$ BEGIN
    ALTER TABLE project_users
    ADD CONSTRAINT fk_project_users_assigned_by
    FOREIGN KEY (assigned_by)
    REFERENCES users(employee_id)
    ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id);
CREATE INDEX IF NOT EXISTS idx_project_users_employee_id ON project_users(employee_id);
CREATE INDEX IF NOT EXISTS idx_project_users_assigned_by ON project_users(assigned_by);

-- Verify table was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_users') THEN
        RAISE NOTICE '✅ project_users table created successfully';
    ELSE
        RAISE EXCEPTION '❌ project_users table was not created';
    END IF;
END $$;
