-- ============================================================================
-- JSR Task Management System - MySQL Database Schema
-- ============================================================================
-- Database: task
-- Created: 2025-10-24
-- Description: Complete schema migration from Google Sheets to MySQL
-- ============================================================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS bug_comments;
DROP TABLE IF EXISTS bugs;
DROP TABLE IF EXISTS wfh_applications;
DROP TABLE IF EXISTS leave_applications;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;

-- ============================================================================
-- Table: users
-- Description: Employee/User information and authentication
-- ============================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    telegram_token VARCHAR(255),
    department VARCHAR(100) NOT NULL,
    manager_email VARCHAR(255),
    manager_id VARCHAR(50),
    is_today_task BOOLEAN DEFAULT FALSE,
    warning_count INT DEFAULT 0,
    role ENUM('employee', 'management', 'top_management', 'admin') DEFAULT 'employee',
    password VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    hours_log TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_employee_id (employee_id),
    INDEX idx_email (email),
    INDEX idx_manager_id (manager_id),
    INDEX idx_department (department),
    INDEX idx_status (status),
    INDEX idx_role (role),
    
    FOREIGN KEY (manager_id) REFERENCES users(employee_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Table: tasks
-- Description: Task management and tracking
-- ============================================================================
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL UNIQUE,
    internal_id VARCHAR(100) NOT NULL UNIQUE,
    select_type ENUM('Normal', 'Recursive') DEFAULT 'Normal',
    recursive_type ENUM('Daily', 'Weekly', 'Monthly', 'Annually'),
    description TEXT NOT NULL,
    assigned_to VARCHAR(50) NOT NULL,
    assigned_by VARCHAR(50) NOT NULL,
    support JSON,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    priority ENUM('U&I', 'NU&I', 'U&NI', 'NU&NI') DEFAULT 'NU&NI',
    estimated_hours DECIMAL(10, 2) DEFAULT 0,
    actual_hours DECIMAL(10, 2) DEFAULT 0,
    daily_hours JSON,
    status ENUM('Yet to Start', 'In Progress', 'Delayed', 'Done', 'Cancel', 'Hold', 'ReOpened', 'Stop') DEFAULT 'Yet to Start',
    remarks TEXT,
    difficulties TEXT,
    sub_task TEXT,
    timer_state VARCHAR(50),
    timer_start_time TIMESTAMP NULL,
    timer_paused_time BIGINT,
    timer_total_time BIGINT,
    timer_sessions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_task_id (task_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_assigned_by (assigned_by),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (assigned_to) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Table: leave_applications
-- Description: Employee leave requests and approvals
-- ============================================================================
CREATE TABLE leave_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id VARCHAR(100) NOT NULL UNIQUE,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    leave_type ENUM('Sick Leave', 'Casual Leave', 'Annual Leave', 'Emergency Leave', 'Maternity Leave', 'Paternity Leave') NOT NULL,
    reason TEXT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    is_half_day BOOLEAN DEFAULT FALSE,
    emergency_contact VARCHAR(20),
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    manager_id VARCHAR(50),
    approved_by VARCHAR(50),
    approval_date TIMESTAMP NULL,
    approval_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_employee_id (employee_id),
    INDEX idx_status (status),
    INDEX idx_from_date (from_date),
    INDEX idx_to_date (to_date),
    INDEX idx_manager_id (manager_id),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES users(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(employee_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Table: wfh_applications
-- Description: Work From Home requests and approvals
-- ============================================================================
CREATE TABLE wfh_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id VARCHAR(100) NOT NULL UNIQUE,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    wfh_type ENUM('Full Day', 'Half Day', 'Flexible Hours') NOT NULL,
    reason TEXT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    work_location VARCHAR(255) NOT NULL,
    available_from TIME,
    available_to TIME,
    contact_number VARCHAR(20) NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    manager_id VARCHAR(50),
    approved_by VARCHAR(50),
    approval_date TIMESTAMP NULL,
    approval_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_employee_id (employee_id),
    INDEX idx_status (status),
    INDEX idx_from_date (from_date),
    INDEX idx_to_date (to_date),
    INDEX idx_manager_id (manager_id),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES users(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(employee_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Table: bugs
-- Description: Bug tracking and management
-- ============================================================================
CREATE TABLE bugs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bug_id VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    severity ENUM('Critical', 'Major', 'Minor') DEFAULT 'Minor',
    priority ENUM('High', 'Medium', 'Low') DEFAULT 'Low',
    status ENUM('New', 'In Progress', 'Resolved', 'Closed', 'Reopened') DEFAULT 'New',
    category ENUM('UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other') DEFAULT 'Other',
    platform ENUM('iOS', 'Android', 'Web', 'All') DEFAULT 'Web',
    assigned_to VARCHAR(50),
    assigned_by VARCHAR(50),
    reported_by VARCHAR(50) NOT NULL,
    environment ENUM('Development', 'Staging', 'Production') DEFAULT 'Production',
    browser_info VARCHAR(255),
    device_info VARCHAR(255),
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    attachments TEXT,
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2),
    resolved_date TIMESTAMP NULL,
    closed_date TIMESTAMP NULL,
    reopened_count INT DEFAULT 0,
    tags VARCHAR(500),
    related_bugs VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_bug_id (bug_id),
    INDEX idx_status (status),
    INDEX idx_severity (severity),
    INDEX idx_priority (priority),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_reported_by (reported_by),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (assigned_to) REFERENCES users(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (reported_by) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Table: bug_comments
-- Description: Comments and discussions on bugs
-- ============================================================================
CREATE TABLE bug_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bug_id VARCHAR(100) NOT NULL,
    commented_by VARCHAR(50) NOT NULL,
    comment_text TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_bug_id (bug_id),
    INDEX idx_commented_by (commented_by),
    INDEX idx_timestamp (timestamp),
    
    FOREIGN KEY (commented_by) REFERENCES users(employee_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

