-- ============================================================================
-- JSR Task Management System - PostgreSQL Database Schema
-- ============================================================================
-- Database: postgres (Supabase)
-- Converted from MySQL: 2025-11-02
-- Description: Complete schema migration from MySQL to PostgreSQL
-- ============================================================================
--
--  ⚠️  THIS FILE IS NOT AUTHORITATIVE AND HAS DRIFTED FROM PRODUCTION.
--
--  It records the ORIGINAL schema only. It does NOT include the changes made by
--  apps/web/database/migrations/*.sql, and at least one column type disagrees
--  with the live database:
--
--    users.is_system_admin   declared BOOLEAN here, but INTEGER in production.
--                            The application agrees with production (UserRow
--                            types it `number` and compares `=== 1`).
--                            Trusting this file caused migration 062 to fail
--                            with "operator does not exist: integer = boolean".
--
--    users.is_today_task     declared BOOLEAN here, while the code writes 1/0 —
--                            same smell, not yet confirmed against production.
--
--  Missing here entirely: companies, user_companies, project_users.role,
--  users.is_platform_admin, settings.company_id, and company_id on projects,
--  tasks, bugs and requirements (migrations 062 and 063).
--
--  DO NOT use this file to reason about production, and do not build test
--  fixtures from it. Dump the real schema instead:
--
--      ./scripts/dump-live-schema.sh > live_schema.sql
--
--  Reconciling this file against that dump is worth doing; until then treat the
--  migrations directory as the source of truth.
-- ============================================================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS user_notification_preferences CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS bug_comments CASCADE;
DROP TABLE IF EXISTS bug_subtasks CASCADE;
DROP TABLE IF EXISTS bugs CASCADE;
DROP TABLE IF EXISTS wfh_applications CASCADE;
DROP TABLE IF EXISTS leave_applications CASCADE;
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- Table: users
-- Description: Employee/User information and authentication
-- ============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    telegram_token VARCHAR(255),
    department VARCHAR(100) NOT NULL,
    manager_email VARCHAR(255),
    manager_id VARCHAR(50),
    is_today_task BOOLEAN DEFAULT FALSE,
    warning_count INTEGER DEFAULT 0,
    role VARCHAR(20) CHECK (role IN ('employee', 'management', 'top_management', 'admin')) DEFAULT 'employee',
    password VARCHAR(255) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    is_system_admin BOOLEAN DEFAULT FALSE,
    hours_log TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

ALTER TABLE users ADD CONSTRAINT fk_users_manager_id 
    FOREIGN KEY (manager_id) REFERENCES users(employee_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Table: projects
-- Description: Project hierarchy and management
-- ============================================================================
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL UNIQUE,
    project_name VARCHAR(255) NOT NULL,
    parent_project_id VARCHAR(100),
    description TEXT,
    status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'completed')) DEFAULT 'active',
    created_by VARCHAR(50) NOT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    deleted_by VARCHAR(50) NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_project_id ON projects(project_id);
CREATE INDEX idx_projects_parent_project_id ON projects(parent_project_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);

ALTER TABLE projects ADD CONSTRAINT fk_projects_parent_project_id 
    FOREIGN KEY (parent_project_id) REFERENCES projects(project_id) ON DELETE SET NULL;
ALTER TABLE projects ADD CONSTRAINT fk_projects_created_by 
    FOREIGN KEY (created_by) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Table: tasks
-- Description: Task management and tracking
-- ============================================================================
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL UNIQUE,
    internal_id VARCHAR(100) NOT NULL UNIQUE,
    select_type VARCHAR(20) CHECK (select_type IN ('Normal', 'Recursive')) DEFAULT 'Normal',
    recursive_type VARCHAR(20) CHECK (recursive_type IN ('Daily', 'Weekly', 'Monthly', 'Annually')),
    description TEXT NOT NULL,
    assigned_to VARCHAR(50) NOT NULL,
    assigned_by VARCHAR(50) NOT NULL,
    support JSONB,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    priority VARCHAR(10) CHECK (priority IN ('U&I', 'NU&I', 'U&NI', 'NU&NI')) DEFAULT 'NU&NI',
    estimated_hours DECIMAL(10, 2) DEFAULT 0,
    actual_hours DECIMAL(10, 2) DEFAULT 0,
    daily_hours JSONB,
    status VARCHAR(20) CHECK (status IN ('Yet to Start', 'In Progress', 'Delayed', 'Done', 'Cancel', 'Hold', 'ReOpened', 'Stop')) DEFAULT 'Yet to Start',
    remarks TEXT,
    difficulties TEXT,
    timer_state VARCHAR(50),
    timer_start_time TIMESTAMP NULL,
    timer_paused_time BIGINT,
    timer_total_time BIGINT,
    timer_sessions JSONB,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    deleted_by VARCHAR(50) NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_task_id ON tasks(task_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_start_date ON tasks(start_date);
CREATE INDEX idx_tasks_end_date ON tasks(end_date);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_assigned_to 
    FOREIGN KEY (assigned_to) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_assigned_by 
    FOREIGN KEY (assigned_by) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Table: subtasks
-- Description: Subtasks for tasks with drag-and-drop ordering and soft delete
-- ============================================================================
CREATE TABLE subtasks (
    id SERIAL PRIMARY KEY,
    parent_task_id VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    assigned_to VARCHAR(50) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Not Started', 'In Progress', 'Completed')) DEFAULT 'Not Started',
    is_completed BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    deleted_by VARCHAR(50) NULL DEFAULT NULL
);

CREATE INDEX idx_subtasks_parent_task_id ON subtasks(parent_task_id);
CREATE INDEX idx_subtasks_assigned_to ON subtasks(assigned_to);
CREATE INDEX idx_subtasks_status ON subtasks(status);
CREATE INDEX idx_subtasks_is_completed ON subtasks(is_completed);
CREATE INDEX idx_subtasks_deleted_at ON subtasks(deleted_at);
CREATE INDEX idx_subtasks_display_order ON subtasks(display_order);

ALTER TABLE subtasks ADD CONSTRAINT fk_subtasks_parent_task_id 
    FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE;
ALTER TABLE subtasks ADD CONSTRAINT fk_subtasks_assigned_to 
    FOREIGN KEY (assigned_to) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE subtasks ADD CONSTRAINT fk_subtasks_created_by 
    FOREIGN KEY (created_by) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Table: leave_applications
-- Description: Employee leave requests and approvals
-- ============================================================================
CREATE TABLE leave_applications (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(100) NOT NULL UNIQUE,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    leave_type VARCHAR(50) CHECK (leave_type IN ('Sick Leave', 'Casual Leave', 'Annual Leave', 'Emergency Leave', 'Maternity Leave', 'Paternity Leave')) NOT NULL,
    reason TEXT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    is_half_day BOOLEAN DEFAULT FALSE,
    emergency_contact VARCHAR(20),
    status VARCHAR(20) CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
    manager_id VARCHAR(50),
    approved_by VARCHAR(50),
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leave_applications_application_id ON leave_applications(application_id);
CREATE INDEX idx_leave_applications_employee_id ON leave_applications(employee_id);
CREATE INDEX idx_leave_applications_status ON leave_applications(status);
CREATE INDEX idx_leave_applications_from_date ON leave_applications(from_date);
CREATE INDEX idx_leave_applications_to_date ON leave_applications(to_date);

ALTER TABLE leave_applications ADD CONSTRAINT fk_leave_applications_employee_id 
    FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE leave_applications ADD CONSTRAINT fk_leave_applications_manager_id 
    FOREIGN KEY (manager_id) REFERENCES users(employee_id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE leave_applications ADD CONSTRAINT fk_leave_applications_approved_by 
    FOREIGN KEY (approved_by) REFERENCES users(employee_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Table: wfh_applications
-- Description: Work from home requests and approvals
-- ============================================================================
CREATE TABLE wfh_applications (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(100) NOT NULL UNIQUE,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    is_half_day BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
    manager_id VARCHAR(50),
    approved_by VARCHAR(50),
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wfh_applications_application_id ON wfh_applications(application_id);
CREATE INDEX idx_wfh_applications_employee_id ON wfh_applications(employee_id);
CREATE INDEX idx_wfh_applications_status ON wfh_applications(status);
CREATE INDEX idx_wfh_applications_from_date ON wfh_applications(from_date);
CREATE INDEX idx_wfh_applications_to_date ON wfh_applications(to_date);

ALTER TABLE wfh_applications ADD CONSTRAINT fk_wfh_applications_employee_id 
    FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE wfh_applications ADD CONSTRAINT fk_wfh_applications_manager_id 
    FOREIGN KEY (manager_id) REFERENCES users(employee_id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE wfh_applications ADD CONSTRAINT fk_wfh_applications_approved_by 
    FOREIGN KEY (approved_by) REFERENCES users(employee_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Table: bugs
-- Description: Bug tracking and management
-- ============================================================================
CREATE TABLE bugs (
    id SERIAL PRIMARY KEY,
    bug_id VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    assigned_to VARCHAR(50) NOT NULL,
    assigned_by VARCHAR(50) NOT NULL,
    reported_by VARCHAR(50) NOT NULL,
    priority VARCHAR(10) CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
    severity VARCHAR(10) CHECK (severity IN ('Minor', 'Major', 'Critical')) DEFAULT 'Minor',
    status VARCHAR(20) CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed', 'Reopened')) DEFAULT 'Open',
    environment VARCHAR(100),
    browser VARCHAR(100),
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    attachments JSONB,
    related_bugs TEXT,
    resolution_notes TEXT,
    development_prompt TEXT,
    resolved_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    deleted_by VARCHAR(50) NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bugs_bug_id ON bugs(bug_id);
CREATE INDEX idx_bugs_assigned_to ON bugs(assigned_to);
CREATE INDEX idx_bugs_assigned_by ON bugs(assigned_by);
CREATE INDEX idx_bugs_reported_by ON bugs(reported_by);
CREATE INDEX idx_bugs_status ON bugs(status);
CREATE INDEX idx_bugs_priority ON bugs(priority);
CREATE INDEX idx_bugs_severity ON bugs(severity);
CREATE INDEX idx_bugs_deleted_at ON bugs(deleted_at);
CREATE INDEX idx_bugs_created_at ON bugs(created_at);

ALTER TABLE bugs ADD CONSTRAINT fk_bugs_assigned_to
    FOREIGN KEY (assigned_to) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE bugs ADD CONSTRAINT fk_bugs_assigned_by
    FOREIGN KEY (assigned_by) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE bugs ADD CONSTRAINT fk_bugs_reported_by
    FOREIGN KEY (reported_by) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Table: bug_subtasks
-- Description: Subtasks for bugs with drag-and-drop ordering and soft delete
-- ============================================================================
CREATE TABLE bug_subtasks (
    id SERIAL PRIMARY KEY,
    parent_bug_id VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    assigned_to VARCHAR(50) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Not Started', 'In Progress', 'Completed')) DEFAULT 'Not Started',
    is_completed BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    deleted_by VARCHAR(50) NULL DEFAULT NULL
);

CREATE INDEX idx_bug_subtasks_parent_bug_id ON bug_subtasks(parent_bug_id);
CREATE INDEX idx_bug_subtasks_assigned_to ON bug_subtasks(assigned_to);
CREATE INDEX idx_bug_subtasks_status ON bug_subtasks(status);
CREATE INDEX idx_bug_subtasks_is_completed ON bug_subtasks(is_completed);
CREATE INDEX idx_bug_subtasks_deleted_at ON bug_subtasks(deleted_at);
CREATE INDEX idx_bug_subtasks_display_order ON bug_subtasks(display_order);

ALTER TABLE bug_subtasks ADD CONSTRAINT fk_bug_subtasks_parent_bug_id
    FOREIGN KEY (parent_bug_id) REFERENCES bugs(bug_id) ON DELETE CASCADE;
ALTER TABLE bug_subtasks ADD CONSTRAINT fk_bug_subtasks_assigned_to
    FOREIGN KEY (assigned_to) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE bug_subtasks ADD CONSTRAINT fk_bug_subtasks_created_by
    FOREIGN KEY (created_by) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Table: bug_comments
-- Description: Comments and discussions on bugs
-- ============================================================================
CREATE TABLE bug_comments (
    id SERIAL PRIMARY KEY,
    bug_id VARCHAR(100) NOT NULL,
    comment TEXT NOT NULL,
    commented_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bug_comments_bug_id ON bug_comments(bug_id);
CREATE INDEX idx_bug_comments_commented_by ON bug_comments(commented_by);
CREATE INDEX idx_bug_comments_created_at ON bug_comments(created_at);

ALTER TABLE bug_comments ADD CONSTRAINT fk_bug_comments_bug_id
    FOREIGN KEY (bug_id) REFERENCES bugs(bug_id) ON DELETE CASCADE;
ALTER TABLE bug_comments ADD CONSTRAINT fk_bug_comments_commented_by
    FOREIGN KEY (commented_by) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Table: role_permissions
-- Description: Role-based permissions for features and pages
-- ============================================================================
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) CHECK (role IN ('admin', 'top_management', 'management', 'employee')) NOT NULL,
    feature_key VARCHAR(100) NOT NULL,
    feature_name VARCHAR(200) NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, feature_key)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_feature_key ON role_permissions(feature_key);

-- ============================================================================
-- Table: user_permissions
-- Description: User-specific permission overrides
-- ============================================================================
CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    feature_key VARCHAR(100) NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, feature_key)
);

CREATE INDEX idx_user_permissions_employee_id ON user_permissions(employee_id);
CREATE INDEX idx_user_permissions_feature_key ON user_permissions(feature_key);

ALTER TABLE user_permissions ADD CONSTRAINT fk_user_permissions_employee_id
    FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Table: user_notification_preferences
-- Description: User notification preferences for email, telegram, and in-app
-- ============================================================================
CREATE TABLE user_notification_preferences (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    telegram_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    task_assigned BOOLEAN DEFAULT TRUE,
    task_updated BOOLEAN DEFAULT TRUE,
    task_completed BOOLEAN DEFAULT TRUE,
    bug_assigned BOOLEAN DEFAULT TRUE,
    bug_updated BOOLEAN DEFAULT TRUE,
    bug_resolved BOOLEAN DEFAULT TRUE,
    leave_status_changed BOOLEAN DEFAULT TRUE,
    wfh_status_changed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_notification_preferences_employee_id ON user_notification_preferences(employee_id);

ALTER TABLE user_notification_preferences ADD CONSTRAINT fk_user_notification_preferences_employee_id
    FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Table: settings
-- Description: Application settings and dropdown values
-- ============================================================================
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_is_active ON settings(is_active);

-- ============================================================================
-- Table: activity_log
-- Description: Activity log for all entities
-- ============================================================================
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    performed_by VARCHAR(50) NOT NULL,
    changes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX idx_activity_log_entity_id ON activity_log(entity_id);
CREATE INDEX idx_activity_log_performed_by ON activity_log(performed_by);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

ALTER TABLE activity_log ADD CONSTRAINT fk_activity_log_performed_by
    FOREIGN KEY (performed_by) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Triggers for updated_at columns
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON subtasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_applications_updated_at BEFORE UPDATE ON leave_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wfh_applications_updated_at BEFORE UPDATE ON wfh_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bugs_updated_at BEFORE UPDATE ON bugs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bug_subtasks_updated_at BEFORE UPDATE ON bug_subtasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bug_comments_updated_at BEFORE UPDATE ON bug_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON role_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON user_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

