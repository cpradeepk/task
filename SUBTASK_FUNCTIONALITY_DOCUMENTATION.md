# SubTask Functionality Documentation

## Overview
The JSR Task Management System implements a SubTask feature that allows tasks to have additional descriptive information or breakdown details. This document provides a comprehensive explanation of how SubTasks are implemented, stored, and displayed.

## Important Note: SubTask vs Support Tasks

**SubTask** and **Support Tasks** are TWO DIFFERENT features:

1. **SubTask** (`sub_task` field):
   - A text field that provides additional details or breakdown of the main task
   - Stored as a simple TEXT column in the database
   - Displayed as a blue info box under the task description
   - Example: "Phase 1: Database design, Phase 2: API development"

2. **Support Tasks** (separate task records):
   - Completely separate task records created for support team members
   - Each support member gets their own task with `[SUPPORT]` prefix
   - Linked to main task via `subTask` field containing "Support for: {mainTaskId}"
   - Stored as separate rows in the tasks table

## Database Schema

### Table: `tasks`

**SubTask Column:**
```sql
sub_task TEXT
```

**Location:** `database/schema.sql` (Line 73)

**Full Schema Context:**
```sql
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL UNIQUE,
    internal_id VARCHAR(100) NOT NULL UNIQUE,
    select_type ENUM('Normal', 'Recursive') DEFAULT 'Normal',
    recursive_type ENUM('Daily', 'Weekly', 'Monthly', 'Annually'),
    description TEXT NOT NULL,
    assigned_to VARCHAR(50) NOT NULL,
    assigned_by VARCHAR(50) NOT NULL,
    support JSON,                    -- Array of support team member IDs
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    priority ENUM('U&I', 'NU&I', 'U&NI', 'NU&NI') DEFAULT 'NU&NI',
    estimated_hours DECIMAL(10, 2) DEFAULT 0,
    actual_hours DECIMAL(10, 2) DEFAULT 0,
    daily_hours JSON,
    status ENUM('Yet to Start', 'In Progress', 'Delayed', 'Done', 'Cancel', 'Hold', 'ReOpened', 'Stop') DEFAULT 'Yet to Start',
    remarks TEXT,
    difficulties TEXT,
    sub_task TEXT,                   -- ⭐ SubTask field
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
    INDEX idx_created_at (created_at)
)
```

## TypeScript Type Definition

**File:** `src/lib/types.ts` (Line 93)

```typescript
export interface Task {
  id: string                // Database auto-increment ID
  taskId: string            // User-facing task ID (e.g., "JSR-001")
  selectType: 'Normal' | 'Recursive'
  recursiveType?: 'Daily' | 'Weekly' | 'Monthly' | 'Annually'
  description: string       // Main task description
  assignedTo: string        // Employee ID of person assigned
  assignedBy: string        // Employee ID of person who created task
  support?: string[]        // Array of support team member IDs
  startDate: string         // ISO date string
  endDate: string           // ISO date string
  priority: 'U&I' | 'NU&I' | 'U&NI' | 'NU&NI'
  estimatedHours?: number   // Estimated time (in hours)
  actualHours?: number      // Actual time spent (in hours)
  dailyHours?: string       // JSON string of daily hours
  status: 'Yet to Start' | 'In Progress' | 'Delayed' | 'Done' | 'Cancel' | 'Hold' | 'ReOpened' | 'Stop'
  remarks?: string          // Additional notes/comments
  difficulties?: string     // Challenges faced during task execution
  subTask?: string          // ⭐ Sub-task details or breakdown
  relatedTasks?: string | null // Comma-separated task IDs for multi-user assignments
  projectId?: string | null // Project ID this task belongs to
  createdAt: string         // Timestamp when task was created
  updatedAt: string         // Timestamp when task was last updated
}
```

## How SubTasks Are Created

### 1. Task Creation Form

**File:** `src/app/tasks/create/page.tsx` (Lines 21-36)

```typescript
const [formData, setFormData] = useState({
  selectType: '',
  recursiveType: '',
  description: '',
  support: [] as string[],
  startDate: '',
  endDate: '',
  priority: '',
  estimatedHours: '',
  hoursWorked: '',
  subTask: '',              // ⭐ SubTask input field
  projectId: null as string | null,
  assignToSomeoneElse: false,
  assignedTo: '',
  multiUserAssignment: false,
  assignees: [] as string[]
})
```

### 2. SubTask Field in Form UI

**File:** `src/app/tasks/create/page.tsx` (Lines 500-520, approximate)

The form includes a text input or textarea for entering subtask details:

```tsx
<div>
  <label htmlFor="subTask" className="block text-sm font-medium text-gray-700">
    Sub Task (Optional)
  </label>
  <textarea
    id="subTask"
    name="subTask"
    value={formData.subTask}
    onChange={handleInputChange}
    rows={3}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
    placeholder="Enter sub-task details or breakdown..."
  />
</div>
```

### 3. SubTask Saved to Database

**File:** `src/app/tasks/create/page.tsx` (Lines 189-208)

When creating a task, the subTask value is included in the task data:

```typescript
const taskData = {
  taskId,
  selectType: formData.selectType as 'Normal' | 'Recursive',
  recursiveType: formData.recursiveType as 'Daily' | 'Weekly' | 'Monthly' | 'Annually' | undefined,
  description: formData.description,
  assignedTo: assigneeId,
  assignedBy: currentUser.employeeId,
  support: formData.support,
  startDate: formData.startDate,
  endDate: formData.endDate,
  priority: formData.priority as 'U&I' | 'NU&I' | 'U&NI' | 'NU&NI',
  estimatedHours: estimatedHours,
  projectId: formData.projectId,
  hoursWorked: hoursWorked,
  status: 'Yet to Start' as const,
  subTask: formData.subTask || undefined,  // ⭐ SubTask included here
  relatedTasks: createdTaskIds.length > 0 ? createdTaskIds.join(',') : undefined
}
```

**File:** `src/lib/db/tasks.ts` (Lines 186-196)

The database insertion includes the sub_task field:

```typescript
export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  return withRetry(async () => {
    await query<ResultSetHeader>(
      `INSERT INTO tasks (
        internal_id, task_id, select_type, recursive_type, description,
        assigned_to, assigned_by, support, start_date, end_date, priority,
        estimated_hours, actual_hours, daily_hours, status, remarks,
        difficulties, sub_task, project_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.taskId,
        task.taskId,
        task.selectType,
        task.recursiveType || null,
        task.description,
        task.assignedTo,
        task.assignedBy,
        JSON.stringify(task.support || []),
        task.startDate,
        task.endDate,
        task.priority,
        task.estimatedHours,
        // ... other fields ...
        task.subTask || null,  // ⭐ SubTask saved to database
        task.projectId || null
      ]
    )
  })
}
```

## How SubTasks Are Displayed

### 1. Dashboard - UnifiedWorkItemsList Component

**File:** `src/components/dashboard/UnifiedWorkItemsList.tsx` (Lines 291-296)

```tsx
<h4 className="font-medium text-black mb-2 text-sm sm:text-base break-words">
  {task.description}
</h4>

{task.subTask && (
  <div className="mb-2 p-2 bg-blue-50 rounded text-xs sm:text-sm break-words">
    <span className="font-medium text-blue-800">SubTask:</span>
    <span className="text-blue-700 ml-1">{task.subTask}</span>
  </div>
)}
```

**Visual Appearance:**
- Displayed as a light blue box (`bg-blue-50`)
- Label "SubTask:" in bold blue text (`text-blue-800`)
- SubTask content in regular blue text (`text-blue-700`)
- Only shown if `task.subTask` has a value

### 2. Dashboard - TaskListNew Component

**File:** `src/components/dashboard/TaskListNew.tsx` (Lines 206-211)

```tsx
<h4 className="font-medium text-black mb-2">
  {task.description}
</h4>

{task.subTask && (
  <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
    <span className="font-medium text-blue-800">SubTask:</span>
    <span className="text-blue-700 ml-1">{task.subTask}</span>
  </div>
)}
```

Same visual styling as UnifiedWorkItemsList.

### 3. Master Tasks Page

**File:** `src/app/master-tasks/page.tsx`

SubTasks are displayed in the task cards on the Master Tasks page with the same blue box styling.

## Relationship Between Tasks and SubTasks

### One-to-One Relationship
- Each task can have **zero or one** SubTask
- SubTask is a **text field**, not a separate database record
- SubTask is **optional** - tasks can exist without SubTasks

### No Parent-Child Hierarchy
- SubTasks are NOT separate task records
- SubTasks do NOT have their own status, priority, or assignees
- SubTasks are simply **additional descriptive text** for the main task

### Contrast with Support Tasks
Support Tasks ARE separate task records:

**File:** `src/lib/supportTaskService.ts` (Lines 28-45)

```typescript
const supportTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
  taskId: generateTaskId(),
  selectType: mainTask.selectType,
  recursiveType: mainTask.recursiveType,
  description: `[SUPPORT] ${mainTask.description}`,  // Prefixed with [SUPPORT]
  assignedTo: supportMemberId,                        // Assigned to support member
  assignedBy: mainTask.assignedBy,
  support: [],                                        // No nested support
  startDate: mainTask.startDate,
  endDate: mainTask.endDate,
  priority: mainTask.priority,
  estimatedHours: 0,
  actualHours: 0,
  status: 'Yet to Start',
  remarks: `Support task for main task: ${mainTask.taskId}`,
  subTask: `Support for: ${mainTask.taskId}`,        // ⭐ Links to main task
  dailyHours: '{}'
}
```

## Use Cases for SubTasks

### 1. Task Breakdown
```
Description: "Develop User Authentication Module"
SubTask: "Phase 1: Database schema design
Phase 2: API endpoint development
Phase 3: Frontend integration
Phase 4: Testing and deployment"
```

### 2. Additional Context
```
Description: "Fix login bug"
SubTask: "Issue occurs only on mobile Safari browser when using social login"
```

### 3. Checklist
```
Description: "Prepare monthly report"
SubTask: "- Collect data from all departments
- Create charts and graphs
- Write executive summary
- Review with manager
- Submit to stakeholders"
```

## Limitations and Known Issues

### Current Limitations:
1. **No Structured Data**: SubTask is plain text, not structured data
2. **No Progress Tracking**: Cannot track completion of individual subtask items
3. **No Separate Status**: SubTask inherits the status of the parent task
4. **No Assignees**: Cannot assign different people to different subtask items
5. **No Validation**: No character limit or format validation

### Potential Improvements:
1. Convert SubTask to a separate table for structured subtasks
2. Add progress tracking (e.g., "3 of 5 subtasks completed")
3. Allow individual status for each subtask item
4. Support markdown formatting for better readability
5. Add character limit and validation

## Code References

### Key Files:
1. **Database Schema**: `database/schema.sql` (Line 73)
2. **TypeScript Type**: `src/lib/types.ts` (Line 93)
3. **Task Creation Form**: `src/app/tasks/create/page.tsx` (Lines 21-36, 189-208)
4. **Database Operations**: `src/lib/db/tasks.ts` (Lines 186-196)
5. **Dashboard Display**: `src/components/dashboard/UnifiedWorkItemsList.tsx` (Lines 291-296)
6. **Task List Display**: `src/components/dashboard/TaskListNew.tsx` (Lines 206-211)
7. **Support Task Service**: `src/lib/supportTaskService.ts` (Lines 28-45)

### API Endpoints:
- **Create Task**: `POST /api/tasks` - Includes subTask in request body
- **Update Task**: `PUT /api/tasks/[taskId]` - Can update subTask field
- **Get Tasks**: `GET /api/tasks/user/[employeeId]` - Returns tasks with subTask field

## Summary

The SubTask functionality in the JSR Task Management System is a **simple text field** that provides additional details or breakdown for tasks. It is:

- ✅ Stored as a TEXT column in the database
- ✅ Optional (can be empty)
- ✅ Displayed in a blue info box in the UI
- ✅ Included in task creation and update operations
- ✅ Separate from Support Tasks (which are actual task records)

**Key Distinction**: SubTask is descriptive text, while Support Tasks are separate task records assigned to support team members.

---

**Document Version:** 1.0  
**Last Updated:** October 27, 2025  
**Author:** Development Team

