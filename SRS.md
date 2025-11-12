# JSR Task Management - System Requirements Specification (SRS)

**Version:** 1.0  
**Last Updated:** 2025-11-12  
**Document Owner:** JSR Development Team

---

## Changelog
- **2025-11-12**: Initial SRS creation - Complete system requirements for all features

---

## Table of Contents
1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [User Roles and Permissions](#user-roles-and-permissions)
4. [Task Management](#task-management)
5. [Bug Tracking](#bug-tracking)
6. [Leave Management](#leave-management)
7. [Work From Home (WFH) Management](#work-from-home-wfh-management)
8. [Social Feed](#social-feed)
9. [Project Management](#project-management)
10. [Timer System](#timer-system)
11. [Activity Logging](#activity-logging)
12. [Notifications](#notifications)
13. [User Interface Requirements](#user-interface-requirements)
14. [Business Rules](#business-rules)

---

## Introduction

### Purpose
This document specifies the functional and non-functional requirements for the JSR Task Management System, a comprehensive project and task management platform designed for team collaboration, bug tracking, leave management, and social engagement.

### Scope
The system provides:
- Task and project management with hierarchical structures
- Bug tracking with attachments and development workflows
- Leave and WFH application workflows with approval processes
- Social feed for team communication
- Time tracking with integrated timers
- Activity logging and audit trails
- Role-based access control
- Email notifications
- Web and mobile applications

### Intended Audience
- **End Users**: Employees (amtariksians), managers, and administrators
- **Developers**: Development team maintaining and extending the system
- **Stakeholders**: Management and decision-makers

---

## System Overview

**Last Updated:** 2025-11-12

### Platforms
- **Web Application**: Accessible via browser at task.amtariksha.com
- **Mobile Application**: Android app (standalone APK)

### Key Features
1. **Task Management**: Create, assign, track, and manage tasks with timers, subtasks, and checklists
2. **Bug Tracking**: Report, assign, and resolve bugs with attachments and development workflows
3. **Leave Management**: Apply for leave, approve/reject applications, track leave balances
4. **WFH Management**: Apply for work-from-home, approval workflows
5. **Social Feed**: Share updates, comment, react, mention team members
6. **Project Hierarchy**: Organize work into projects and subprojects
7. **Time Tracking**: Built-in timers for tasks and bugs with session tracking
8. **Activity Logs**: Complete audit trail of all changes and comments
9. **Notifications**: Email notifications for assignments, approvals, mentions

---

## User Roles and Permissions

**Last Updated:** 2025-11-12

### Role Hierarchy

#### 1. Amtariksian (Base User)
**Description**: Regular employee with basic access to their own work items.

**Permissions:**
- ✅ View own tasks and bugs
- ✅ Create tasks and bugs
- ✅ Edit own tasks and bugs
- ✅ Start/stop timers on assigned tasks/bugs
- ✅ Add comments and activity logs
- ✅ Apply for leave and WFH
- ✅ View and participate in social feed
- ✅ Upload attachments to bugs
- ❌ View other users' tasks (unless assigned)
- ❌ Delete tasks or bugs
- ❌ Approve leave or WFH applications
- ❌ Manage users or system settings

#### 2. Management (Team Lead/Manager)
**Description**: Team leaders who manage their team members' work.

**Permissions:**
- ✅ All amtariksian permissions
- ✅ View team members' tasks and bugs
- ✅ Assign tasks and bugs to team members
- ✅ Edit team members' tasks and bugs
- ✅ Approve/reject leave applications for team members
- ✅ Approve/reject WFH applications for team members
- ❌ View tasks outside their team
- ❌ Delete tasks or bugs
- ❌ Manage users or system settings

#### 3. Top Management (Senior Management)
**Description**: Senior leadership with organization-wide visibility.

**Permissions:**
- ✅ All management permissions
- ✅ View all tasks and bugs across the organization
- ✅ Delete tasks and bugs
- ✅ Approve/reject any leave or WFH application
- ❌ Manage users or system settings

#### 4. Admin (System Administrator)
**Description**: Full system access for configuration and user management.

**Permissions:**
- ✅ All top management permissions
- ✅ Manage users (create, edit, delete, reset passwords)
- ✅ Configure system settings
- ✅ Access all features and data
- ✅ Manage projects and hierarchies
- ✅ Configure email templates and notifications

### Permission Matrix

| Feature | Amtariksian | Management | Top Management | Admin |
|---------|-------------|------------|----------------|-------|
| View own tasks/bugs | ✅ | ✅ | ✅ | ✅ |
| View team tasks/bugs | ❌ | ✅ | ✅ | ✅ |
| View all tasks/bugs | ❌ | ❌ | ✅ | ✅ |
| Create tasks/bugs | ✅ | ✅ | ✅ | ✅ |
| Edit own tasks/bugs | ✅ | ✅ | ✅ | ✅ |
| Edit team tasks/bugs | ❌ | ✅ | ✅ | ✅ |
| Delete tasks/bugs | ❌ | ❌ | ✅ | ✅ |
| Start/stop timers | ✅ | ✅ | ✅ | ✅ |
| Apply for leave/WFH | ✅ | ✅ | ✅ | ✅ |
| Approve leave/WFH (team) | ❌ | ✅ | ✅ | ✅ |
| Approve leave/WFH (all) | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ❌ | ✅ |
| Upload attachments | ✅ | ✅ | ✅ | ✅ |
| Post to feed | ✅ | ✅ | ✅ | ✅ |
| Comment on feed | ✅ | ✅ | ✅ | ✅ |

---

## Task Management

**Last Updated:** 2025-11-12

### Overview
Tasks are the primary work items in the system. They support hierarchical structures (parent-child relationships), multiple assignees, time tracking, checklists, and comprehensive metadata.

### Task Properties

#### Core Fields
- **Task ID**: Unique identifier (e.g., TSK-001, TSK-002)
- **Name**: Short title/summary of the task (max 150 characters)
- **Description**: Detailed description of the task (rich text supported)
- **Type**: Task type (Normal, Recursive, etc.)
- **Status**: Current state of the task
  - Yet to Start
  - In Progress
  - On Hold
  - Completed
  - Closed
  - Resolved
- **Priority**: Task priority level
  - NU&NI (Not Urgent & Not Important)
  - NU&I (Not Urgent & Important)
  - U&NI (Urgent & Not Important)
  - U&I (Urgent & Important)

#### Assignment Fields
- **Assigned To**: Array of employee IDs (supports multiple assignees)
- **Assigned By**: Employee who assigned the task
- **Support**: Additional support team members

#### Date Fields
- **Start Date**: Task start date
- **End Date**: Task due date
- **Created At**: Task creation timestamp
- **Updated At**: Last modification timestamp

#### Time Tracking Fields
- **Estimated Hours**: Estimated time to complete (in hours)
- **Actual Hours**: Actual time spent (calculated from timer sessions)
- **Daily Hours**: Breakdown of hours worked per day (JSONB)
- **Timer State**: Current timer state (running, paused, stopped, null)
- **Timer Start Time**: When timer was started
- **Timer Paused Time**: Accumulated paused time (seconds)
- **Timer Total Time**: Total time tracked (seconds)
- **Timer Sessions**: Array of timer sessions with start/end times

#### Organizational Fields
- **Project ID**: Associated project
- **Subproject ID**: Associated subproject
- **Department**: Department responsible for the task
- **Parent Task ID**: Parent task (for subtasks)

#### Additional Fields
- **Remarks**: General notes and remarks
- **Difficulties**: Difficulties encountered during execution
- **Related Tasks**: Comma-separated list of related task IDs

### Task Lifecycle

#### 1. Task Creation
**Who**: Any authenticated user
**Process**:
1. User clicks "Create Task" button
2. User fills in required fields (name, description, assigned to, start date, end date)
3. User optionally fills in additional fields (priority, project, estimated hours)
4. System generates unique task ID
5. System creates task record in database
6. System sends email notification to assignees
7. System logs creation in activity log

**Business Rules**:
- Name is required (max 150 characters)
- Description is required
- At least one assignee is required
- Start date must be <= End date
- Assigned by is automatically set to current user

#### 2. Task Assignment
**Who**: Task creator, managers, top management, admins
**Process**:
1. User selects task to assign
2. User selects one or more assignees from employee list
3. System updates assigned_to array
4. System sends email notification to new assignees
5. System logs assignment change in activity log

**Business Rules**:
- Multiple assignees are supported
- Cannot assign to deleted/inactive users
- Assignees must have access to the project (if project is set)

#### 3. Task Updates
**Who**: Assignees, managers, top management, admins
**Process**:
1. User opens task details
2. User modifies fields (status, priority, dates, description, etc.)
3. System validates changes
4. System updates task record
5. System logs field changes in activity log (old value → new value)
6. System sends notifications if assignees changed

**Business Rules**:
- Only authorized users can edit tasks
- Status changes are logged with timestamps
- Changing dates triggers validation (start <= end)
- Changing status to Closed/Resolved stops any running timer

#### 4. Task Completion
**Who**: Assignees, managers, top management, admins
**Process**:
1. User changes status to "Completed"
2. System stops any running timer
3. System calculates final actual hours
4. System logs completion in activity log
5. System sends notification to task creator

**Business Rules**:
- Timer must be stopped before marking as Completed
- Actual hours are calculated from timer sessions
- Completed tasks can be reopened by changing status

### Subtasks and Checklists

#### Subtasks (Full Tasks)
**Description**: Full-fledged tasks with parent_task_id set to parent task.

**Features**:
- All task properties available
- Independent timers
- Separate activity logs
- Can have their own subtasks (unlimited nesting)

**Use Case**: Breaking down large tasks into smaller, trackable work items.

#### Checklists (Lightweight Items)
**Description**: Simple checklist items stored in task_checklists table.

**Properties**:
- Description
- Assigned To (single user)
- Status (Not Started, In Progress, Completed)
- Is Completed (checkbox)
- Display Order

**Features**:
- Lightweight (no timers, no full task properties)
- Quick to create and manage
- Displayed inline in task details

**Use Case**: Simple to-do items within a task (e.g., "Review code", "Update documentation").

### Task Relationships

**Relationship Types**:
- **Related**: General relationship between tasks
- **Blocks**: This task blocks another task
- **Blocked By**: This task is blocked by another task
- **Depends On**: This task depends on another task
- **Duplicate**: This task is a duplicate of another task

**Implementation**:
- Stored in task_relationships table
- Bidirectional linking supported
- Can also use related_tasks field (comma-separated IDs)

### Task Filtering and Search

**Filter Options**:
- **Assigned To**: Filter by assignee (supports multiple)
- **Status**: Filter by status
- **Priority**: Filter by priority
- **Project**: Filter by project
- **Date Range**: Filter by start/end dates
- **Department**: Filter by department

**Search**:
- Search by task ID
- Search by task name
- Search by description (full-text search)

### Task Views

#### List View
- Displays tasks in a table/card layout
- Shows: Task ID, Name, Status, Priority, Assignees, Project, Dates
- Supports sorting by any column
- Supports pagination

#### Detail View
- Full task information
- Inline editing of fields
- Activity log and comments
- Checklists and subtasks
- Timer controls
- Related tasks

#### Calendar View
- Tasks displayed on calendar by start/end dates
- Color-coded by status or priority
- Drag-and-drop to change dates

---

## Bug Tracking

**Last Updated:** 2025-11-12

### Overview
Bugs (also called Development Items) are used to track software defects, feature requests, and development work. They support attachments, subtasks, checklists, and comprehensive metadata.

### Bug Properties

#### Core Fields
- **Bug ID**: Unique identifier (e.g., BUG-001, DEV-001)
- **Title**: Short description of the bug (max 500 characters)
- **Description**: Detailed description (rich text supported)
- **Type**: Bug type (Bug, Development, Enhancement, etc.)
- **Severity**: Bug severity level
  - Critical
  - Major
  - Minor
  - Trivial
- **Priority**: Bug priority level
  - High
  - Medium
  - Low
- **Status**: Current state
  - New
  - Assigned
  - In Progress
  - Fixed
  - Verified
  - Closed
  - Reopened
  - Resolved

#### Classification Fields
- **Category**: Bug category (UI, Backend, Database, API, Other)
- **Platform**: Platform where bug occurs (Web, Mobile, API, Desktop)
- **Environment**: Environment (Production, Staging, Development)

#### Assignment Fields
- **Assigned To**: Employee assigned to fix the bug
- **Assigned By**: Employee who assigned the bug
- **Reported By**: Employee who reported the bug

#### Technical Details
- **Steps to Reproduce**: Step-by-step instructions
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Browser Info**: Browser and version (for web bugs)
- **Device Info**: Device information (for mobile bugs)
- **Server Logs**: Server-side logs
- **Frontend Logs**: Client-side logs
- **Attachments**: Array of file URLs (screenshots, videos, logs)

#### Development Fields
- **Feature**: Feature name this bug relates to
- **Development Prompt**: Development requirements/prompt
- **Parent Dev ID**: Parent development item (for sub-bugs)
- **Related Bugs**: Comma-separated related bug IDs

#### Time Tracking Fields
- **Estimated Hours**: Estimated time to fix
- **Actual Hours**: Actual time spent (from timer)
- **Start Date**: Work start date
- **End Date**: Target completion date
- **Timer State**: Current timer state
- **Timer Sessions**: Array of timer sessions

#### Resolution Fields
- **Resolved Date**: When bug was resolved
- **Closed Date**: When bug was closed
- **Reopened Count**: Number of times reopened

### Bug Lifecycle

#### 1. Bug Reporting
**Who**: Any authenticated user
**Process**:
1. User clicks "Report Bug" button
2. User fills in required fields (title, description, type, severity, priority)
3. User optionally adds attachments (screenshots, logs)
4. User fills in technical details (steps to reproduce, expected/actual behavior)
5. System generates unique bug ID
6. System creates bug record
7. System sends email notification to assigned user (if assigned)
8. System logs creation in activity log

**Business Rules**:
- Title is required
- Description is required
- Type, severity, priority have default values
- Reported by is automatically set to current user
- Attachments are uploaded to AWS S3

#### 2. Bug Assignment
**Who**: Bug reporter, managers, top management, admins
**Process**:
1. User selects bug to assign
2. User selects assignee from employee list
3. System updates assigned_to field
4. System sends email notification to assignee
5. System logs assignment in activity log

**Business Rules**:
- Only one assignee per bug (unlike tasks)
- Cannot assign to deleted/inactive users

#### 3. Bug Investigation and Fixing
**Who**: Assigned developer
**Process**:
1. Developer reviews bug details
2. Developer changes status to "In Progress"
3. Developer starts timer
4. Developer investigates and fixes the bug
5. Developer adds comments with findings
6. Developer uploads additional attachments if needed
7. Developer stops timer when done
8. Developer changes status to "Fixed"
9. System logs all changes in activity log

**Business Rules**:
- Timer tracks actual time spent
- Comments are visible to all users with access
- Status changes are logged with timestamps

#### 4. Bug Verification
**Who**: QA team, managers, bug reporter
**Process**:
1. Verifier reviews the fix
2. Verifier tests the fix in appropriate environment
3. If fix is good: Verifier changes status to "Verified"
4. If fix is not good: Verifier changes status to "Reopened" and adds comments
5. System increments reopened_count if reopened
6. System logs verification/reopening in activity log

**Business Rules**:
- Verified bugs can be closed
- Reopened bugs go back to assigned developer
- Reopened count is tracked for metrics

#### 5. Bug Closure
**Who**: Managers, top management, admins
**Process**:
1. User changes status to "Closed"
2. System sets closed_date timestamp
3. System stops any running timer
4. System logs closure in activity log

**Business Rules**:
- Closed bugs can be reopened if needed
- Closed bugs are excluded from active bug lists by default

### Bug Attachments

**Supported File Types**:
- Images: PNG, JPG, JPEG, GIF, WebP
- Videos: MP4, WebM, MOV
- Logs: TXT, LOG
- Documents: PDF

**Upload Process**:
1. User selects file(s) to upload
2. Client requests pre-signed URL from API
3. API generates S3 pre-signed URL
4. Client uploads file directly to S3
5. Client saves S3 URL to bug.attachments array
6. System logs attachment addition in activity log

**Business Rules**:
- Max file size: 50MB per file
- Files are stored in AWS S3 (bucket: amtariksha, region: ap-south-1)
- Attachments are publicly readable
- Deleting a bug does not delete S3 files (soft delete)

### Bug Checklists

**Description**: Development checklists stored in development_checklists table.

**Properties**:
- Description
- Assigned To
- Status (Not Started, In Progress, Completed)
- Is Completed (checkbox)
- Display Order

**Use Case**: Breaking down bug fix into smaller steps (e.g., "Fix backend API", "Update frontend", "Write tests").

---

## Leave Management

**Last Updated:** 2025-11-12

### Overview
The leave management system allows employees to apply for leave, managers to approve/reject applications, and tracks leave balances.

### Leave Application Properties

#### Core Fields
- **Leave ID**: Unique identifier (e.g., LV-001)
- **Employee ID**: Applicant's employee ID
- **Leave Type**: Type of leave
  - Sick Leave
  - Casual Leave
  - Earned Leave
  - Maternity Leave
  - Paternity Leave
  - Unpaid Leave
  - Compensatory Off
- **Start Date**: Leave start date
- **End Date**: Leave end date
- **Total Days**: Total leave days (calculated)
- **Reason**: Reason for leave
- **Status**: Application status
  - Pending
  - Approved
  - Rejected
  - Cancelled

#### Approval Fields
- **Applied Date**: When application was submitted
- **Approved By**: Manager who approved/rejected
- **Approved Date**: When application was approved/rejected
- **Rejection Reason**: Reason for rejection (if rejected)

### Leave Application Workflow

#### 1. Apply for Leave
**Who**: Any authenticated user
**Process**:
1. User clicks "Apply for Leave" button
2. User selects leave type
3. User selects start and end dates
4. System calculates total days (excluding weekends/holidays)
5. User enters reason for leave
6. User submits application
7. System generates unique leave ID
8. System creates leave application record
9. System sends email notification to user's manager
10. System logs application in activity log

**Business Rules**:
- Start date must be >= today (or allow past dates for backdated leave)
- End date must be >= start date
- Total days is auto-calculated
- Status is set to "Pending" by default
- Email is sent to manager specified in user.manager_email

#### 2. Approve Leave
**Who**: Managers, top management, admins
**Process**:
1. Manager receives email notification
2. Manager opens leave application
3. Manager reviews leave details
4. Manager clicks "Approve" button
5. System updates status to "Approved"
6. System sets approved_by and approved_date
7. System sends email notification to applicant
8. System logs approval in activity log

**Business Rules**:
- Only manager or higher roles can approve
- Approved leave cannot be edited (must be cancelled and reapplied)
- Approval email includes leave details

#### 3. Reject Leave
**Who**: Managers, top management, admins
**Process**:
1. Manager opens leave application
2. Manager clicks "Reject" button
3. Manager enters rejection reason
4. System updates status to "Rejected"
5. System sets approved_by, approved_date, and rejection_reason
6. System sends email notification to applicant with reason
7. System logs rejection in activity log

**Business Rules**:
- Rejection reason is required
- Rejected leave can be reapplied with modifications

#### 4. Cancel Leave
**Who**: Applicant (before approval), managers, admins
**Process**:
1. User opens leave application
2. User clicks "Cancel" button
3. System updates status to "Cancelled"
4. System sends notification to manager (if was pending)
5. System logs cancellation in activity log

**Business Rules**:
- Applicant can cancel only pending leave
- Managers can cancel approved leave
- Cancelled leave does not affect leave balance

### Leave Balance Tracking

**Implementation**: Leave balances are tracked per user per leave type.

**Balance Calculation**:
- Annual allocation (configured per leave type)
- Minus: Approved leave days
- Plus: Carry-forward from previous year (if applicable)

**Display**:
- Show available balance when applying for leave
- Warn if application exceeds available balance
- Allow negative balance with manager approval

---

## Work From Home (WFH) Management

**Last Updated:** 2025-11-12

### Overview
The WFH management system allows employees to apply for work-from-home days with manager approval.

### WFH Application Properties

#### Core Fields
- **WFH ID**: Unique identifier (e.g., WFH-001)
- **Employee ID**: Applicant's employee ID
- **WFH Date**: Date for work from home
- **Reason**: Reason for WFH request
- **Status**: Application status
  - Pending
  - Approved
  - Rejected
  - Cancelled

#### Approval Fields
- **Applied Date**: When application was submitted
- **Approved By**: Manager who approved/rejected
- **Approved Date**: When application was approved/rejected
- **Rejection Reason**: Reason for rejection (if rejected)

### WFH Application Workflow

#### 1. Apply for WFH
**Who**: Any authenticated user
**Process**:
1. User clicks "Apply for WFH" button
2. User selects WFH date
3. User enters reason
4. User submits application
5. System generates unique WFH ID
6. System creates WFH application record
7. System sends email notification to manager
8. System logs application in activity log

**Business Rules**:
- WFH date must be >= today (or allow past dates for backdated WFH)
- Reason is required
- Status is set to "Pending" by default
- One application per date per user

#### 2. Approve/Reject WFH
**Who**: Managers, top management, admins
**Process**: Same as leave approval/rejection workflow

**Business Rules**:
- Same as leave management
- WFH approval is typically faster than leave approval

---

## Social Feed

**Last Updated:** 2025-11-12

### Overview
The social feed is a communication platform for team members to share updates, announcements, and engage with each other.

### Feed Post Properties

#### Core Fields
- **Post ID**: Unique identifier
- **Content**: Post content (HTML rich text)
- **Created By**: Author's employee ID
- **Visibility**: Post visibility (public, private, team)
- **Is Pinned**: Whether post is pinned to top
- **Created At**: Post creation timestamp
- **Updated At**: Last modification timestamp

#### Related Data
- **Topics**: Array of topic/tag names
- **Reactions**: Array of reactions (like, love, etc.)
- **Comments**: Array of comments
- **Mentions**: Array of mentioned users

### Feed Features

#### 1. Create Post
**Who**: Any authenticated user
**Process**:
1. User clicks "Create Post" button
2. User enters content (rich text editor with formatting)
3. User optionally adds topics/tags
4. User optionally mentions other users (@username)
5. User selects visibility (public by default)
6. User submits post
7. System generates unique post ID
8. System creates post record
9. System extracts and stores topics
10. System extracts and stores mentions
11. System sends notifications to mentioned users
12. System logs post creation in activity log

**Business Rules**:
- Content is required
- Rich text formatting supported (bold, italic, lists, links)
- Mentions trigger email notifications
- Topics are case-insensitive

#### 2. React to Post
**Who**: Any authenticated user
**Process**:
1. User clicks reaction button (like, love, etc.)
2. System creates reaction record
3. System updates reaction count
4. System logs reaction in activity log

**Business Rules**:
- One reaction per user per post per reaction type
- Clicking same reaction again removes it (toggle)

#### 3. Comment on Post
**Who**: Any authenticated user
**Process**:
1. User enters comment text
2. User optionally mentions other users
3. User submits comment
4. System generates unique comment ID
5. System creates comment record
6. System sends notifications to post author and mentioned users
7. System logs comment in activity log

**Business Rules**:
- Comments can be nested (replies to comments)
- Mentions in comments trigger notifications
- Comments can be edited/deleted by author or admins

#### 4. Pin Post
**Who**: Admins, top management
**Process**:
1. User clicks "Pin Post" button
2. System sets is_pinned = 1
3. Post appears at top of feed
4. System logs pinning in activity log

**Business Rules**:
- Multiple posts can be pinned
- Pinned posts appear above regular posts
- Only authorized users can pin/unpin

---

## Project Management

**Last Updated:** 2025-11-12

### Overview
Projects provide organizational structure for tasks and bugs. They support hierarchical relationships (parent-child).

### Project Properties

#### Core Fields
- **Project ID**: Unique identifier (e.g., PROJ-001)
- **Project Name**: Project name
- **Description**: Project description
- **Parent Project ID**: Parent project (for subprojects)
- **Status**: Project status (Active, On Hold, Completed, Archived)
- **Start Date**: Project start date
- **End Date**: Project end date
- **Created By**: Creator's employee ID

### Project Hierarchy

**Structure**:
- Projects can have subprojects (unlimited nesting)
- Tasks and bugs can be assigned to projects or subprojects
- Hierarchical display in project tree view

**Example**:
```
PROJ-001: Website Redesign
├── PROJ-002: Frontend Development
│   ├── TSK-001: Design homepage
│   └── TSK-002: Implement navigation
└── PROJ-003: Backend Development
    ├── TSK-003: API development
    └── BUG-001: Fix login issue
```

---

## Timer System

**Last Updated:** 2025-11-12

### Overview
The timer system tracks time spent on tasks and bugs, providing accurate time tracking for billing and productivity analysis.

### Timer States

- **null**: No timer activity
- **running**: Timer is actively running
- **paused**: Timer is paused
- **stopped**: Timer is stopped

### Timer Operations

#### 1. Start Timer
**Who**: Assignees of the task/bug
**Process**:
1. User clicks "Start Timer" button
2. System checks if user has another running timer
3. If yes: System prompts to stop other timer first
4. System sets timer_state = "running"
5. System sets timer_start_time = current timestamp
6. System logs timer start in activity log

**Business Rules**:
- **CRITICAL**: Timers MUST NOT show for tasks/bugs with status "Closed" or "Resolved"
- Only one timer can run per user at a time
- Timer start is logged with timestamp

#### 2. Pause Timer
**Who**: User who started the timer
**Process**:
1. User clicks "Pause Timer" button
2. System calculates elapsed time since start
3. System adds elapsed time to timer_paused_time
4. System sets timer_state = "paused"
5. System logs timer pause in activity log

**Business Rules**:
- Can only pause running timer
- Paused time is accumulated

#### 3. Resume Timer
**Who**: User who paused the timer
**Process**:
1. User clicks "Resume Timer" button
2. System sets timer_state = "running"
3. System sets timer_start_time = current timestamp
4. System logs timer resume in activity log

**Business Rules**:
- Can only resume paused timer

#### 4. Stop Timer
**Who**: User who started the timer
**Process**:
1. User clicks "Stop Timer" button
2. System calculates total elapsed time
3. System creates timer session record (start_time, end_time, duration)
4. System adds session to timer_sessions array
5. System updates timer_total_time
6. System calculates and updates actual_hours
7. System sets timer_state = "stopped"
8. System logs timer stop in activity log

**Business Rules**:
- Stopping timer updates actual_hours field
- Timer sessions are stored for audit trail
- Actual hours = timer_total_time / 3600

### Timer Display

**UI Requirements**:
- Show timer state (running, paused, stopped)
- Show elapsed time (HH:MM:SS format)
- Update every second when running
- Show total time tracked
- Show actual hours calculated

---

## Activity Logging

**Last Updated:** 2025-11-12

### Overview
The activity log system tracks all changes and comments for tasks, bugs, leave applications, WFH applications, and feed posts.

### Activity Log Properties

#### Core Fields
- **Entity Type**: Type of entity (task, bug, leave, wfh, feed_post)
- **Entity ID**: Entity identifier
- **User ID**: User who performed action
- **Action Type**: Type of action (created, updated, comment, status_changed, etc.)
- **Field Name**: Field that was changed (for updates)
- **Old Value**: Previous value
- **New Value**: New value
- **Description**: Human-readable description
- **Is Comment**: Flag to distinguish comments (1) from activities (0)
- **Attachments**: Array of attachment URLs (for comments)
- **Created At**: Activity timestamp

### Activity Types

- **created**: Entity was created
- **updated**: Entity was updated
- **comment**: User added a comment
- **status_changed**: Status field changed
- **assigned**: Entity was assigned to user
- **timer_started**: Timer was started
- **timer_paused**: Timer was paused
- **timer_resumed**: Timer was resumed
- **timer_stopped**: Timer was stopped
- **attachment_added**: Attachment was added
- **deleted**: Entity was deleted

### Activity Filtering

**Default Behavior**:
- **Comments Tab**: Shows entries where `is_comment = 1` (showComments=true by default)
- **Activity Tab**: Shows entries where `is_comment = 0` (showActivity=false by default)

**Filter Options**:
- Filter by action type
- Filter by user
- Filter by date range
- Search by description

### Activity Display

**Format**:
```
[User Name] [Action] [Entity] [Timestamp]
[Description]
[Old Value] → [New Value] (for field changes)
```

**Example**:
```
John Doe updated Task TSK-001 - 2 hours ago
Changed status from "In Progress" to "Completed"
In Progress → Completed
```

---

## Notifications

**Last Updated:** 2025-11-12

### Overview
The system sends email notifications for important events to keep users informed.

### Email Configuration

- **SMTP Server**: smtp.gmail.com:465 (SSL)
- **From Address**: amtariksha@gmail.com
- **Templates**: HTML email templates in /public directory

### Notification Triggers

#### Task Notifications
- **Task Assigned**: When task is assigned to user
- **Task Updated**: When assigned task is updated (optional, configurable)
- **Task Completed**: When task is marked as completed (to creator)
- **Task Comment**: When someone comments on user's task

#### Bug Notifications
- **Bug Assigned**: When bug is assigned to user
- **Bug Status Changed**: When bug status changes (to reporter and assignee)
- **Bug Comment**: When someone comments on user's bug

#### Leave Notifications
- **Leave Applied**: To manager when employee applies for leave
- **Leave Approved**: To employee when leave is approved
- **Leave Rejected**: To employee when leave is rejected (includes reason)

#### WFH Notifications
- **WFH Applied**: To manager when employee applies for WFH
- **WFH Approved**: To employee when WFH is approved
- **WFH Rejected**: To employee when WFH is rejected (includes reason)

#### Feed Notifications
- **Mentioned in Post**: When user is mentioned in a feed post
- **Mentioned in Comment**: When user is mentioned in a comment
- **Comment on Post**: When someone comments on user's post (optional)

### Email Templates

**Template Variables**:
- `{{userName}}`: Recipient's name
- `{{taskId}}`: Task ID
- `{{taskName}}`: Task name
- `{{assignedBy}}`: Assigner's name
- `{{startDate}}`: Start date
- `{{endDate}}`: End date
- `{{priority}}`: Priority level
- `{{status}}`: Current status
- `{{reason}}`: Reason (for leave/WFH)
- `{{rejectionReason}}`: Rejection reason

---

## User Interface Requirements

**Last Updated:** 2025-11-12

### Design Patterns

#### ClickUp-Style UI
The system follows ClickUp-style UI patterns:

1. **Inline Dropdowns**: Quick actions use inline dropdowns instead of popup modals
2. **Floating Timer Widget**: Timer widget floats on screen for easy access
3. **Comprehensive Edit Screens**: Clicking ID/name opens full edit screen
4. **Activity Logs**: All changes tracked and displayed in activity log

#### Collapsible Text Components

**Configuration** (from settings table):
- **Collapse Threshold**: 300 characters OR 5 lines (whichever comes first)
- **Expand/Collapse Button**: Right-aligned with ChevronDown/Up icons
- **Gradient Overlay**: When collapsed, show gradient fade at bottom
- **Smooth Transitions**: Animate expand/collapse
- **Whitespace Formatting**: Use whitespace-pre-wrap for proper formatting
- **Independent State**: Each item has its own expand/collapse state
- **Persist State**: Optionally persist state per page/component (configurable)

**Example**:
```
Short text displays normally.

Long text that exceeds 300 characters or 5 lines shows with gradient
overlay and "Show more" button...
                                                    [Show more ▼]

After clicking "Show more":
Long text that exceeds 300 characters or 5 lines shows in full with
all content visible and proper formatting preserved.
                                                    [Show less ▲]
```

### Responsive Design

- **Web**: Desktop-first design, responsive down to tablet
- **Mobile**: Native mobile app with touch-optimized UI
- **Breakpoints**:
  - Desktop: >= 1024px
  - Tablet: 768px - 1023px
  - Mobile: < 768px

### Accessibility

- **Keyboard Navigation**: All features accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: WCAG AA compliance
- **Focus Indicators**: Clear focus states for all interactive elements

---

## Business Rules

**Last Updated:** 2025-11-12

### Critical Business Rules

1. **Timer Visibility**: Timers MUST NOT show for tasks/bugs with status "Closed" or "Resolved"

2. **Role-Based Access**: Users can only access data based on their role (amtariksian, management, top_management, admin)

3. **Single Running Timer**: Only one timer can run per user at a time across all tasks and bugs

4. **Leave Approval**: Only managers and above can approve/reject leave applications

5. **Soft Deletes**: All deletions are soft deletes (deleted_at timestamp) to maintain audit trail

6. **Activity Logging**: All changes must be logged in activity_log table

7. **Email Notifications**: All assignments and approvals must trigger email notifications

8. **Multiple Assignees (Tasks)**: Tasks support multiple assignees via JSONB array

9. **Single Assignee (Bugs)**: Bugs support only one assignee at a time

10. **Date Validation**: Start date must be <= End date for all entities

11. **Status Transitions**: Changing status to Closed/Resolved automatically stops any running timer

12. **Attachment Storage**: All attachments stored in AWS S3, URLs saved in database

13. **Comment vs Activity**: Comments have `is_comment = 1`, activities have `is_comment = 0`

14. **Default Filters**: Comments shown by default (showComments=true), activities hidden (showActivity=false)

15. **Project Hierarchy**: Projects can have unlimited nesting depth via parent_project_id

---

**For technical implementation details, see ARCHITECTURE.md**
**For development patterns and setup, see DEVELOPER_GUIDE.md**
**For quick reference, see QUICK_REFERENCE.md**


