-- PostgreSQL Schema Generated from MySQL
-- Generated: 2025-11-02T06:38:35.912Z
-- Source: task@ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com

-- Drop existing tables
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS user_notification_preferences CASCADE;
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


-- Table: activity_log
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(100) CHECK (entity_type IN ('task','bug','leave','wfh')) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    description TEXT NOT NULL,
    is_comment INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_entity ON activity_log (entity_type, entity_id);
CREATE INDEX idx_user_id ON activity_log (user_id);
CREATE INDEX idx_created_at ON activity_log (created_at);
CREATE INDEX idx_action_type ON activity_log (action_type);
CREATE INDEX idx_is_comment ON activity_log (is_comment);
CREATE INDEX idx_entity_created ON activity_log (entity_type, entity_id, created_at);

-- Table: bug_comments
CREATE TABLE bug_comments (
    id SERIAL PRIMARY KEY,
    bug_id VARCHAR(100) NOT NULL,
    commented_by VARCHAR(50) NOT NULL,
    comment_text TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bug_id ON bug_comments (bug_id);
CREATE INDEX idx_commented_by ON bug_comments (commented_by);
CREATE INDEX idx_timestamp ON bug_comments (timestamp);

-- Table: bug_subtasks
CREATE TABLE bug_subtasks (
    id SERIAL PRIMARY KEY,
    parent_bug_id VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    assigned_to VARCHAR(50) NOT NULL,
    status VARCHAR(100) CHECK (status IN ('Not Started','In Progress','Completed')) DEFAULT 'Not Started',
    is_completed INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(50)
);
CREATE INDEX idx_parent_bug_id ON bug_subtasks (parent_bug_id);
CREATE INDEX idx_assigned_to ON bug_subtasks (assigned_to);
CREATE INDEX idx_status ON bug_subtasks (status);
CREATE INDEX idx_is_completed ON bug_subtasks (is_completed);
CREATE INDEX idx_deleted_at ON bug_subtasks (deleted_at);
CREATE INDEX idx_display_order ON bug_subtasks (display_order);

-- Table: bugs
CREATE TABLE bugs (
    id SERIAL PRIMARY KEY,
    bug_id VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'Minor',
    priority VARCHAR(50) DEFAULT 'Low',
    status VARCHAR(50) DEFAULT 'New',
    category VARCHAR(100) DEFAULT 'Other',
    platform VARCHAR(50) DEFAULT 'Web',
    assigned_to VARCHAR(50),
    assigned_by VARCHAR(50),
    reported_by VARCHAR(50) NOT NULL,
    environment VARCHAR(50) DEFAULT 'Production',
    browser_info VARCHAR(255),
    device_info VARCHAR(255),
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    attachments TEXT,
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2),
    resolved_date TIMESTAMP,
    closed_date TIMESTAMP,
    reopened_count INTEGER DEFAULT 0,
    tags VARCHAR(500),
    related_bugs VARCHAR(500),
    project_id VARCHAR(50),
    subproject_id VARCHAR(50),
    feature VARCHAR(255),
    type VARCHAR(100) CHECK (type IN ('testcase','feature','other')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(50),
    timer_state VARCHAR(50),
    timer_start_time TIMESTAMP,
    timer_paused_time INTEGER,
    timer_total_time INTEGER,
    timer_sessions JSONB
);
CREATE INDEX idx_bug_id ON bugs (bug_id);
CREATE INDEX idx_assigned_to ON bugs (assigned_to);
CREATE INDEX idx_reported_by ON bugs (reported_by);
CREATE INDEX idx_created_at ON bugs (created_at);
CREATE INDEX assigned_by ON bugs (assigned_by);
CREATE INDEX idx_project_id ON bugs (project_id);
CREATE INDEX idx_type ON bugs (type);
CREATE INDEX idx_severity ON bugs (severity);
CREATE INDEX idx_priority ON bugs (priority);
CREATE INDEX idx_status ON bugs (status);
CREATE INDEX idx_category ON bugs (category);
CREATE INDEX idx_platform ON bugs (platform);
CREATE INDEX idx_deleted_at ON bugs (deleted_at);
CREATE INDEX idx_bugs_timer_state ON bugs (timer_state);
CREATE INDEX idx_bugs_timer_start_time ON bugs (timer_start_time);
CREATE INDEX idx_subproject_id ON bugs (subproject_id);

-- Table: leave_applications
CREATE TABLE leave_applications (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(100) NOT NULL UNIQUE,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    leave_type VARCHAR(100) CHECK (leave_type IN ('Sick Leave','Casual Leave','Annual Leave','Emergency Leave','Maternity Leave','Paternity Leave')) NOT NULL,
    reason TEXT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    is_half_day INTEGER DEFAULT 0,
    emergency_contact VARCHAR(20),
    status VARCHAR(100) CHECK (status IN ('Pending','Approved','Rejected')) DEFAULT 'Pending',
    manager_id VARCHAR(50),
    approved_by VARCHAR(50),
    approval_date TIMESTAMP,
    approval_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_employee_id ON leave_applications (employee_id);
CREATE INDEX idx_status ON leave_applications (status);
CREATE INDEX idx_from_date ON leave_applications (from_date);
CREATE INDEX idx_to_date ON leave_applications (to_date);
CREATE INDEX idx_manager_id ON leave_applications (manager_id);
CREATE INDEX idx_created_at ON leave_applications (created_at);
CREATE INDEX approved_by ON leave_applications (approved_by);

-- Table: projects
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL UNIQUE,
    project_name VARCHAR(255) NOT NULL,
    parent_project_id VARCHAR(50),
    description TEXT,
    status VARCHAR(100) CHECK (status IN ('Active','Inactive','Deleted')) DEFAULT 'Active',
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(50)
);
CREATE INDEX idx_project_id ON projects (project_id);
CREATE INDEX idx_parent_project_id ON projects (parent_project_id);
CREATE INDEX idx_status ON projects (status);
CREATE INDEX idx_created_by ON projects (created_by);
CREATE INDEX idx_created_at ON projects (created_at);
CREATE INDEX deleted_by ON projects (deleted_by);
CREATE INDEX idx_deleted_at ON projects (deleted_at);

-- Table: settings
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    metadata JSONB,
    is_active INTEGER DEFAULT 1,
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_key ON settings (key);
CREATE INDEX idx_is_active ON settings (is_active);
CREATE INDEX idx_created_by ON settings (created_by);

-- Table: subtasks
CREATE TABLE subtasks (
    id SERIAL PRIMARY KEY,
    parent_task_id VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    assigned_to VARCHAR(50) NOT NULL,
    status VARCHAR(100) CHECK (status IN ('Not Started','In Progress','Completed')) DEFAULT 'Not Started',
    is_completed INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(50)
);
CREATE INDEX idx_parent_task_id ON subtasks (parent_task_id);
CREATE INDEX idx_assigned_to ON subtasks (assigned_to);
CREATE INDEX idx_status ON subtasks (status);
CREATE INDEX idx_is_completed ON subtasks (is_completed);
CREATE INDEX idx_deleted_at ON subtasks (deleted_at);
CREATE INDEX idx_display_order ON subtasks (display_order);

-- Table: tasks
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL UNIQUE,
    internal_id VARCHAR(100) NOT NULL UNIQUE,
    select_type VARCHAR(100) CHECK (select_type IN ('Normal','Recursive')) DEFAULT 'Normal',
    recursive_type VARCHAR(100) CHECK (recursive_type IN ('Daily','Weekly','Monthly','Annually')),
    description TEXT NOT NULL,
    assigned_to VARCHAR(50) NOT NULL,
    assigned_by VARCHAR(50) NOT NULL,
    support JSONB,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    priority VARCHAR(100) CHECK (priority IN ('U&I','NU&I','U&NI','NU&NI')) DEFAULT 'NU&NI',
    estimated_hours DECIMAL(10,2) DEFAULT 0.00,
    actual_hours DECIMAL(10,2) DEFAULT 0.00,
    daily_hours JSONB,
    status VARCHAR(50) DEFAULT 'Yet to Start',
    remarks TEXT,
    difficulties TEXT,
    related_tasks VARCHAR(500),
    project_id VARCHAR(50),
    timer_state VARCHAR(50),
    timer_start_time TIMESTAMP,
    timer_paused_time INTEGER,
    timer_total_time INTEGER,
    timer_sessions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(50)
);
CREATE INDEX idx_task_id ON tasks (task_id);
CREATE INDEX idx_assigned_to ON tasks (assigned_to);
CREATE INDEX idx_assigned_by ON tasks (assigned_by);
CREATE INDEX idx_priority ON tasks (priority);
CREATE INDEX idx_start_date ON tasks (start_date);
CREATE INDEX idx_end_date ON tasks (end_date);
CREATE INDEX idx_created_at ON tasks (created_at);
CREATE INDEX idx_project_id ON tasks (project_id);
CREATE INDEX idx_related_tasks ON tasks (related_tasks);
CREATE INDEX idx_status ON tasks (status);
CREATE INDEX idx_deleted_at ON tasks (deleted_at);
CREATE INDEX idx_tasks_timer_state ON tasks (timer_state);
CREATE INDEX idx_tasks_timer_start_time ON tasks (timer_start_time);

-- Table: user_notification_preferences
CREATE TABLE user_notification_preferences (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    email_enabled INTEGER DEFAULT 1,
    telegram_enabled INTEGER DEFAULT 0,
    in_app_enabled INTEGER DEFAULT 1,
    task_assigned INTEGER DEFAULT 1,
    task_updated INTEGER DEFAULT 1,
    task_commented INTEGER DEFAULT 1,
    task_due_soon INTEGER DEFAULT 1,
    task_overdue INTEGER DEFAULT 1,
    task_completed INTEGER DEFAULT 1,
    task_support_assigned INTEGER DEFAULT 1,
    bug_assigned INTEGER DEFAULT 1,
    bug_updated INTEGER DEFAULT 1,
    bug_commented INTEGER DEFAULT 1,
    bug_status_changed INTEGER DEFAULT 1,
    bug_severity_changed INTEGER DEFAULT 1,
    leave_approved INTEGER DEFAULT 1,
    leave_rejected INTEGER DEFAULT 1,
    leave_pending_approval INTEGER DEFAULT 1,
    wfh_approved INTEGER DEFAULT 1,
    wfh_rejected INTEGER DEFAULT 1,
    wfh_pending_approval INTEGER DEFAULT 1,
    project_assigned INTEGER DEFAULT 1,
    project_updated INTEGER DEFAULT 1,
    team_member_added INTEGER DEFAULT 1,
    team_task_created INTEGER DEFAULT 1,
    system_announcements INTEGER DEFAULT 1,
    daily_summary INTEGER DEFAULT 0,
    weekly_summary INTEGER DEFAULT 0,
    quiet_hours_enabled INTEGER DEFAULT 0,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_employee_id ON user_notification_preferences (employee_id);

-- Table: users
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
    is_today_task INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    role VARCHAR(100) CHECK (role IN ('employee','management','top_management','admin')) DEFAULT 'employee',
    password VARCHAR(255) NOT NULL,
    status VARCHAR(100) CHECK (status IN ('active','inactive')) DEFAULT 'active',
    hours_log TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_system_admin INTEGER DEFAULT 0
);
CREATE INDEX idx_employee_id ON users (employee_id);
CREATE INDEX idx_email ON users (email);
CREATE INDEX idx_manager_id ON users (manager_id);
CREATE INDEX idx_department ON users (department);
CREATE INDEX idx_status ON users (status);
CREATE INDEX idx_role ON users (role);

-- Table: wfh_applications
CREATE TABLE wfh_applications (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(100) NOT NULL UNIQUE,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    wfh_type VARCHAR(100) CHECK (wfh_type IN ('Full Day','Half Day','Flexible Hours')) NOT NULL,
    reason TEXT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    work_location VARCHAR(255) NOT NULL,
    available_from TIME,
    available_to TIME,
    contact_number VARCHAR(20) NOT NULL,
    status VARCHAR(100) CHECK (status IN ('Pending','Approved','Rejected')) DEFAULT 'Pending',
    manager_id VARCHAR(50),
    approved_by VARCHAR(50),
    approval_date TIMESTAMP,
    approval_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_employee_id ON wfh_applications (employee_id);
CREATE INDEX idx_status ON wfh_applications (status);
CREATE INDEX idx_from_date ON wfh_applications (from_date);
CREATE INDEX idx_to_date ON wfh_applications (to_date);
CREATE INDEX idx_manager_id ON wfh_applications (manager_id);
CREATE INDEX idx_created_at ON wfh_applications (created_at);
CREATE INDEX approved_by ON wfh_applications (approved_by);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bug_subtasks_updated_at BEFORE UPDATE ON bug_subtasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bugs_updated_at BEFORE UPDATE ON bugs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_applications_updated_at BEFORE UPDATE ON leave_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON subtasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wfh_applications_updated_at BEFORE UPDATE ON wfh_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
