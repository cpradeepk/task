# JSR Task Management System - Product Requirements Document (PRD)

**Version:** 2.1
**Last Updated:** 2025-01-04
**Status:** Living Document

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Core Features](#core-features)
4. [Database Schema](#database-schema)
5. [Business Rules](#business-rules)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Workflows](#workflows)
8. [API Endpoints](#api-endpoints)
9. [UI/UX Guidelines](#uiux-guidelines)
10. [Integration Points](#integration-points)
11. [Future Enhancements](#future-enhancements)

---

## 1. Executive Summary

### 1.1 Product Overview

JSR Task Management System is a comprehensive project and task management platform designed for Amtariksha team. It provides:

- **Task Management** with timers, checklists, and multiple assignees
- **Bug Tracking** (Development Module) with attachments and detailed logging
- **Leave & WFH Management** with approval workflows
- **Project Hierarchy** with projects and subprojects
- **Activity Logging** for all changes
- **Role-Based Access Control** (RBAC)
- **Email Notifications** for important events
- **File Uploads** via AWS S3

### 1.2 Technology Stack

**Frontend:**
- Next.js 16 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Lucide Icons

**Mobile:**
- React Native
- Expo
- TypeScript

**Backend:**
- Next.js API Routes (serverless)
- PostgreSQL (Supabase)
- JWT Authentication
- Nodemailer (Email)
- AWS S3 (File Storage)

**Deployment:**
- Vercel (Web App)
- AWS RDS (Database - migrated to Supabase PostgreSQL)
- AWS S3 (File Storage)

### 1.3 Key Metrics

- **Users:** ~50 employees
- **Tasks:** ~1000+ active tasks
- **Bugs:** ~500+ development items
- **Projects:** ~20 active projects
- **Database:** PostgreSQL on Supabase (previously MySQL on AWS RDS)
- **Connection Pool:** 3 connections per serverless instance (PgBouncer pooling)

---

## 2. System Architecture

### 2.1 Monorepo Structure

```
jsr_web_app-jsr_tool/
├── apps/
│   ├── web/                 # Next.js 16 web application
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # React components
│   │   │   ├── lib/         # Utilities, DB, types
│   │   │   └── contexts/    # React contexts
│   │   ├── database/        # Schema & migrations
│   │   └── scripts/         # Migration scripts
│   └── mobile/              # React Native + Expo app
│       └── src/
│           ├── screens/     # Mobile screens
│           ├── components/  # Mobile components
│           └── lib/         # API clients
└── packages/
    └── shared/              # Shared TypeScript types
```

### 2.2 Database Architecture

**Database:** PostgreSQL 15 on Supabase  
**Connection:** PgBouncer pooler (IPv4-compatible for Vercel)  
**Connection String:** `postgresql://postgres.rbckjkdohzbclomrufrx:***@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`

**Key Tables:**
- `users` - Employee information and authentication
- `tasks` - Task management with timers and multiple assignees
- `bugs` - Bug/development tracking
- `projects` - Project hierarchy
- `task_checklists` - Simple checklist items for tasks
- `development_checklists` - Simple checklist items for bugs
- `task_relationships` - Task-to-task relationships
- `task_development_relationships` - Task-to-bug relationships
- `development_relationships` - Bug-to-bug relationships
- `leave_applications` - Leave requests
- `wfh_applications` - Work from home requests
- `activity_log` - Audit trail for all changes
- `settings` - Dynamic dropdown options
- `role_permissions` - Role-based permissions
- `user_permissions` - User-specific permission overrides
- `user_notification_preferences` - Email notification settings

### 2.3 Authentication & Authorization

**Authentication:**
- JWT tokens stored in HTTP-only cookies
- Token expiration: 7 days
- Auto-refresh on activity
- Logout clears cookies

**Authorization:**
- Role-based permissions (employee, management, top_management, admin)
- User-specific permission overrides
- Permission checks on every API route
- Frontend permission checks for UI elements

---

## 3. Core Features

### 3.1 Task Management

**Task Fields:**
- `task_id` - Unique ID (e.g., JSR-0001, JSR-0002)
- `name` - Short title (max 150 chars) - **NEW FIELD**
- `description` - Full details (TEXT)
- `assignedTo` - Array of employee IDs (multiple assignees)
- `assignedBy` - Creator employee ID
- `support` - Array of employee IDs who can help
- `startDate` / `endDate` - Date range
- `priority` - U&I, NU&I, U&NI, NU&NI (Eisenhower Matrix)
- `status` - Yet to Start, In Progress, Delayed, Done, Cancel, Hold, ReOpened, Stop
- `estimatedHours` / `actualHours` - Time tracking
- `projectId` / `subprojectId` - Project hierarchy
- `parent_task_id` - For subtasks (full tasks under parent tasks)
- `remarks` - Additional notes
- `difficulties` - Challenges faced
- Timer fields (state, start time, paused time, total time, sessions)

**Task Features:**
- Multiple assignees (primary + support team)
- Timer functionality (start, pause, resume, stop)
- Checklists (simple todo items)
- Subtasks (full tasks nested under parent - **✅ FULLY IMPLEMENTED**)
- Related items linking (blocks, is_blocked_by, relates_to, duplicates)
- Activity logging
- File attachments
- Recursive tasks (Daily, Weekly, Monthly, Annually)

**Task Display:**
- List view uses `name` field
- Detail view shows full `description`
- Support tasks highlighted with amber background
- Color-coded status and priority badges

### 3.2 Bug Tracking (Development Module)

**Bug Fields:**
- `bug_id` - Unique ID (e.g., BUG-0001, BUG-0002)
- `title` - Bug title
- `description` - Full description
- `type` - Bug, Feature Request, Enhancement
- `severity` - Minor, Major, Critical
- `status` - Open, In Progress, Resolved, Closed, Reopened
- `priority` - Low, Medium, High, Critical
- `assignedTo` - Array of employee IDs
- `reportedBy` - Reporter employee ID
- `environment` - Development, Staging, Production
- `browserInfo` / `deviceInfo` - Environment details
- `serverLogs` / `frontendLogs` - Error logs
- `expectedBehavior` / `actualBehavior` - Bug details
- `attachments` - S3 URLs (JSON array)
- `parent_dev_id` - For subtasks (full bugs under parent bugs)
- Timer fields (same as tasks)

**Bug Features:**
- Multiple attachments via S3
- Development checklists
- Related items linking
- Activity logging
- Timer functionality

### 3.3 Checklists vs Subtasks

**IMPORTANT DISTINCTION:**

**Checklists** (Simple Todo Items):
- Stored in `task_checklists` and `development_checklists` tables
- Simple description + status + assignee
- Cannot have their own checklists or subtasks
- Used for breaking down work into small steps
- Example: "Review code", "Write tests", "Update documentation"

**Subtasks** (Full Tasks/Bugs):
- Stored in `tasks` table with `parent_task_id` set
- Stored in `bugs` table with `parent_dev_id` set
- Full task/bug with all fields (name, description, assignees, dates, etc.)
- Can have their own checklists and subtasks (nested hierarchy)
- Example: A feature task with multiple implementation subtasks

**Implementation Status:**
- ✅ Checklists: FULLY IMPLEMENTED (renamed from subtasks in Priority 5)
- ✅ Subtasks: DATABASE READY (parent columns exist with foreign keys and indexes)
- ✅ Subtasks: UI FULLY IMPLEMENTED (ClickUp-style expandable display with hierarchy)

**Subtask UI Features:**
- ✅ Hierarchical display on tasks and development list pages
- ✅ Expandable/collapsible tree view with chevron icons
- ✅ Inline subtask creation from parent detail page
- ✅ Breadcrumb navigation showing full parent-child hierarchy
- ✅ Visual indentation for nested levels
- ✅ Automatic filtering (subtasks hidden from main list, shown only under parents)
- ✅ Recursive rendering (subtasks can have their own subtasks)

### 3.4 Related Items Linking

**Relationship Types:**
- `relates_to` - General relationship (bidirectional)
- `blocks` - This item blocks another (reverse: is_blocked_by)
- `is_blocked_by` - This item is blocked by another (reverse: blocks)
- `duplicates` - This item duplicates another (one-way)

**Supported Relationships:**
- Task → Task
- Task → Development/Bug
- Development/Bug → Development/Bug

**Features:**
- ✅ Database tables created
- ✅ API routes implemented (GET, POST, DELETE)
- ✅ UI component created (`RelatedItemsManager`)
- ✅ Add relationship form with search functionality
- ✅ Display grouped by relationship type
- ✅ Color-coded badges
- ✅ Integrated into task and bug detail pages

### 3.5 Project Hierarchy

**Structure:**
- Projects (top level)
- Subprojects (under projects)
- Tasks (assigned to project/subproject)
- Bugs (assigned to project/subproject)

**Project Fields:**
- `id` - Unique ID (e.g., PRJ-001)
- `name` - Project name
- `description` - Project description
- `status` - Active, On Hold, Completed, Cancelled
- `startDate` / `endDate` - Timeline
- `parentProjectId` - For subprojects

### 3.6 Leave & WFH Management

**Leave Application Fields:**
- `application_id` - Unique ID (e.g., LEAVE-001)
- `employee_id` / `employee_name` - Applicant
- `leave_type` - Sick, Casual, Annual, Emergency, Maternity, Paternity
- `reason` - Leave reason
- `from_date` / `to_date` - Date range
- `is_half_day` - Half-day flag
- `emergency_contact` - Contact during leave
- `status` - Pending, Approved, Rejected
- `manager_id` - Approving manager
- `approved_by` / `approval_date` / `approval_remarks` - Approval details

**WFH Application Fields:**
- Similar to leave applications
- No leave type (always WFH)

**Workflow:**
1. Employee submits application
2. Manager receives email notification
3. Manager approves/rejects
4. Employee receives email notification
5. Activity logged

### 3.7 Activity Logging

**Logged Events:**
- Task created/updated/deleted
- Bug created/updated/deleted
- Status changes
- Assignment changes
- Timer events (start, pause, resume, stop)
- Comments added
- Checklist items added/completed/deleted
- Relationships added/removed
- Leave/WFH applications submitted/approved/rejected

**Activity Log Fields:**
- `entity_type` - task, bug, leave, wfh, project
- `entity_id` - ID of the entity
- `action` - created, updated, deleted, status_changed, etc.
- `performed_by` - Employee ID
- `changes` - JSON of old/new values
- `comment` - Optional comment text
- `created_at` - Timestamp

**Display:**
- Unified timeline component
- Grouped by date
- Color-coded by action type
- User avatars
- Expandable change details

### 3.8 Timer Functionality

**Timer States:**
- `stopped` - Not running
- `running` - Currently running
- `paused` - Paused

**Timer Fields:**
- `timer_state` - Current state
- `timer_start_time` - When timer started
- `timer_paused_time` - Total paused time (milliseconds)
- `timer_total_time` - Total tracked time (milliseconds)
- `timer_sessions` - JSON array of timer sessions

**Features:**
- Start/pause/resume/stop timer
- Multiple sessions per task/bug
- Automatic time calculation
- Activity logging for timer events
- Display in task/bug detail page

### 3.9 File Uploads (AWS S3)

**Configuration:**
- Bucket: `amtariksha`
- Region: `ap-south-1`
- Access: Public read
- CORS: Configured for web app

**Upload Process:**
1. User selects files
2. Frontend uploads to S3 via API route
3. API route generates signed URL
4. File uploaded to S3
5. S3 URL stored in database (JSON array for bugs)

**Supported Entities:**
- Bug attachments (multiple files)
- Task attachments (future enhancement)

### 3.10 Email Notifications

**SMTP Configuration:**
- Host: `smtp.gmail.com`
- Port: 465 (SSL)
- User: `amtariksha@gmail.com`
- Password: App-specific password

**Notification Types:**
- Task assigned
- Task status changed
- Bug assigned
- Leave application submitted
- Leave application approved/rejected
- WFH application submitted
- WFH application approved/rejected

**User Preferences:**
- Stored in `user_notification_preferences` table
- Per-notification-type enable/disable
- Managed in Profile → Notifications page

---

## 4. Database Schema

### 4.1 Core Tables

#### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  telegram_token VARCHAR(255),
  department VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'employee',
  manager_id VARCHAR(50),
  manager_email VARCHAR(255),
  is_today_task BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (manager_id) REFERENCES users(employee_id)
);
```

#### tasks
```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(100) UNIQUE NOT NULL,
  internal_id VARCHAR(100) UNIQUE NOT NULL,
  select_type VARCHAR(20) DEFAULT 'Normal',
  recursive_type VARCHAR(20),
  name VARCHAR(150) NOT NULL,  -- NEW: Short title for list display
  description TEXT NOT NULL,    -- Full details
  assigned_to JSON NOT NULL,    -- Array of employee IDs
  assigned_by VARCHAR(50) NOT NULL,
  support JSON,                 -- Array of employee IDs
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  priority VARCHAR(10) NOT NULL,
  estimated_hours DECIMAL(10, 2) DEFAULT 0,
  actual_hours DECIMAL(10, 2) DEFAULT 0,
  daily_hours JSON,
  status VARCHAR(20) DEFAULT 'Yet to Start',
  remarks TEXT,
  difficulties TEXT,
  project_id VARCHAR(50),
  parent_task_id VARCHAR(50),  -- For subtasks
  timer_state VARCHAR(50),
  timer_start_time TIMESTAMP,
  timer_paused_time BIGINT,
  timer_total_time BIGINT,
  timer_sessions JSON,
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (assigned_by) REFERENCES users(employee_id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
);
```

#### bugs
```sql
CREATE TABLE bugs (
  id SERIAL PRIMARY KEY,
  bug_id VARCHAR(100) UNIQUE NOT NULL,
  internal_id VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'Bug',
  severity VARCHAR(20) DEFAULT 'Minor',
  status VARCHAR(20) DEFAULT 'Open',
  priority VARCHAR(20) DEFAULT 'Medium',
  assigned_to JSON,
  assigned_by VARCHAR(50),
  reported_by VARCHAR(50) NOT NULL,
  environment VARCHAR(100),
  browser_info VARCHAR(255),
  device_info VARCHAR(255),
  server_logs TEXT,
  frontend_logs TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  attachments TEXT,  -- JSON array of S3 URLs
  estimated_hours DECIMAL(10, 2),
  actual_hours DECIMAL(10, 2),
  resolved_date TIMESTAMP,
  closed_date TIMESTAMP,
  reopened_count INT DEFAULT 0,
  tags VARCHAR(500),
  related_bugs VARCHAR(500),
  project_id VARCHAR(50),
  parent_dev_id VARCHAR(50),  -- For subtasks
  timer_state VARCHAR(50),
  timer_start_time TIMESTAMP,
  timer_paused_time BIGINT,
  timer_total_time BIGINT,
  timer_sessions JSON,
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (reported_by) REFERENCES users(employee_id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (parent_dev_id) REFERENCES bugs(bug_id) ON DELETE CASCADE
);
```

### 4.2 Checklist Tables

#### task_checklists
```sql
CREATE TABLE task_checklists (
  id SERIAL PRIMARY KEY,
  parent_task_id VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Not Started',
  is_completed BOOLEAN DEFAULT FALSE,
  assigned_to VARCHAR(50) NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  display_order INT DEFAULT 0,
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(employee_id),
  FOREIGN KEY (created_by) REFERENCES users(employee_id)
);
```

#### development_checklists
```sql
CREATE TABLE development_checklists (
  id SERIAL PRIMARY KEY,
  parent_bug_id VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Not Started',
  is_completed BOOLEAN DEFAULT FALSE,
  assigned_to VARCHAR(50) NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  display_order INT DEFAULT 0,
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (parent_bug_id) REFERENCES bugs(bug_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(employee_id),
  FOREIGN KEY (created_by) REFERENCES users(employee_id)
);
```

### 4.3 Relationship Tables

#### task_relationships
```sql
CREATE TABLE task_relationships (
  id SERIAL PRIMARY KEY,
  source_task_id VARCHAR(50) NOT NULL,
  target_task_id VARCHAR(50) NOT NULL,
  relationship_type VARCHAR(20) NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (source_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (target_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  UNIQUE (source_task_id, target_task_id, relationship_type)
);
```

#### task_development_relationships
```sql
CREATE TABLE task_development_relationships (
  id SERIAL PRIMARY KEY,
  source_task_id VARCHAR(50),
  target_dev_id VARCHAR(50),
  relationship_type VARCHAR(20) NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (source_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (target_dev_id) REFERENCES bugs(bug_id) ON DELETE CASCADE,
  UNIQUE (source_task_id, target_dev_id, relationship_type)
);
```

#### development_relationships
```sql
CREATE TABLE development_relationships (
  id SERIAL PRIMARY KEY,
  source_dev_id VARCHAR(50) NOT NULL,
  target_dev_id VARCHAR(50) NOT NULL,
  relationship_type VARCHAR(20) NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (source_dev_id) REFERENCES bugs(bug_id) ON DELETE CASCADE,
  FOREIGN KEY (target_dev_id) REFERENCES bugs(bug_id) ON DELETE CASCADE,
  UNIQUE (source_dev_id, target_dev_id, relationship_type)
);
```

---

## 5. Business Rules

### 5.1 Task Rules

1. **Task ID Generation:**
   - Format: `JSR-XXXX` (e.g., JSR-0001, JSR-0002)
   - Sequential numbering
   - Generated server-side in API route
   - Never reused (even for deleted tasks)

2. **Multiple Assignees:**
   - `assignedTo` is an array of employee IDs
   - At least one assignee required
   - `assignedBy` is the creator (single employee ID)
   - `support` is optional array of helpers

3. **Task Name vs Description:**
   - `name` is required, 3-150 characters
   - Used in list views for brevity
   - `description` is required, unlimited length
   - Used in detail views for full context

4. **Status Transitions:**
   - Yet to Start → In Progress → Done
   - Yet to Start → Delayed → In Progress → Done
   - Any status → Hold → In Progress → Done
   - Any status → Cancel (terminal)
   - Done → ReOpened → In Progress → Done

5. **Timer Rules:**
   - Only one timer can run per user at a time
   - Timer automatically pauses when starting another task's timer
   - Timer sessions stored in JSON array
   - Total time calculated from all sessions

6. **Deletion:**
   - Soft delete (sets `deleted_at` timestamp)
   - Deleted tasks hidden from normal views
   - Can be restored from "Deleted Items" page
   - Permanent delete removes from database

### 5.2 Bug Rules

1. **Bug ID Generation:**
   - Format: `BUG-XXXX` (e.g., BUG-0001, BUG-0002)
   - Sequential numbering
   - Generated server-side
   - Never reused

2. **Attachments:**
   - Stored as JSON array of S3 URLs
   - Multiple files supported
   - Max file size: 10MB per file
   - Supported formats: images, PDFs, logs

3. **Status Transitions:**
   - Open → In Progress → Resolved → Closed
   - Closed → Reopened → In Progress → Resolved → Closed
   - Reopened count incremented on each reopen

### 5.3 Leave & WFH Rules

1. **Application ID Generation:**
   - Leave: `LEAVE-XXXX`
   - WFH: `WFH-XXXX`
   - Sequential numbering

2. **Approval Workflow:**
   - Employee submits → Manager approves/rejects
   - Email sent to manager on submission
   - Email sent to employee on approval/rejection
   - Cannot edit after submission
   - Cannot delete after approval

3. **Date Validation:**
   - `from_date` must be <= `to_date`
   - Cannot apply for past dates (except emergency leave)
   - Half-day flag for single-day applications

### 5.4 Permission Rules

1. **Role Hierarchy:**
   - `admin` - Full access to everything
   - `top_management` - View all, manage most
   - `management` - View team, manage team tasks
   - `employee` - View own, manage own tasks

2. **Task Permissions:**
   - Create: All roles
   - View: Own tasks + assigned tasks + (management: team tasks)
   - Edit: Assignees + creator + management
   - Delete: Creator + admin
   - Assign to others: Management + admin

3. **Bug Permissions:**
   - Create: All roles
   - View: All roles (bugs are visible to everyone)
   - Edit: Assignees + reporter + management
   - Delete: Reporter + admin

4. **Leave/WFH Permissions:**
   - Create: All roles (for self)
   - View: Own applications + (management: team applications)
   - Approve/Reject: Manager of applicant + admin

---

## 6. User Roles & Permissions

### 6.1 Role Definitions

#### Employee
- Create tasks/bugs for self
- View own tasks/bugs
- Update own tasks/bugs
- Apply for leave/WFH
- View own applications

#### Management
- All employee permissions
- View team tasks/bugs
- Assign tasks to team members
- Approve/reject team leave/WFH
- View team performance

#### Top Management
- All management permissions
- View all tasks/bugs across organization
- View all leave/WFH applications
- Access analytics and reports

#### Admin
- All permissions
- Manage users
- Manage settings (dropdowns, permissions)
- Permanent delete
- System configuration

### 6.2 Permission Matrix

| Action | Employee | Management | Top Management | Admin |
|--------|----------|------------|----------------|-------|
| Create Task | ✅ | ✅ | ✅ | ✅ |
| View Own Tasks | ✅ | ✅ | ✅ | ✅ |
| View Team Tasks | ❌ | ✅ | ✅ | ✅ |
| View All Tasks | ❌ | ❌ | ✅ | ✅ |
| Edit Own Tasks | ✅ | ✅ | ✅ | ✅ |
| Edit Team Tasks | ❌ | ✅ | ✅ | ✅ |
| Delete Own Tasks | ✅ | ✅ | ✅ | ✅ |
| Delete Any Task | ❌ | ❌ | ❌ | ✅ |
| Assign to Others | ❌ | ✅ | ✅ | ✅ |
| Approve Leave | ❌ | ✅ (team) | ✅ (all) | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| Manage Settings | ❌ | ❌ | ❌ | ✅ |

---

## 7. Workflows

### 7.1 Task Creation Workflow

1. User clicks "Create Task"
2. Form displays with required fields:
   - Task Name (3-150 chars)
   - Description (full details)
   - Project/Subproject (required)
   - Department (required)
   - Status (default: Yet to Start)
   - Priority (required)
   - Start/End Date (required)
   - Estimated Hours (required, format: hh:mm:ss)
   - Assign to someone else (optional)
   - Multiple assignees (optional)
   - Support team (optional)
3. User fills form and clicks "Create"
4. Frontend validates:
   - All required fields filled
   - Name length 3-150 chars
   - Valid date range
   - Valid time format
5. API route generates task ID (JSR-XXXX)
6. Task saved to database
7. Activity log entry created
8. Email notification sent to assignees
9. User redirected to task detail page

### 7.2 Task Update Workflow

1. User opens task detail page
2. User clicks "Update Status" or "Edit" button
3. Modal displays with current values
4. User updates fields
5. User clicks "Save"
6. Frontend validates changes
7. API route updates task
8. Activity log entry created with old/new values
9. Email notification sent if status/assignee changed
10. UI refreshes with new data

### 7.3 Timer Workflow

1. User clicks "Start Timer" on task
2. Frontend checks if another timer is running
3. If yes, pause other timer first
4. Start new timer:
   - Set `timer_state` = 'running'
   - Set `timer_start_time` = now
5. Timer displays elapsed time (updates every second)
6. User clicks "Pause":
   - Calculate elapsed time
   - Add to `timer_paused_time`
   - Set `timer_state` = 'paused'
7. User clicks "Resume":
   - Set `timer_start_time` = now
   - Set `timer_state` = 'running'
8. User clicks "Stop":
   - Calculate final elapsed time
   - Add to `timer_total_time`
   - Create timer session entry in `timer_sessions` JSON
   - Set `timer_state` = 'stopped'
9. Activity log entries created for all timer events

### 7.4 Leave Application Workflow

1. Employee clicks "Apply Leave"
2. Form displays:
   - Leave Type (dropdown)
   - Reason (required)
   - From/To Date (required)
   - Half Day (checkbox)
   - Emergency Contact (optional)
3. Employee submits
4. API generates application ID (LEAVE-XXXX)
5. Application saved with status = 'Pending'
6. Email sent to manager
7. Manager opens "Approvals" page
8. Manager sees pending application
9. Manager clicks "Approve" or "Reject"
10. Approval modal displays
11. Manager enters remarks (optional)
12. Manager confirms
13. Application status updated
14. Email sent to employee
15. Activity log entry created

---

## 8. API Endpoints

### 8.1 Authentication

- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout and clear cookies
- `GET /api/auth/me` - Get current user info

### 8.2 Tasks

- `GET /api/tasks` - Get all tasks (filtered by permissions)
- `GET /api/tasks/[taskId]` - Get single task
- `POST /api/tasks` - Create new task (supports `parentTaskId` for subtasks)
- `PUT /api/tasks/[taskId]` - Update task (supports `parentTaskId` for subtasks)
- `DELETE /api/tasks/[taskId]` - Soft delete task
- `POST /api/tasks/[taskId]/timer` - Start/pause/stop timer
- `GET /api/tasks/subtasks?parentTaskId=XXX` - Get all subtasks for a parent task

### 8.3 Bugs (Development)

- `GET /api/bugs` - Get all bugs
- `GET /api/bugs/[bugId]` - Get single bug
- `POST /api/bugs` - Create new bug (supports `parentDevId` for subtasks)
- `PUT /api/bugs/[bugId]` - Update bug (supports `parentDevId` for subtasks)
- `DELETE /api/bugs/[bugId]` - Soft delete bug
- `GET /api/bugs/subtasks?parentDevId=XXX` - Get all subtasks for a parent bug

### 8.4 Checklists

- `GET /api/task-checklists?taskId=XXX` - Get task checklists
- `POST /api/task-checklists` - Create checklist item
- `PUT /api/task-checklists/[id]` - Update checklist item
- `DELETE /api/task-checklists/[id]` - Delete checklist item
- `GET /api/development-checklists?bugId=XXX` - Get bug checklists
- `POST /api/development-checklists` - Create checklist item
- `PUT /api/development-checklists/[id]` - Update checklist item
- `DELETE /api/development-checklists/[id]` - Delete checklist item

### 8.5 Relationships

- `GET /api/relationships?id=XXX&type=task|development` - Get relationships
- `POST /api/relationships` - Create relationship
- `DELETE /api/relationships/[id]?type=task|task-development|development` - Delete relationship

### 8.6 Leave & WFH

- `GET /api/leaves` - Get leave applications
- `POST /api/leaves` - Create leave application
- `PUT /api/leaves/[id]` - Update leave application
- `GET /api/wfh` - Get WFH applications
- `POST /api/wfh` - Create WFH application
- `PUT /api/wfh/[id]` - Update WFH application

### 8.7 Activity Log

- `GET /api/activity-log?entityType=XXX&entityId=XXX` - Get activity log
- `POST /api/activity-log` - Create activity log entry

### 8.8 Settings

- `GET /api/settings` - Get all settings
- `POST /api/settings` - Create/update setting
- `DELETE /api/settings/[id]` - Delete setting

---

## 9. UI/UX Guidelines

### 9.1 Design Principles

1. **Consistency:** Use consistent colors, spacing, and components
2. **Clarity:** Clear labels, helpful placeholders, validation messages
3. **Efficiency:** Minimize clicks, keyboard shortcuts, bulk actions
4. **Feedback:** Loading states, success/error messages, confirmations
5. **Accessibility:** Proper contrast, keyboard navigation, screen reader support

### 9.2 Color Scheme

**Status Colors:**
- Yet to Start: Gray (`bg-gray-100 text-gray-800`)
- In Progress: Yellow (`bg-yellow-100 text-yellow-800`)
- Done: Green (`bg-green-100 text-green-800`)
- Delayed: Red (`bg-red-100 text-red-800`)
- Hold: Orange (`bg-orange-100 text-orange-800`)
- Cancel: Gray (`bg-gray-200 text-gray-600`)

**Priority Colors:**
- U&I (Urgent & Important): Red (`bg-red-100 text-red-800`)
- NU&I (Not Urgent & Important): Blue (`bg-blue-100 text-blue-800`)
- U&NI (Urgent & Not Important): Yellow (`bg-yellow-100 text-yellow-800`)
- NU&NI (Not Urgent & Not Important): Gray (`bg-gray-100 text-gray-800`)

**Support Task Highlight:**
- Background: Amber (`bg-amber-50 border-amber-200`)
- Badge: Amber (`bg-amber-100 text-amber-800`)

### 9.3 Component Library

**Buttons:**
- Primary: Blue background, white text
- Secondary: White background, gray border
- Danger: Red background, white text
- Loading: Disabled with spinner

**Forms:**
- Labels: Bold, above input
- Inputs: Border, rounded, focus ring
- Validation: Red border + error message below
- Required: Asterisk (*) after label

**Cards:**
- White background
- Border: `border-gray-200`
- Shadow: `shadow-sm`
- Hover: `hover:shadow-md`
- Padding: `p-6`

**Modals:**
- Overlay: Semi-transparent black
- Content: White, centered, max-width
- Close: X button top-right
- Actions: Bottom-right (Cancel + Confirm)

---

## 10. Integration Points

### 10.1 Email (Nodemailer)

**Configuration:**
- SMTP: Gmail (smtp.gmail.com:465)
- From: amtariksha@gmail.com
- Templates: HTML emails with inline CSS

**Email Types:**
- Task assigned
- Task status changed
- Leave application submitted
- Leave application approved/rejected
- WFH application submitted
- WFH application approved/rejected

### 10.2 File Storage (AWS S3)

**Configuration:**
- Bucket: amtariksha
- Region: ap-south-1
- Access: Public read
- CORS: Configured

**Upload Flow:**
1. Frontend selects files
2. POST to `/api/upload`
3. API generates S3 key
4. API uploads to S3
5. API returns S3 URL
6. Frontend stores URL in database

### 10.3 Database (PostgreSQL/Supabase)

**Connection:**
- Pooler: PgBouncer (IPv4-compatible)
- Max connections: 3 per serverless instance
- Idle timeout: 10 seconds
- Connection timeout: 5 seconds

**Query Patterns:**
- Parameterized queries (prevent SQL injection)
- Transactions for multi-step operations
- Indexes on frequently queried columns
- Soft delete (deleted_at IS NULL)

---

## 11. Future Enhancements

### 11.1 Pending Features

1. **Advanced Analytics:**
   - Task completion trends
   - Team performance metrics
   - Time tracking reports
   - Burndown charts

2. **Mobile App Enhancements:**
   - Push notifications
   - Offline mode
   - Camera integration for bug screenshots
   - Voice notes

3. **Collaboration Features:**
   - Real-time updates (WebSockets)
   - @mentions in comments
   - Task watchers
   - Reactions to comments

5. **Automation:**
   - Recurring task templates
   - Auto-assignment rules
   - Status auto-transitions
   - Reminder notifications

6. **Integrations:**
   - Slack notifications
   - GitHub issue sync
   - Calendar integration
   - Time tracking tools

### 11.2 Technical Debt

1. **Testing:**
   - Unit tests for critical functions
   - Integration tests for API routes
   - E2E tests for key workflows

2. **Performance:**
   - Query optimization
   - Caching layer (Redis)
   - Image optimization
   - Code splitting

3. **Security:**
   - Rate limiting
   - CSRF protection
   - Input sanitization
   - Security headers

4. **Documentation:**
   - API documentation (Swagger)
   - Component storybook
   - Developer onboarding guide
   - User manual

---

## 12. Appendix

### 12.1 Glossary

- **Task:** Work item with name, description, assignees, dates, etc.
- **Bug:** Development item (bug, feature request, enhancement)
- **Checklist:** Simple todo item under a task/bug
- **Subtask:** Full task/bug nested under a parent task/bug
- **Related Item:** Linked task/bug with relationship type
- **Timer:** Time tracking for tasks/bugs
- **Activity Log:** Audit trail of all changes
- **Soft Delete:** Mark as deleted without removing from database
- **Hard Delete:** Permanently remove from database

### 12.2 Migration History

- **001-003:** Initial schema and projects
- **004-006:** Bug tracking enhancements
- **007:** Subtasks (now checklists) and admin user
- **008:** Role-based permissions
- **009-010:** Notification preferences
- **011:** Activity log table
- **012-013:** Timer functionality
- **014:** Sequential ID format (JSR-XXXX, BUG-XXXX)
- **015:** Settings restructure
- **016-017:** Multiple assignees
- **018:** Task name field
- **019:** Bug attachments
- **020:** Checklists rename + subtask columns
- **021:** Related items with relationship types
- **022:** PostgreSQL migration (task name field)

### 12.3 Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `SMTP_HOST` - Email SMTP host
- `SMTP_PORT` - Email SMTP port
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email password
- `AWS_ACCESS_KEY_ID` - S3 access key
- `AWS_SECRET_ACCESS_KEY` - S3 secret key
- `AWS_REGION` - S3 region
- `AWS_S3_BUCKET` - S3 bucket name

**Optional:**
- `EMAIL_ENABLED` - Enable/disable emails (default: true)
- `EMAIL_TEST_MODE` - Test mode (logs instead of sending)
- `EMAIL_DEBUG` - Debug mode (verbose logging)

---

**Document Version:** 2.0
**Last Updated:** 2025-01-04
**Maintained By:** Development Team
**Review Cycle:** Quarterly

---

**END OF DOCUMENT**


