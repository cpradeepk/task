# Activity Log Implementation Audit

This document lists ALL use cases where activity logging is currently implemented in the JSR Task Management System.

**Legend:**
- `[X]` = Activity logging is currently implemented
- `[ ]` = Activity logging is NOT implemented

---

## Task Management

### Task Lifecycle
- [X] Task creation
- [X] Task status change
- [X] Task assignment change (assignedTo)
- [X] Task priority change
- [X] Task description change
- [X] Task estimated hours change
- [X] Task actual hours change
- [X] Task start date change
- [X] Task end date change
- [X] Task type change (selectType)
- [X] Task recursive type change
- [X] Task comments posted by users

### Task Operations
- [ ] Task deletion (soft delete)
- [ ] Task restoration (from deleted items)
- [ ] Task timer start
- [ ] Task timer stop
- [ ] Task timer pause/resume
- [ ] Task attachment upload
- [ ] Task attachment deletion

### Subtasks
- [ ] Subtask creation
- [ ] Subtask completion
- [ ] Subtask status change
- [ ] Subtask assignment change
- [ ] Subtask description change
- [ ] Subtask deletion

---

## Bug Tracking

### Bug Lifecycle
- [X] Bug creation
- [X] Bug status change
- [X] Bug assignment change (assignedTo)
- [X] Bug priority change
- [X] Bug severity change
- [X] Bug title change
- [X] Bug description change
- [X] Bug category change
- [X] Bug platform change
- [X] Bug environment change
- [X] Bug estimated hours change
- [X] Bug actual hours change (NOTE: Excluded from auto-logging, handled manually in frontend)
- [X] Bug comments posted by users

### Bug Operations
- [ ] Bug deletion (soft delete)
- [ ] Bug restoration (from deleted items)
- [ ] Bug attachment upload
- [ ] Bug attachment deletion

### Bug Subtasks
- [ ] Bug subtask creation
- [ ] Bug subtask completion
- [ ] Bug subtask status change
- [ ] Bug subtask assignment change
- [ ] Bug subtask description change
- [ ] Bug subtask deletion

---

## Leave Management

### Leave Application Lifecycle
- [ ] Leave application submitted
- [ ] Leave application approved
- [ ] Leave application rejected
- [ ] Leave application cancelled
- [ ] Leave application updated (dates, type, reason)
- [ ] Leave comments posted by users

### Leave Operations
- [ ] Leave deletion
- [ ] Leave restoration

---

## Work From Home (WFH) Management

### WFH Application Lifecycle
- [ ] WFH application submitted
- [ ] WFH application approved
- [ ] WFH application rejected
- [ ] WFH application cancelled
- [ ] WFH application updated (dates, type, location, reason)
- [ ] WFH comments posted by users

### WFH Operations
- [ ] WFH deletion
- [ ] WFH restoration

---

## Project Management

### Project Lifecycle
- [ ] Project creation
- [ ] Project name change
- [ ] Project description change
- [ ] Project status change
- [ ] Project deletion
- [ ] Project restoration

### Subproject Lifecycle
- [ ] Subproject creation
- [ ] Subproject name change
- [ ] Subproject description change
- [ ] Subproject status change
- [ ] Subproject deletion
- [ ] Subproject restoration

---

## User Management

### User Account Operations
- [ ] User account creation
- [ ] User profile update (name, email, phone, etc.)
- [ ] User role change
- [ ] User department change
- [ ] User manager assignment change
- [ ] User account deactivation
- [ ] User account reactivation
- [ ] User password change

---

## Settings Management

### System Settings
- [ ] Settings value change (task_priorities, bug_categories, etc.)
- [ ] Settings creation
- [ ] Settings deletion

---

## Summary

### Currently Implemented (with [X]):
1. **Task Management**: Task creation, all field changes (status, assignment, priority, description, dates, hours, type), user comments
2. **Bug Tracking**: Bug creation, all field changes (status, assignment, priority, severity, title, description, category, platform, environment, hours), user comments

### NOT Implemented (without [X]):
1. **Task Operations**: Deletion, restoration, timer operations, attachments
2. **Subtasks**: All subtask operations (creation, completion, changes, deletion)
3. **Bug Operations**: Deletion, restoration, attachments
4. **Bug Subtasks**: All bug subtask operations
5. **Leave Management**: All leave operations (submission, approval, rejection, updates, comments)
6. **WFH Management**: All WFH operations (submission, approval, rejection, updates, comments)
7. **Project Management**: All project and subproject operations
8. **User Management**: All user account operations
9. **Settings Management**: All settings operations

---

## Technical Notes

### Activity Log Database Schema
- **Table**: `activity_log`
- **Supported Entity Types**: `task`, `bug`, `leave`, `wfh`
- **Key Fields**: `entity_type`, `entity_id`, `user_id`, `action_type`, `field_name`, `old_value`, `new_value`, `description`, `is_comment`, `created_at`

### Implementation Locations
- **Core Functions**: `apps/web/src/lib/db/activityLog.ts`
  - `createActivityLog()` - Create single activity log entry
  - `logFieldChange()` - Log a single field change
  - `logEntityChanges()` - Automatically log all changes between old and new entity states
  - `getActivityLogByEntity()` - Retrieve all activities for an entity
  - `getCommentsByEntity()` - Retrieve only comments
  - `getSystemActivitiesByEntity()` - Retrieve only system activities

- **API Endpoints**:
  - `apps/web/src/app/api/activity-log/route.ts` - GET (fetch) and POST (create) activity logs
  - `apps/web/src/app/api/tasks/route.ts` - Task creation logging
  - `apps/web/src/app/api/tasks/[taskId]/route.ts` - Task update logging
  - `apps/web/src/app/api/bugs/route.ts` - Bug creation logging
  - `apps/web/src/app/api/bugs/[bugId]/route.ts` - Bug update logging

### Known Issues
1. **PostgreSQL Compatibility**: `createActivityLog()` uses `result.insertId` (MySQL syntax) instead of PostgreSQL `RETURNING` clause - causes "Failed to retrieve created activity log entry" error
2. **Activity Tab Not Enabled**: UI logic for enabling Activity tab may not be working correctly
3. **No Data Displayed**: Activity log retrieval may be failing or returning empty results

---

## Recommendations for Review

Please review this audit and:
1. Remove `[X]` from any use cases where activity logging is NOT needed
2. Add `[X]` to any use cases where activity logging SHOULD be implemented but is currently missing
3. Indicate which features should have activity logging removed to simplify the codebase

