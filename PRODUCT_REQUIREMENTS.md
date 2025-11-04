# JSR Task Management System - Product Requirements Document (PRD)

**Version:** 1.0  
**Last Updated:** 2025-01-04  
**System Type:** AI-Driven Development Life Cycle (AIDLC) Task Management Platform  
**Target Users:** Internal team members, managers, and administrators

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Core Business Rules](#core-business-rules)
4. [Database Schema](#database-schema)
5. [Feature Specifications](#feature-specifications)
6. [API Documentation](#api-documentation)
7. [Authentication & Authorization](#authentication--authorization)
8. [UI/UX Patterns](#uiux-patterns)
9. [Integration & Services](#integration--services)
10. [Deployment Architecture](#deployment-architecture)
11. [Critical Business Logic](#critical-business-logic)

---

## 1. Executive Summary

### 1.1 Product Overview

JSR Task Management System is a comprehensive task and development tracking platform designed for AI-driven development workflows. The system manages:

- **Tasks**: Work assignments with timers, subtasks, and progress tracking
- **Development Module** (formerly "Bugs"): Feature requests and bug fixes
- **Leave Management**: Employee leave applications and approvals
- **Work From Home (WFH)**: WFH requests and approvals
- **Projects**: Hierarchical project organization
- **User Management**: Role-based access control and permissions
- **Time Tracking**: Integrated timer system for tasks and development items

### 1.2 Key Terminology Changes

**IMPORTANT:** The system has undergone terminology updates to reflect modern development practices:

- **"Bugs" → "Development"**: The bugs module is now called "Development" in all user-facing interfaces
- **Database tables remain as `bugs`** for backward compatibility
- **SDLC → AIDLC**: Transitioning from Software Development Life Cycle to AI-Driven Development Life Cycle
- **Development Types**: Feature requests and bug fixes (distinguished by `type` field)

### 1.3 Technology Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: PostgreSQL (Supabase) - migrated from MySQL
- **File Storage**: AWS S3 (bucket: amtariksha, region: ap-south-1)
- **Email**: Gmail SMTP (smtp.gmail.com:465)
- **Deployment**: Vercel (serverless functions)
- **Mobile**: React Native + Expo (separate app in monorepo)

---

## 2. System Architecture

### 2.1 Monorepo Structure

```
jsr_web_app-jsr_tool/
├── apps/
│   ├── web/              # Next.js 16 web application
│   │   ├── src/
│   │   │   ├── app/      # Next.js App Router pages
│   │   │   ├── components/  # React components
│   │   │   ├── lib/      # Utilities, services, types
│   │   │   └── ...
│   │   ├── database/     # Migration files
│   │   └── ...
│   └── mobile/           # React Native + Expo mobile app
│       └── src/
└── packages/
    └── shared/           # Shared TypeScript types and utilities
```

### 2.2 Database Architecture

**Database Provider**: Supabase (PostgreSQL)  
**Connection**: PostgreSQL connection pool (max: 50 connections)  
**Host**: `ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com`  
**Database**: `task`  
**User**: `u806435594_swarg`

**Key Design Patterns**:
- Soft delete pattern (using `deleted_at` and `deleted_by` columns)
- Parameterized queries for SQL injection prevention
- Foreign key constraints for referential integrity
- Indexes on frequently queried columns
- JSONB columns for flexible data (support, daily_hours, timer_sessions, attachments)

---

## 3. Core Business Rules

### 3.1 Timer Visibility Rules

**CRITICAL BUSINESS RULE - NEVER CHANGE WITHOUT EXPLICIT APPROVAL:**

The timer button/widget **MUST NOT** be displayed for tasks or development items with the following statuses:

**For Tasks:**
- Status = "Done"
- Status = "Cancel"
- Status = "Hold"
- Status = "Stop"

**For Development Items (Bugs):**
- Status = "Closed"
- Status = "Resolved"

**Implementation Location**: `apps/web/src/components/TimerButton.tsx` (line 28)

```typescript
const disabledStatuses = ['Done', 'Cancel', 'Hold', 'Stop']
const isDisabled = status ? disabledStatuses.includes(status) : false
```

**Rationale**: Timers should only be active for work in progress. Completed, cancelled, or stopped work should not accrue additional time.

### 3.2 Task Status Transitions

**Valid Status Flow for Tasks:**

```
Yet to Start → In Progress → Done
     ↓              ↓
   Hold ←──────────┘
     ↓
   Cancel (terminal state)

In Progress → Delayed (auto-set when end_date < today)
In Progress → Stop (manual pause)
Stop → In Progress (resume)
Done → ReOpened → In Progress
```

**Auto-Delayed Logic** (`apps/web/src/lib/businessRules.ts`):
- Tasks are automatically marked as "Delayed" when `today > end_date` AND status is NOT in ['Done', 'Cancel', 'Stop', 'Delayed']
- Runs via cron job or manual trigger at `/api/tasks/update-delayed`

### 3.3 Development Item (Bug) Status Transitions

**Valid Status Flow:**

```
New → In Progress → Resolved → Closed
  ↓
Reopened → In Progress → Resolved → Closed
```

**Status Definitions:**
- **New**: Just reported, not yet assigned or started
- **In Progress**: Actively being worked on
- **Resolved**: Fix completed, awaiting verification
- **Closed**: Verified and closed (terminal state)
- **Reopened**: Previously resolved but issue persists

### 3.4 Role-Based Permissions

**User Roles** (in order of privilege):

1. **employee**: Regular employee (can manage own tasks)
2. **management**: Manager (can manage team tasks, approve leave/WFH)
3. **top_management**: Senior management (can view all reports, manage all tasks)
4. **admin**: System administrator (full access to all features)

**Permission Matrix**:

| Feature | employee | management | top_management | admin |
|---------|----------|------------|----------------|-------|
| View own tasks | ✅ | ✅ | ✅ | ✅ |
| View team tasks | ❌ | ✅ | ✅ | ✅ |
| View all tasks | ❌ | ❌ | ✅ | ✅ |
| Create tasks | ✅ | ✅ | ✅ | ✅ |
| Edit own tasks | ✅ | ✅ | ✅ | ✅ |
| Edit team tasks | ❌ | ✅ | ✅ | ✅ |
| Delete tasks | ❌ | ❌ | ✅ | ✅ |
| Approve leave/WFH | ❌ | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| Manage projects | ❌ | ❌ | ✅ | ✅ |
| View analytics | ❌ | ✅ | ✅ | ✅ |
| Manage settings | ❌ | ❌ | ❌ | ✅ |

**Permission Override System**:
- Role permissions are defined in `role_permissions` table
- User-specific overrides can be set in `user_permissions` table
- Effective permissions = Role permissions + User overrides
- User overrides take precedence over role permissions

### 3.5 Work Hours Rules

**Full Day**: 8.5 hours
**Half Day**: 4.5 hours

**Non-Working Days**:
- All Sundays
- 2nd and 4th Saturday of each month

**Holiday Calculation** (`apps/web/src/lib/dateUtils.ts`):
- Automatically excludes Sundays and designated Saturdays
- Used for leave calculations and work hour validations

### 3.6 Task Warning System

**Warning Trigger**: Employee has NO active tasks for the current day on a working day

**Warning Process**:
1. System checks if today is a working day (not Sunday, not 2nd/4th Saturday)
2. Checks if employee has any tasks where `start_date <= today <= end_date` AND status NOT IN ['Done', 'Cancel', 'Stop']
3. If no active tasks found, increment `warning_count` in users table
4. Maximum warnings: 5 (configurable in `BUSINESS_RULES.WARNINGS.MAX_COUNT`)

**Warning Reset**: When employee is assigned a new task or completes a task

### 3.7 Project Hierarchy Rules

**Maximum Depth**: 2 levels (Main Project → Sub-Project)

**Rules**:
- Main projects have `parent_project_id = NULL`
- Sub-projects have `parent_project_id = <main_project_id>`
- Sub-projects **CANNOT** have sub-projects (enforced in UI and API)
- Deleting a main project soft-deletes all sub-projects
- Projects can be Active, Inactive, or Deleted (soft delete)

### 3.8 Leave and WFH Approval Rules

**Approval Hierarchy**:
- Employee submits leave/WFH application
- Application goes to employee's direct manager (`manager_id` from users table)
- Manager can Approve or Reject with optional reason
- Status: Pending → Approved/Rejected (terminal states)

**Half-Day Rules**:
- Half-day leave/WFH reduces required work hours from 8.5 to 4.5 hours
- Can be applied for morning or afternoon (tracked in `is_half_day` field)

**Validation**:
- `from_date` must be <= `to_date`
- Cannot apply for past dates (enforced in UI)
- Cannot have overlapping leave/WFH applications (enforced in API)

---

## 4. Database Schema

### 4.1 Core Tables

#### 4.1.1 users

**Purpose**: Employee/User information and authentication

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| employee_id | VARCHAR(50) | NOT NULL, UNIQUE | Unique employee ID (e.g., "AM-0001") |
| name | VARCHAR(255) | NOT NULL | Full name |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Email address (login) |
| phone | VARCHAR(20) | | Phone number |
| telegram_token | VARCHAR(255) | | Telegram bot token for notifications |
| department | VARCHAR(100) | NOT NULL | Department name |
| manager_email | VARCHAR(255) | | Manager's email |
| manager_id | VARCHAR(50) | FK → users(employee_id) | Manager's employee ID |
| is_today_task | BOOLEAN | DEFAULT FALSE | Has task for today |
| warning_count | INTEGER | DEFAULT 0 | Task warning count |
| role | VARCHAR(20) | CHECK IN ('employee', 'management', 'top_management', 'admin') | User role |
| password | VARCHAR(255) | NOT NULL | Hashed password (bcrypt) |
| status | VARCHAR(20) | CHECK IN ('active', 'inactive') | Account status |
| is_system_admin | BOOLEAN | DEFAULT FALSE | System admin flag |
| hours_log | TEXT | | Work hours log (legacy) |
| id_card_photo | VARCHAR(500) | | AWS S3 URL for ID card photo |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: employee_id, email, manager_id, department, status, role

#### 4.1.2 tasks

**Purpose**: Task management and tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| task_id | VARCHAR(100) | NOT NULL, UNIQUE | Unique task ID (e.g., "JSR-0016") |
| internal_id | VARCHAR(100) | NOT NULL, UNIQUE | Internal tracking ID |
| select_type | VARCHAR(20) | CHECK IN ('Normal', 'Recursive') | Task type |
| recursive_type | VARCHAR(20) | CHECK IN ('Daily', 'Weekly', 'Monthly', 'Annually') | Recurrence pattern |
| description | TEXT | NOT NULL | Task description/details |
| assigned_to | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Assignee employee ID |
| assigned_by | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Assigner employee ID |
| support | JSONB | | Support team member IDs (JSON array) |
| start_date | DATE | NOT NULL | Task start date |
| end_date | DATE | NOT NULL | Task end date |
| priority | VARCHAR(10) | CHECK IN ('U&I', 'NU&I', 'U&NI', 'NU&NI') | Priority (Urgent/Important matrix) |
| estimated_hours | DECIMAL(10,2) | DEFAULT 0 | Estimated hours to complete |
| actual_hours | DECIMAL(10,2) | DEFAULT 0 | Actual hours spent |
| daily_hours | JSONB | | Daily hour breakdown (JSON object) |
| status | VARCHAR(20) | CHECK IN ('Yet to Start', 'In Progress', 'Delayed', 'Done', 'Cancel', 'Hold', 'ReOpened', 'Stop') | Current status |
| remarks | TEXT | | Additional comments/notes |
| difficulties | TEXT | | Challenges faced during execution |
| timer_state | VARCHAR(50) | | Timer state (stopped, running, paused) |
| timer_start_time | TIMESTAMP | | Timer start timestamp |
| timer_paused_time | BIGINT | | Total paused time (milliseconds) |
| timer_total_time | BIGINT | | Total tracked time (milliseconds) |
| timer_sessions | JSONB | | Timer session history (JSON array) |
| project_id | VARCHAR(100) | FK → projects(project_id) | Associated project |
| subproject_id | VARCHAR(100) | FK → projects(project_id) | Associated sub-project |
| attachments | TEXT | | File attachments (comma-separated URLs) |
| related_tasks | TEXT | | Related task IDs (comma-separated) |
| deleted_at | TIMESTAMP | | Soft delete timestamp |
| deleted_by | VARCHAR(50) | FK → users(employee_id) | Who deleted the task |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: task_id, assigned_to, assigned_by, status, priority, start_date, end_date, deleted_at, created_at

**IMPORTANT**: The `remarks` field is currently used but will be deprecated in favor of the new `name` field (see Feature Requests section).

#### 4.1.3 bugs (Development Module)

**Purpose**: Bug tracking and feature request management

**Note**: Table name is `bugs` in database, but displayed as "Development" in UI.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| bug_id | VARCHAR(100) | NOT NULL, UNIQUE | Unique bug ID (e.g., "BUG-0003") |
| title | VARCHAR(500) | NOT NULL | Bug/feature title |
| description | TEXT | NOT NULL | Detailed description |
| assigned_to | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Assignee employee ID |
| assigned_by | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Assigner employee ID |
| reported_by | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Reporter employee ID |
| priority | VARCHAR(10) | CHECK IN ('Low', 'Medium', 'High', 'Critical') | Priority level |
| severity | VARCHAR(10) | CHECK IN ('Minor', 'Major', 'Critical') | Severity level |
| status | VARCHAR(20) | CHECK IN ('Open', 'In Progress', 'Resolved', 'Closed', 'Reopened') | Current status |
| environment | VARCHAR(100) | | Environment (Development, Staging, Production) |
| browser | VARCHAR(100) | | Browser information |
| server_logs | TEXT | | Server-side logs (renamed from steps_to_reproduce) |
| frontend_logs | TEXT | | Frontend console logs |
| expected_behavior | TEXT | | What should happen |
| actual_behavior | TEXT | | What actually happens |
| attachments | JSONB | | File attachments (JSON array of S3 URLs) |
| related_bugs | TEXT | | Related bug IDs (comma-separated) |
| resolution_notes | TEXT | | Resolution details |
| resolved_at | TIMESTAMP | | Resolution timestamp |
| project_id | VARCHAR(100) | FK → projects(project_id) | Associated project |
| subproject_id | VARCHAR(100) | FK → projects(project_id) | Associated sub-project |
| feature | VARCHAR(255) | | Feature name |
| type | VARCHAR(20) | CHECK IN ('testcase', 'feature', 'other') | Bug type |
| category | VARCHAR(50) | CHECK IN ('UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other') | Category |
| platform | VARCHAR(20) | CHECK IN ('iOS', 'Android', 'Web', 'All') | Affected platform |
| estimated_hours | DECIMAL(10,2) | | Estimated fix time |
| actual_hours | DECIMAL(10,2) | | Actual fix time |
| timer_state | VARCHAR(50) | | Timer state |
| timer_start_time | TIMESTAMP | | Timer start timestamp |
| timer_paused_time | BIGINT | | Total paused time (milliseconds) |
| timer_total_time | BIGINT | | Total tracked time (milliseconds) |
| timer_sessions | JSONB | | Timer session history |
| deleted_at | TIMESTAMP | | Soft delete timestamp |
| deleted_by | VARCHAR(50) | FK → users(employee_id) | Who deleted the bug |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: bug_id, assigned_to, assigned_by, reported_by, status, priority, severity, deleted_at, created_at

#### 4.1.4 projects

**Purpose**: Project hierarchy and management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| project_id | VARCHAR(100) | NOT NULL, UNIQUE | Unique project ID (e.g., "PRJ-001") |
| project_name | VARCHAR(255) | NOT NULL | Project name |
| parent_project_id | VARCHAR(100) | FK → projects(project_id) | Parent project (NULL for main projects) |
| description | TEXT | | Project description |
| status | VARCHAR(20) | CHECK IN ('active', 'inactive', 'completed') | Project status |
| created_by | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Creator employee ID |
| deleted_at | TIMESTAMP | | Soft delete timestamp |
| deleted_by | VARCHAR(50) | FK → users(employee_id) | Who deleted the project |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: project_id, parent_project_id, status, deleted_at

#### 4.1.5 subtasks (Task Checklists)

**Purpose**: Checklist items for tasks with drag-and-drop ordering

**Note**: Will be renamed to `task_checklists` in upcoming migration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| parent_task_id | VARCHAR(100) | NOT NULL, FK → tasks(task_id) | Parent task ID |
| description | TEXT | NOT NULL | Checklist item description |
| assigned_to | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Assignee employee ID |
| status | VARCHAR(20) | CHECK IN ('Not Started', 'In Progress', 'Completed') | Item status |
| is_completed | BOOLEAN | DEFAULT FALSE | Completion flag |
| display_order | INTEGER | DEFAULT 0 | Display order (for drag-and-drop) |
| created_by | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Creator employee ID |
| deleted_at | TIMESTAMP | | Soft delete timestamp |
| deleted_by | VARCHAR(50) | FK → users(employee_id) | Who deleted the item |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: parent_task_id, assigned_to, status, is_completed, deleted_at, display_order

#### 4.1.6 bug_subtasks (Development Checklists)

**Purpose**: Checklist items for development items with drag-and-drop ordering

**Note**: Will be renamed to `development_checklists` in upcoming migration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| parent_bug_id | VARCHAR(100) | NOT NULL, FK → bugs(bug_id) | Parent bug/development item ID |
| description | TEXT | NOT NULL | Checklist item description |
| assigned_to | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Assignee employee ID |
| status | VARCHAR(20) | CHECK IN ('Not Started', 'In Progress', 'Completed') | Item status |
| is_completed | BOOLEAN | DEFAULT FALSE | Completion flag |
| display_order | INTEGER | DEFAULT 0 | Display order (for drag-and-drop) |
| created_by | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Creator employee ID |
| deleted_at | TIMESTAMP | | Soft delete timestamp |
| deleted_by | VARCHAR(50) | FK → users(employee_id) | Who deleted the item |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: parent_bug_id, assigned_to, status, is_completed, deleted_at, display_order

#### 4.1.7 leave_applications

**Purpose**: Employee leave requests and approvals

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| application_id | VARCHAR(100) | NOT NULL, UNIQUE | Unique application ID |
| employee_id | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Applicant employee ID |
| employee_name | VARCHAR(255) | NOT NULL | Applicant name |
| leave_type | VARCHAR(50) | CHECK IN ('Sick Leave', 'Casual Leave', 'Annual Leave', 'Emergency Leave', 'Maternity Leave', 'Paternity Leave') | Leave type |
| reason | TEXT | NOT NULL | Leave reason |
| from_date | DATE | NOT NULL | Leave start date |
| to_date | DATE | NOT NULL | Leave end date |
| is_half_day | BOOLEAN | DEFAULT FALSE | Half-day flag |
| emergency_contact | VARCHAR(20) | | Emergency contact number |
| status | VARCHAR(20) | CHECK IN ('Pending', 'Approved', 'Rejected') | Application status |
| manager_id | VARCHAR(50) | FK → users(employee_id) | Manager employee ID |
| approved_by | VARCHAR(50) | FK → users(employee_id) | Approver employee ID |
| approved_at | TIMESTAMP | | Approval timestamp |
| rejection_reason | TEXT | | Rejection reason (if rejected) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: application_id, employee_id, status, from_date, to_date

#### 4.1.8 wfh_applications

**Purpose**: Work from home requests and approvals

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| application_id | VARCHAR(100) | NOT NULL, UNIQUE | Unique application ID |
| employee_id | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Applicant employee ID |
| employee_name | VARCHAR(255) | NOT NULL | Applicant name |
| reason | TEXT | NOT NULL | WFH reason |
| from_date | DATE | NOT NULL | WFH start date |
| to_date | DATE | NOT NULL | WFH end date |
| is_half_day | BOOLEAN | DEFAULT FALSE | Half-day flag |
| status | VARCHAR(20) | CHECK IN ('Pending', 'Approved', 'Rejected') | Application status |
| manager_id | VARCHAR(50) | FK → users(employee_id) | Manager employee ID |
| approved_by | VARCHAR(50) | FK → users(employee_id) | Approver employee ID |
| approved_at | TIMESTAMP | | Approval timestamp |
| rejection_reason | TEXT | | Rejection reason (if rejected) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: application_id, employee_id, status, from_date, to_date

#### 4.1.9 activity_log

**Purpose**: Activity tracking and comments for tasks and development items

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| entity_type | VARCHAR(20) | NOT NULL, CHECK IN ('task', 'bug') | Entity type |
| entity_id | VARCHAR(100) | NOT NULL | Task ID or Bug ID |
| user_id | VARCHAR(50) | NOT NULL, FK → users(employee_id) | User who performed action |
| action_type | VARCHAR(50) | NOT NULL | Action type (created, updated, commented, etc.) |
| description | TEXT | NOT NULL | Activity description |
| is_comment | INTEGER | NOT NULL, DEFAULT 0 | Is this a comment? (0=no, 1=yes) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Activity timestamp |

**Indexes**: entity_type, entity_id, user_id, is_comment, created_at

**IMPORTANT**: `is_comment` is stored as INTEGER (0/1) in PostgreSQL, not BOOLEAN. All queries must convert to boolean explicitly:
```typescript
isComment: Boolean(row.is_comment)
```

#### 4.1.10 role_permissions

**Purpose**: Role-based permissions for features

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| role | VARCHAR(20) | NOT NULL, CHECK IN ('admin', 'top_management', 'management', 'employee') | User role |
| feature_key | VARCHAR(100) | NOT NULL | Feature identifier |
| can_view | BOOLEAN | DEFAULT FALSE | View permission |
| can_create | BOOLEAN | DEFAULT FALSE | Create permission |
| can_edit | BOOLEAN | DEFAULT FALSE | Edit permission |
| can_delete | BOOLEAN | DEFAULT FALSE | Delete permission |
| can_approve | BOOLEAN | DEFAULT FALSE | Approve permission |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: role, feature_key

**Unique Constraint**: (role, feature_key)

#### 4.1.11 user_permissions

**Purpose**: User-specific permission overrides

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| employee_id | VARCHAR(50) | NOT NULL, FK → users(employee_id) | Employee ID |
| feature_key | VARCHAR(100) | NOT NULL | Feature identifier |
| can_view | BOOLEAN | | View permission override (NULL = use role default) |
| can_create | BOOLEAN | | Create permission override |
| can_edit | BOOLEAN | | Edit permission override |
| can_delete | BOOLEAN | | Delete permission override |
| can_approve | BOOLEAN | | Approve permission override |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: employee_id, feature_key

**Unique Constraint**: (employee_id, feature_key)

---

## 5. Feature Specifications

### 5.1 Task Management

#### 5.1.1 Task Creation

**Pages**: `/tasks/create`

**Required Fields**:
- Description (TEXT, required)
- Assigned To (employee_id, required)
- Assigned By (employee_id, auto-filled from logged-in user)
- Start Date (DATE, required)
- End Date (DATE, required, must be >= start_date)
- Priority (U&I, NU&I, U&NI, NU&NI, required)
- Estimated Hours (DECIMAL, required, must be > 0)

**Optional Fields**:
- Select Type (Normal/Recursive, default: Normal)
- Recursive Type (Daily/Weekly/Monthly/Annually, required if Select Type = Recursive)
- Support Team (multi-select employee IDs, stored as JSON array)
- Project ID (dropdown of active projects)
- Subproject ID (dropdown of sub-projects under selected project)
- Attachments (file upload to AWS S3)
- Related Tasks (comma-separated task IDs)

**Business Logic**:
- Task ID is auto-generated using format: `JSR-<sequential_number>` (e.g., JSR-0016)
- Internal ID is auto-generated using timestamp-based format
- Default status: "Yet to Start"
- Default actual_hours: 0
- Sends email notification to assignee and support team
- Creates activity log entry: "Task created by {assigned_by}"

**API Endpoint**: `POST /api/tasks`

#### 5.1.2 Task Editing

**Pages**: `/tasks/[taskId]` (Edit button opens modal)

**Editable Fields**:
- All fields from creation except task_id and internal_id
- Status (dropdown with valid transitions)
- Actual Hours (can be incremented)
- Remarks (append-only with timestamp)
- Difficulties (append-only with timestamp)

**Permission Rules**:
- Can edit if: user is assignee, assigner, support team member, or admin/top_management
- Cannot edit if task is deleted

**Business Logic**:
- All changes are logged to activity_log table
- Email notifications sent on status changes
- Timer auto-stops if status changes to Done/Cancel/Hold/Stop

**API Endpoint**: `PATCH /api/tasks/[taskId]`

#### 5.1.3 Task Timer System

**Components**:
- `TimerButton`: Start/Stop timer button on task cards and detail pages
- `FloatingTimer`: Floating widget showing active timer
- `TimerProvider`: Global timer state management

**Timer States**:
- **stopped**: No active timer
- **running**: Timer is actively counting
- **paused**: Timer is paused (not currently used in UI)

**Timer Workflow**:
1. User clicks "Start Timer" on a task
2. If another timer is running, it's automatically stopped and synced
3. New timer starts, localStorage updated
4. FloatingTimer widget appears showing elapsed time
5. Timer syncs to backend every 5 minutes (auto-save)
6. User clicks "Stop Timer" to stop and sync final time
7. Timer data saved to task: timer_total_time, timer_sessions

**Timer Visibility Rules** (CRITICAL):
- Timer button is **HIDDEN** for tasks with status: Done, Cancel, Hold, Stop
- Timer button is **VISIBLE** for: Yet to Start, In Progress, Delayed, ReOpened
- Implementation: `apps/web/src/components/TimerButton.tsx` line 28

**Timer Data Structure**:
```typescript
interface TimerSession {
  startTime: number      // Unix timestamp (ms)
  endTime?: number       // Unix timestamp (ms)
  duration: number       // Duration in ms
}

interface TimerData {
  entityType: 'task' | 'bug'
  entityId: string
  entityTitle: string
  state: 'stopped' | 'running' | 'paused'
  startTime: number | null
  pausedTime: number
  totalTime: number
  sessions: TimerSession[]
}
```

**Storage**:
- **Frontend**: localStorage (key: 'activeTimer')
- **Backend**: tasks table (timer_state, timer_start_time, timer_paused_time, timer_total_time, timer_sessions)

**API Endpoint**: `POST /api/time-tracking/sync`

#### 5.1.4 Task Checklists (formerly Subtasks)

**Purpose**: Simple checklist items for tasks (not full tasks)

**Features**:
- Add checklist items with description and assignee
- Mark items as completed (checkbox)
- Drag-and-drop reordering
- Soft delete support

**Display**:
- Shown in task detail page under "Checklist" section
- Shows completion progress (e.g., "2/5 completed")

**API Endpoints**:
- `GET /api/subtasks?parentTaskId={taskId}`
- `POST /api/subtasks`
- `PATCH /api/subtasks/[id]`
- `DELETE /api/subtasks/[id]`
- `POST /api/subtasks/reorder`

**Note**: Will be renamed to "Checklists" in upcoming migration.

#### 5.1.5 Task Comments and Activity

**Unified Timeline**: Shows both system activities and user comments in chronological order

**System Activities** (auto-generated):
- Task created
- Status changed
- Assignee changed
- Priority changed
- Timer started/stopped
- Checklist item completed

**User Comments**:
- Added via comment input box
- Supports @mentions (future feature)
- Stored in activity_log table with is_comment = 1

**Display**:
- Shown in task detail page under "Activity & Comments" section
- Grouped by date
- Shows user avatar, name, timestamp, and activity/comment text

**API Endpoints**:
- `GET /api/activity-log?entityType=task&entityId={taskId}`
- `POST /api/activity-log` (for adding comments)

### 5.2 Development Module (Bugs)

#### 5.2.1 Development Item Creation

**Pages**: `/bugs/create` (displayed as "Development" in navigation)

**Required Fields**:
- Title (VARCHAR(500), required)
- Description (TEXT, required)
- Assigned To (employee_id, required)
- Reported By (employee_id, auto-filled from logged-in user)
- Priority (Low/Medium/High/Critical, required)
- Severity (Minor/Major/Critical, required)
- Category (UI/API/Backend/Performance/Security/Database/Integration/Other, required)
- Platform (iOS/Android/Web/All, required)

**Optional Fields**:
- Environment (Development/Staging/Production)
- Browser Info (e.g., "Chrome 120.0.0")
- Device Info (e.g., "iPhone 15 Pro, iOS 17.2")
- Server Logs (TEXT, server-side error logs)
- Frontend Logs (TEXT, browser console logs)
- Expected Behavior (TEXT)
- Actual Behavior (TEXT)
- Attachments (file upload to AWS S3, supports images and videos)
- Related Bugs (comma-separated bug IDs)
- Project ID
- Subproject ID
- Feature Name
- Type (testcase/feature/other)
- Estimated Hours

**Business Logic**:
- Bug ID is auto-generated using format: `BUG-<sequential_number>` (e.g., BUG-0003)
- Default status: "Open" (changed from "New" in some versions)
- Sends email notification to assignee
- Creates activity log entry: "Bug created by {reported_by}"

**API Endpoint**: `POST /api/bugs`

#### 5.2.2 Development Item Editing

**Pages**: `/bugs/[bugId]` (Edit button opens modal)

**Editable Fields**:
- All fields from creation except bug_id
- Status (dropdown with valid transitions)
- Resolution Notes (when marking as Resolved)

**Permission Rules**:
- Can edit if: user is assignee, assigner, reporter, or admin/top_management
- Cannot edit if bug is deleted

**Business Logic**:
- All changes are logged to activity_log table
- Email notifications sent on status changes
- Timer auto-stops if status changes to Closed/Resolved
- `resolved_at` timestamp set when status changes to Resolved

**API Endpoint**: `PATCH /api/bugs/[bugId]`

#### 5.2.3 Development Item Timer

**Same as Task Timer** (see section 5.1.3)

**Timer Visibility Rules** (CRITICAL):
- Timer button is **HIDDEN** for development items with status: Closed, Resolved
- Timer button is **VISIBLE** for: Open, In Progress, Reopened

#### 5.2.4 Development Checklists (formerly Bug Subtasks)

**Same as Task Checklists** (see section 5.1.4)

**API Endpoints**:
- `GET /api/bug-subtasks?parentBugId={bugId}`
- `POST /api/bug-subtasks`
- `PATCH /api/bug-subtasks/[id]`
- `DELETE /api/bug-subtasks/[id]`
- `POST /api/bug-subtasks/reorder`

**Note**: Will be renamed to "Development Checklists" in upcoming migration.

### 5.3 Leave Management

#### 5.3.1 Leave Application

**Pages**: `/leave/apply`

**Required Fields**:
- Leave Type (Sick Leave/Casual Leave/Annual Leave/Emergency Leave/Maternity Leave/Paternity Leave)
- Reason (TEXT)
- From Date (DATE)
- To Date (DATE, must be >= from_date)
- Emergency Contact (phone number, required for Emergency Leave)

**Optional Fields**:
- Is Half Day (checkbox)

**Business Logic**:
- Application ID auto-generated
- Status defaults to "Pending"
- Manager ID auto-filled from user's manager_id
- Sends email notification to manager
- Cannot apply for past dates (UI validation)
- Cannot have overlapping leave applications (API validation)

**API Endpoint**: `POST /api/leaves`

#### 5.3.2 Leave Approval/Rejection

**Pages**: `/approvals` (for managers)

**Actions**:
- Approve: Sets status to "Approved", records approved_by and approved_at
- Reject: Sets status to "Rejected", requires rejection_reason

**Permission Rules**:
- Only managers (role = management, top_management, admin) can approve/reject
- Can only approve/reject leaves for direct reports

**Business Logic**:
- Sends email notification to applicant
- Updates leave application status (terminal state)

**API Endpoints**:
- `POST /api/leaves/[id]/approve`
- `POST /api/leaves/[id]/reject`

### 5.4 Work From Home (WFH) Management

**Same as Leave Management** (see section 5.3)

**Pages**: `/wfh/apply`, `/approvals`

**API Endpoints**:
- `POST /api/wfh`
- `POST /api/wfh/[id]/approve`
- `POST /api/wfh/[id]/reject`

### 5.5 Project Management

#### 5.5.1 Project Creation

**Pages**: `/projects/create`

**Required Fields**:
- Project Name (VARCHAR(255))
- Created By (employee_id, auto-filled)

**Optional Fields**:
- Parent Project ID (for sub-projects)
- Description (TEXT)
- Status (Active/Inactive, default: Active)

**Business Logic**:
- Project ID auto-generated (e.g., PRJ-001, PRJ-002)
- Main projects have parent_project_id = NULL
- Sub-projects cannot have sub-projects (2-level max hierarchy)
- Only admin and top_management can create projects

**API Endpoint**: `POST /api/projects`

#### 5.5.2 Project Hierarchy

**Display**: `/projects` page shows hierarchical tree view

**Rules**:
- Main projects displayed at top level
- Sub-projects indented under parent
- Clicking project shows associated tasks and development items

**API Endpoint**: `GET /api/projects/hierarchy`

### 5.6 User Management

#### 5.6.1 User Creation

**Pages**: `/users` (admin only)

**Required Fields**:
- Employee ID (VARCHAR(50), unique)
- Name (VARCHAR(255))
- Email (VARCHAR(255), unique)
- Department (VARCHAR(100))
- Role (employee/management/top_management/admin)
- Password (VARCHAR(255), hashed with bcrypt)

**Optional Fields**:
- Phone
- Telegram Token
- Manager ID (employee_id of manager)
- Manager Email

**Business Logic**:
- Password is hashed using bcrypt before storage
- Default status: "active"
- Default warning_count: 0
- Sends welcome email with credentials (optional)

**API Endpoint**: `POST /api/users`

#### 5.6.2 User Profile

**Pages**: `/profile`

**Features**:
- View and edit own profile information
- Upload ID card photo (AWS S3)
- View digital ID card
- Manage notification preferences

**ID Card Photo Upload**:
- Max file size: 5MB
- Allowed formats: PNG, JPG, JPEG, WEBP
- Stored in AWS S3 bucket: amtariksha
- URL saved in users.id_card_photo column

**API Endpoints**:
- `GET /api/users/[employeeId]`
- `PATCH /api/users/[employeeId]`
- `POST /api/upload/id-card-photo` (presigned URL)
- `PUT /api/upload/id-card-photo` (update user record)

### 5.7 Dashboard

**Pages**: `/dashboard`

**Displays**:
- Task summary (by status)
- Development item summary (by status)
- Pending approvals (for managers)
- Recent activity
- Upcoming deadlines
- Team performance (for managers)

**Data Loading**:
- Uses `/api/dashboard-data` endpoint
- Loads tasks, bugs, subtasks, bug-subtasks, users, settings in parallel
- Caches response for 60 seconds (s-maxage=60, stale-while-revalidate=120)

**Role-Based Display**:
- **employee**: Shows only own tasks and development items
- **management**: Shows team tasks and development items + approval queue
- **top_management/admin**: Shows all tasks and development items + analytics

**API Endpoint**: `GET /api/dashboard-data?employeeId={id}&role={role}&includeUsers={true/false}`

### 5.8 Analytics and Reports

**Pages**: `/analytics`, `/tasks/analytics`, `/bugs/analytics`, `/reports`

**Features**:
- Task completion trends
- Development item resolution trends
- Team performance metrics
- Time tracking reports
- Leave and WFH statistics

**Permission**: Only management, top_management, and admin roles

---

## 6. API Documentation

### 6.1 Authentication APIs

#### POST /api/auth/login

**Purpose**: User login with email and password

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "user": {
      "employeeId": "AM-0001",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "employee",
      "department": "Engineering"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**Authentication**:
- Password verified using bcrypt.compare()
- JWT token generated with 7-day expiry
- Token stored in httpOnly cookie
- Token payload includes: employeeId, email, role

### 6.2 Task APIs

#### GET /api/tasks

**Purpose**: Get all tasks (with optional filters)

**Query Parameters**:
- `assignedTo` (string, optional): Filter by assignee employee ID
- `assignedBy` (string, optional): Filter by assigner employee ID
- `status` (string, optional): Filter by status
- `priority` (string, optional): Filter by priority

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "taskId": "JSR-0016",
      "description": "Implement user authentication",
      "assignedTo": "AM-0001",
      "assignedBy": "AM-0002",
      "support": ["AM-0003"],
      "startDate": "2025-01-01",
      "endDate": "2025-01-10",
      "priority": "U&I",
      "estimatedHours": 40,
      "actualHours": 25,
      "status": "In Progress",
      "timerTotalTime": 90000000,
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-01-04T15:30:00Z"
    }
  ],
  "source": "mysql"
}
```

#### POST /api/tasks

**Purpose**: Create a new task

**Request Body**:
```json
{
  "description": "Implement user authentication",
  "assignedTo": "AM-0001",
  "assignedBy": "AM-0002",
  "support": ["AM-0003"],
  "startDate": "2025-01-01",
  "endDate": "2025-01-10",
  "priority": "U&I",
  "estimatedHours": 40,
  "selectType": "Normal",
  "projectId": "PRJ-001"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "taskId": "JSR-0017",
    "description": "Implement user authentication",
    ...
  },
  "source": "mysql"
}
```

#### PATCH /api/tasks/[taskId]

**Purpose**: Update a task

**Request Body** (partial update):
```json
{
  "status": "Done",
  "actualHours": 42,
  "remarks": "[2025-01-04] Task completed successfully"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "taskId": "JSR-0016",
    "status": "Done",
    ...
  },
  "source": "mysql"
}
```

#### GET /api/tasks/[taskId]

**Purpose**: Get a single task by ID

**Response**:
```json
{
  "success": true,
  "data": {
    "taskId": "JSR-0016",
    ...
  },
  "source": "mysql"
}
```

### 6.3 Development (Bug) APIs

#### GET /api/bugs

**Purpose**: Get all development items (with optional filters)

**Query Parameters**:
- `assignedTo` (string, optional)
- `reportedBy` (string, optional)
- `status` (string, optional)
- `severity` (string, optional)
- `category` (string, optional)

**Response**: Similar to tasks API

#### POST /api/bugs

**Purpose**: Create a new development item

**Request Body**:
```json
{
  "title": "Login button not working",
  "description": "When clicking login button, nothing happens",
  "assignedTo": "AM-0001",
  "reportedBy": "AM-0002",
  "priority": "High",
  "severity": "Critical",
  "category": "UI",
  "platform": "Web",
  "environment": "Production",
  "serverLogs": "Error: Cannot read property 'user' of undefined",
  "frontendLogs": "TypeError: Cannot read property 'user' of undefined at login.js:42",
  "expectedBehavior": "User should be logged in",
  "actualBehavior": "Nothing happens when clicking login",
  "attachments": ["https://s3.amazonaws.com/amtariksha/bug-screenshot.png"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "bugId": "BUG-0004",
    ...
  },
  "source": "mysql"
}
```

### 6.4 File Upload APIs

#### POST /api/upload/presigned-url

**Purpose**: Get presigned URL for direct S3 upload

**Request Body**:
```json
{
  "fileName": "screenshot.png",
  "fileType": "image/png",
  "fileSize": 1024000,
  "entityType": "bug"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://amtariksha.s3.ap-south-1.amazonaws.com/...",
    "fileUrl": "https://amtariksha.s3.ap-south-1.amazonaws.com/bugs/screenshot-123.png"
  }
}
```

**Upload Workflow**:
1. Client requests presigned URL from backend
2. Backend generates presigned URL with 5-minute expiry
3. Client uploads file directly to S3 using presigned URL
4. Client saves fileUrl to database (in attachments field)

**Supported File Types**:
- Images: PNG, JPG, JPEG, GIF, WEBP
- Videos: MP4, QuickTime, AVI, WEBM

**Max File Sizes**:
- Bug attachments: 10MB
- ID card photos: 5MB

### 6.5 Activity Log APIs

#### GET /api/activity-log

**Purpose**: Get activity log entries for an entity

**Query Parameters**:
- `entityType` (string, required): "task" or "bug"
- `entityId` (string, required): Task ID or Bug ID
- `commentsOnly` (boolean, optional): Only return comments (is_comment = 1)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "456",
      "entityType": "task",
      "entityId": "JSR-0016",
      "userId": "AM-0001",
      "actionType": "commented",
      "description": "This is a comment",
      "isComment": true,
      "createdAt": "2025-01-04T10:30:00Z"
    },
    {
      "id": "457",
      "entityType": "task",
      "entityId": "JSR-0016",
      "userId": "AM-0002",
      "actionType": "status_changed",
      "description": "Status changed from 'In Progress' to 'Done'",
      "isComment": false,
      "createdAt": "2025-01-04T11:00:00Z"
    }
  ]
}
```

#### POST /api/activity-log

**Purpose**: Add a comment or activity log entry

**Request Body**:
```json
{
  "entityType": "task",
  "entityId": "JSR-0016",
  "userId": "AM-0001",
  "actionType": "commented",
  "description": "This is a comment",
  "isComment": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "458",
    ...
  }
}
```

### 6.6 Timer APIs

#### POST /api/time-tracking/sync

**Purpose**: Sync timer data to backend

**Request Body**:
```json
{
  "entityType": "task",
  "entityId": "JSR-0016",
  "state": "running",
  "totalTime": 3600000,
  "sessions": [
    {
      "startTime": 1704355200000,
      "endTime": 1704358800000,
      "duration": 3600000
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Timer synced successfully"
}
```

**Sync Behavior**:
- Updates timer_state, timer_total_time, timer_sessions in tasks/bugs table
- Called automatically every 5 minutes when timer is running
- Called immediately when timer is stopped

### 6.7 Permission APIs

#### GET /api/permissions

**Purpose**: Get permissions for a role or user

**Query Parameters**:
- `type` (string, required): "role", "user", "effective", or "all"
- `role` (string, optional): Role name (for type=role or type=effective)
- `employeeId` (string, optional): Employee ID (for type=user or type=effective)
- `featureKey` (string, optional): Feature key (for type=effective)

**Response** (type=effective):
```json
{
  "success": true,
  "data": {
    "canView": true,
    "canCreate": true,
    "canEdit": true,
    "canDelete": false,
    "canApprove": false
  }
}
```

#### POST /api/permissions

**Purpose**: Update role or user permissions

**Request Body** (update role permission):
```json
{
  "type": "role",
  "role": "employee",
  "featureKey": "tasks",
  "permissions": {
    "canView": true,
    "canCreate": true,
    "canEdit": true,
    "canDelete": false
  }
}
```

**Request Body** (set user permission override):
```json
{
  "type": "user",
  "employeeId": "AM-0001",
  "featureKey": "tasks",
  "permissions": {
    "canDelete": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Permissions updated successfully"
}
```

---

## 7. Authentication & Authorization

### 7.1 Authentication Flow

**Login Process**:
1. User submits email and password to `/api/auth/login`
2. Backend verifies password using bcrypt.compare()
3. If valid, generate JWT token with payload: `{ employeeId, email, role }`
4. Token signed with JWT_SECRET (from environment variables)
5. Token expiry: 7 days
6. Token stored in httpOnly cookie (name: "token")
7. Return user data and token to client

**Token Verification**:
- Server-side: `getAuthUser(request)` function in `@/lib/auth-server`
- Checks both Authorization header (for mobile/API) and cookies (for web)
- Returns token payload or null if invalid/expired

**Logout Process**:
- Clear "token" cookie
- Redirect to login page

### 7.2 Authorization Patterns

**Server-Side Protection**:
```typescript
import { getAuthUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check role
  if (!['admin', 'top_management'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Proceed with request
}
```

**Client-Side Protection**:
```typescript
'use client'
import { useAuth } from '@/lib/auth'

export default function ProtectedPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>
  if (!user) return <div>Unauthorized</div>

  return <div>Protected content</div>
}
```

**Permission Checks**:
```typescript
import { getEffectivePermissions } from '@/lib/db/permissions'

const permissions = await getEffectivePermissions(
  user.employeeId,
  user.role,
  'tasks'
)

if (!permissions.canDelete) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

## 8. UI/UX Patterns

### 8.1 Design System

**Color Palette**:
- **Primary**: Orange (#FF6B35, #FF8C42) - Used for CTAs, active states
- **Secondary**: Blue (#4A90E2) - Used for links, info states
- **Success**: Green (#10B981) - Used for success messages, completed states
- **Warning**: Yellow (#F59E0B) - Used for warnings, pending states
- **Error**: Red (#EF4444) - Used for errors, critical states
- **Neutral**: Gray (#6B7280, #9CA3AF, #D1D5DB, #F3F4F6) - Used for text, borders, backgrounds

**Typography**:
- **Font Family**: Inter, system-ui, sans-serif
- **Headings**: font-bold, text-2xl/text-xl/text-lg
- **Body**: font-normal, text-base
- **Small**: text-sm, text-xs

**Spacing**:
- Uses Tailwind CSS spacing scale (0.25rem increments)
- Common: p-4, p-6, space-x-2, space-y-4, gap-4

**Components**:
- **Buttons**: Rounded corners (rounded-lg), shadow on hover, transition-colors
- **Cards**: White background, border, rounded-xl, shadow-sm
- **Inputs**: Border, rounded-lg, focus:ring-2, focus:ring-primary
- **Modals**: Centered overlay, backdrop blur, slide-in animation

### 8.2 Navigation Patterns

**Main Navigation** (Navbar):
- Dashboard
- Tasks
- Development (formerly Bugs)
- Projects
- Approvals (for managers only)
- Analytics (for managers only)
- Users (for admin only)
- Settings (for admin only)
- Profile (dropdown menu)

**Breadcrumbs**:
- Used on detail pages (e.g., Tasks > JSR-0016)
- Clickable navigation back to parent pages

**Tabs**:
- Used on detail pages (e.g., Details, Subtasks, Activity)
- Horizontal tab navigation with active state indicator

### 8.3 Form Patterns

**Validation**:
- Client-side validation using HTML5 attributes (required, min, max, pattern)
- Server-side validation in API routes
- Error messages displayed below input fields in red text

**Loading States**:
- Buttons show spinner icon when submitting
- Disabled state during submission
- Success/error toast notifications after submission

**Date Pickers**:
- HTML5 date input (type="date")
- Validation: end_date >= start_date

**Dropdowns**:
- Native select elements for simple dropdowns
- Custom multi-select for support team, tags

### 8.4 List and Table Patterns

**Task/Bug Lists**:
- Card-based layout (not table)
- Each card shows: ID, title/description, assignee, status, priority, dates
- Hover effects: shadow, scale
- Click to navigate to detail page

**Filters**:
- Dropdown filters for status, priority, assignee
- Search input for text search
- Clear filters button

**Pagination**:
- Not currently implemented (loads all items)
- Future: Implement infinite scroll or page-based pagination

### 8.5 Modal Patterns

**Edit Modals**:
- Slide-in from right or center overlay
- Close button (X) in top-right corner
- Cancel and Save buttons at bottom
- Backdrop click to close (with confirmation if unsaved changes)

**Confirmation Modals**:
- Used for destructive actions (delete, reject)
- Shows warning message
- Cancel and Confirm buttons
- Confirm button in red for destructive actions

---

## 9. Integration & Services

### 9.1 AWS S3 File Storage

**Configuration**:
- **Bucket**: amtariksha
- **Region**: ap-south-1
- **Access Key**: AKIA2JGJ2OTO4M3JH6MR
- **Secret Key**: (stored in environment variables)
- **CORS**: Configured for direct browser uploads
- **Public Read**: Enabled for uploaded files

**Upload Pattern**:
1. Client requests presigned URL from `/api/upload/presigned-url`
2. Backend generates presigned URL with 5-minute expiry using AWS SDK
3. Client uploads file directly to S3 using PUT request to presigned URL
4. S3 returns success response
5. Client saves S3 URL to database

**File Naming**:
- Format: `{entityType}/{fileName}-{timestamp}.{extension}`
- Example: `bugs/screenshot-1704355200000.png`

**Benefits**:
- Bypasses Vercel's 4.5MB serverless function limit
- Faster uploads (direct to S3)
- Reduced server load

### 9.2 Email Service

**Configuration**:
- **Provider**: Gmail SMTP
- **Host**: smtp.gmail.com
- **Port**: 465 (SSL)
- **User**: amtariksha@gmail.com
- **Password**: wyfpzylmppjnhyfd (app-specific password)

**Email Templates**:
- Task assignment notification
- Task status change notification
- Bug assignment notification
- Leave/WFH approval notification
- Leave/WFH rejection notification
- User credential email

**Implementation**:
- Uses nodemailer library
- Email service initialized in `@/lib/email/service`
- Sends emails asynchronously (fire-and-forget pattern)
- Errors logged but don't block main operations

**Environment Variables**:
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASSWORD

### 9.3 Database Connection

**PostgreSQL Connection Pool**:
- **Max Connections**: 50
- **Idle Timeout**: 10 seconds
- **Connection Timeout**: 5 seconds
- **SSL**: Required for Supabase

**Connection Management**:
- Single connection pool instance (singleton pattern)
- Automatic reconnection on connection loss
- Query timeout: 10 seconds (configurable)
- Parameterized queries for SQL injection prevention

**Error Handling**:
- Connection errors logged to console
- Graceful degradation (return error response, don't crash)
- Retry logic for transient errors (future enhancement)

---

## 10. Deployment Architecture

### 10.1 Vercel Deployment

**Platform**: Vercel (serverless)

**Configuration**:
- **Framework**: Next.js 16
- **Node Version**: 18.x
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

**Environment Variables** (Production):
- DATABASE_URL (PostgreSQL connection string)
- JWT_SECRET (for token signing)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD (email service)
- AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET (S3 upload)

**Serverless Functions**:
- All API routes deployed as serverless functions
- Max execution time: 10 seconds (Vercel hobby plan)
- Max payload size: 4.5MB (bypassed using S3 presigned URLs)

**Automatic Deployments**:
- Push to `main` branch triggers production deployment
- Preview deployments for pull requests
- Deployment status visible in GitHub

### 10.2 Database Hosting

**Provider**: Supabase (PostgreSQL)

**Configuration**:
- **Region**: ap-south-1 (Mumbai)
- **Connection Pooling**: Enabled (max 50 connections)
- **SSL**: Required
- **Backups**: Automatic daily backups

**Migration Strategy**:
- Migration files stored in `apps/web/database/migrations/`
- Manual execution on production database
- Naming convention: `{number}_{description}.sql`

### 10.3 Monitoring and Logging

**Logging**:
- Console logs in development
- Vercel logs in production
- Structured logging with prefixes (e.g., `🔵 [TASKS-GET]`, `❌ [ERROR]`)

**Error Tracking**:
- Currently: Console error logs
- Future: Integrate Sentry or similar service

**Performance Monitoring**:
- Vercel Analytics (basic metrics)
- Future: Implement custom performance tracking

---

## 11. Critical Business Logic

### 11.1 Timer Visibility Rules (NEVER CHANGE)

**CRITICAL RULE**: Timer buttons/widgets MUST be hidden for completed or stopped work.

**For Tasks**:
```typescript
const disabledStatuses = ['Done', 'Cancel', 'Hold', 'Stop']
const isDisabled = status ? disabledStatuses.includes(status) : false
```

**For Development Items**:
```typescript
const disabledStatuses = ['Closed', 'Resolved']
const isDisabled = status ? disabledStatuses.includes(status) : false
```

**Location**: `apps/web/src/components/TimerButton.tsx` line 28

**Rationale**: Completed or stopped work should not accrue additional time. This prevents time tracking errors and ensures accurate reporting.

**Testing**: Always verify timer button visibility when changing task/bug status logic.

### 11.2 Activity Log Boolean Conversion (NEVER CHANGE)

**CRITICAL RULE**: PostgreSQL stores `is_comment` as INTEGER (0/1), not BOOLEAN.

**All activity log queries MUST convert to boolean**:
```typescript
isComment: Boolean(row.is_comment)
```

**Affected Functions** (`apps/web/src/lib/db/activityLog.ts`):
- `getActivityLogByEntity()` - line 201-207
- `getCommentsByEntity()` - line 251-256
- `getSystemActivitiesByEntity()` - line 300-305
- `getActivityLogById()` - line 151-160

**Rationale**: TypeScript expects boolean type, but PostgreSQL returns 0/1. Without conversion, filters like `activity.isComment` fail.

**Testing**: Always verify comments display correctly after modifying activity log queries.

### 11.3 Soft Delete Pattern (NEVER CHANGE)

**CRITICAL RULE**: Never hard-delete records. Always use soft delete.

**Soft Delete Implementation**:
```typescript
// Soft delete
await query(
  `UPDATE tasks SET deleted_at = NOW(), deleted_by = $1 WHERE task_id = $2`,
  [employeeId, taskId]
)

// Restore
await query(
  `UPDATE tasks SET deleted_at = NULL, deleted_by = NULL WHERE task_id = $1`,
  [taskId]
)

// Query non-deleted records
await query(
  `SELECT * FROM tasks WHERE deleted_at IS NULL`
)
```

**Rationale**: Allows data recovery, audit trails, and compliance with data retention policies.

**Testing**: Always verify deleted items don't appear in normal queries but can be restored.

### 11.4 Task Auto-Delay Logic (NEVER CHANGE)

**CRITICAL RULE**: Tasks are auto-marked as "Delayed" when overdue.

**Logic** (`apps/web/src/lib/businessRules.ts`):
```typescript
static shouldMarkAsDelayed(task: any, today: string): boolean {
  // Don't change status if already completed, cancelled, stopped, or already delayed
  if (['Done', 'Cancel', 'Stop', 'Delayed'].includes(task.status)) {
    return false
  }

  // Check if end date has passed (task is overdue only AFTER the end date)
  const endDate = new Date(task.endDate)
  const todayDate = new Date(today)

  // Task is only overdue when today is AFTER the end date, not on the end date
  return todayDate > endDate
}
```

**Trigger**: `/api/tasks/update-delayed` endpoint (called by cron job or manually)

**Rationale**: Automatic status updates ensure accurate task tracking without manual intervention.

**Testing**: Verify tasks with `end_date < today` are marked as "Delayed" (except Done/Cancel/Stop).

---

## 12. Upcoming Features (Planned)

### 12.1 Task Name Field

**Purpose**: Add short task name/title field to fix description overflow issues

**Changes**:
- Add `name` VARCHAR(150) column to tasks table (before description)
- Update Task interface in types.ts
- Update all task creation/edit forms
- Update task list views to show name instead of description
- Update task detail pages to show both name and description
- Migration: Populate name with first 100 characters of description

### 12.2 Multiple Assignees

**Purpose**: Support multiple assignees for a single task instead of creating support tasks

**Changes**:
- Change `assigned_to` column to JSONB array (or keep as single + add `additional_assignees` JSONB)
- Update task assignment UI to multi-select
- Update all queries to handle multiple assignees
- Update email notifications to send to all assignees

### 12.3 Subtask vs Checklist Distinction

**Purpose**: Rename current subtasks to "Checklists" and implement true subtasks

**Changes**:
- Rename tables: `subtasks` → `task_checklists`, `bug_subtasks` → `development_checklists`
- Add `parent_task_id` column to tasks table (for task subtasks)
- Add `parent_dev_id` column to bugs table (for development subtasks)
- Update UI to show expandable subtask hierarchy
- Implement inline subtask creation (ClickUp-style)

### 12.4 Related Tasks/Bugs Linking

**Purpose**: Link related tasks and development items with bidirectional relationships

**Changes**:
- Use existing `related_tasks` and `related_bugs` columns (or create junction table)
- Add linking UI in edit screens
- Display linked items in detail pages
- Support task↔task, task↔bug, bug↔bug relationships

### 12.5 Development Module Rename

**Purpose**: Complete rename from "Bugs" to "Development" throughout codebase

**Changes**:
- Rename `bugs` table → `development` (if feasible without breaking changes)
- Update all UI references from "Bugs" to "Development"
- Add icons/colors to distinguish Feature vs Bug Fix types
- Update navigation, breadcrumbs, page titles

---

## Appendix A: Environment Variables

**Required Environment Variables** (`.env.local`):

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Authentication
JWT_SECRET=your-secret-key-here

# Email Service (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=amtariksha@gmail.com
SMTP_PASSWORD=wyfpzylmppjnhyfd

# AWS S3
AWS_ACCESS_KEY_ID=AKIA2JGJ2OTO4M3JH6MR
AWS_SECRET_ACCESS_KEY=your-secret-key-here
AWS_REGION=ap-south-1
AWS_S3_BUCKET=amtariksha

# Optional
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**NEVER commit `.env.local` to Git!**

---

## Appendix B: Common Troubleshooting

### Issue: Comments not displaying

**Cause**: `is_comment` field not converted from INTEGER to boolean

**Solution**: Ensure all activity log queries include `isComment: Boolean(row.is_comment)`

### Issue: Timer showing for completed tasks

**Cause**: Timer visibility logic not checking status correctly

**Solution**: Verify `disabledStatuses` array includes all terminal statuses

### Issue: File upload fails

**Cause**: Presigned URL expired or CORS not configured

**Solution**: Check S3 CORS configuration and presigned URL expiry (5 minutes)

### Issue: Database connection timeout

**Cause**: Connection pool exhausted or network issues

**Solution**: Increase connection pool size or check database connectivity

---

**END OF PRODUCT REQUIREMENTS DOCUMENT**

**Version**: 1.0
**Last Updated**: 2025-01-04
**Maintained By**: Development Team
**Review Frequency**: Quarterly or after major feature releases


