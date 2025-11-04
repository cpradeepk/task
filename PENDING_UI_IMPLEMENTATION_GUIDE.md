# Pending UI Implementation Guide

**Date:** 2025-01-04  
**Status:** Database migrations complete, UI implementation pending

---

## Overview

All database migrations for Priorities 4, 5, and 6 have been successfully applied. This document outlines the remaining UI implementation work needed to complete the features.

---

## ✅ Priority 4: Multiple Assignees UI (MOSTLY COMPLETE)

### Completed:
- ✅ Task list page (`apps/web/src/app/tasks/page.tsx`) - Updated filtering and display
- ✅ Task detail page (`apps/web/src/app/tasks/[taskId]/page.tsx`) - Updated display (edit via modal)
- ✅ Dashboard TaskListNew component - Updated display
- ✅ Created `AssigneeList` helper component

### Pending:
- 🔄 Update `TaskEditModal` to support multi-select for assignees
- 🔄 Update bugs/development pages to handle multiple assignees (if applicable)
- 🔄 Update master tasks page to display multiple assignees
- 🔄 Update unified work items list to display multiple assignees

### Implementation Notes:
- Use the `AssigneeList` component for displaying multiple assignees
- For editing, consider using a multi-select dropdown or checkbox list
- The backend already supports arrays, so just update the UI

---

## 🔄 Priority 5: Subtask → Checklist Rename (PENDING)

### Database Status:
- ✅ Tables renamed: `subtasks` → `task_checklists`, `bug_subtasks` → `development_checklists`
- ✅ Parent columns added: `parent_task_id` to `tasks`, `parent_dev_id` to `bugs`

### UI Changes Needed:

#### 1. Rename API Routes:
- `apps/web/src/app/api/subtasks/` → `apps/web/src/app/api/task-checklists/`
- `apps/web/src/app/api/bug-subtasks/` → `apps/web/src/app/api/development-checklists/`
- Update all route handlers to use new table names

#### 2. Rename Database Functions:
- `apps/web/src/lib/db/subtasks.ts` → `apps/web/src/lib/db/taskChecklists.ts`
- `apps/web/src/lib/db/bugSubtasks.ts` → `apps/web/src/lib/db/developmentChecklists.ts`
- Update all function names and SQL queries to use new table names

#### 3. Rename Components:
- `apps/web/src/components/subtasks/` → `apps/web/src/components/checklists/`
- `apps/web/src/components/bugs/BugSubTaskManager.tsx` → `BugChecklistManager.tsx`
- `apps/web/src/components/tasks/TaskSubTaskManager.tsx` → `TaskChecklistManager.tsx`
- Update all component names and imports

#### 4. Update UI Text:
- Change all "Subtask" references to "Checklist" in UI
- Update button labels: "Add Subtask" → "Add Checklist Item"
- Update section headers: "Subtasks" → "Checklist"

#### 5. Implement True Subtasks:
- Add "Add Subtask" button to task/development detail pages (creates a full task/bug with parent_task_id/parent_dev_id)
- Implement ClickUp-style expandable subtask display
- Show parent-child hierarchy in task lists
- Add breadcrumb navigation for subtasks

### Files to Update:
```
API Routes:
- apps/web/src/app/api/subtasks/route.ts
- apps/web/src/app/api/subtasks/[id]/route.ts
- apps/web/src/app/api/bug-subtasks/route.ts
- apps/web/src/app/api/bug-subtasks/[id]/route.ts

Database Functions:
- apps/web/src/lib/db/subtasks.ts
- apps/web/src/lib/db/bugSubtasks.ts

Components:
- apps/web/src/components/subtasks/SubTaskManager.tsx
- apps/web/src/components/subtasks/SubTaskList.tsx
- apps/web/src/components/subtasks/SubTaskForm.tsx
- apps/web/src/components/bugs/BugSubTaskManager.tsx
- apps/web/src/components/bugs/BugSubTaskList.tsx
- apps/web/src/components/bugs/BugSubTaskForm.tsx
- apps/web/src/components/tasks/TaskSubTaskManager.tsx
- apps/web/src/components/tasks/TaskSubTaskList.tsx
- apps/web/src/components/tasks/TaskSubTaskForm.tsx

Pages:
- apps/web/src/app/tasks/[taskId]/page.tsx
- apps/web/src/app/bugs/[bugId]/page.tsx
```

---

## 🔄 Priority 6: Related Items Linking (PENDING)

### Database Status:
- ✅ Junction tables created:
  - `task_relationships` (task-to-task)
  - `task_development_relationships` (task-to-development)
  - `development_relationships` (development-to-development)
- ✅ Relationship types supported: `blocks`, `is_blocked_by`, `relates_to`, `duplicates`

### UI Changes Needed:

#### 1. Create API Routes:
```typescript
// apps/web/src/app/api/relationships/route.ts
POST /api/relationships
- Create a new relationship
- Body: { sourceId, targetId, relationshipType, sourceType, targetType }

GET /api/relationships
- Get relationships for a task/development item
- Query: ?id=TASK-001&type=task

DELETE /api/relationships/[id]
- Delete a relationship
```

#### 2. Create UI Components:
```typescript
// apps/web/src/components/relationships/RelatedItemsManager.tsx
- Display related items grouped by relationship type
- Show bidirectional relationships
- Allow adding/removing relationships

// apps/web/src/components/relationships/RelatedItemForm.tsx
- Dropdown to select relationship type
- Search/select target item (task or development)
- Create bidirectional relationship
```

#### 3. Update Detail Pages:
- Add "Related Items" section to task detail page
- Add "Related Items" section to development detail page
- Display related items with relationship type badges
- Show clickable links to related items

#### 4. Implement Bidirectional Linking:
- When creating "blocks" relationship, automatically create "is_blocked_by" in reverse
- When creating "duplicates" relationship, create symmetric relationship
- When deleting a relationship, delete the reverse relationship

### Example UI:
```
┌─────────────────────────────────────────┐
│ Related Items                           │
├─────────────────────────────────────────┤
│ Blocks:                                 │
│  • TASK-0005 - Fix login bug           │
│  • DEV-0012 - Implement auth system    │
│                                         │
│ Blocked by:                             │
│  • TASK-0003 - Setup database          │
│                                         │
│ Related to:                             │
│  • TASK-0008 - Update documentation    │
│                                         │
│ [+ Add Related Item]                    │
└─────────────────────────────────────────┘
```

---

## Implementation Priority

1. **Priority 4 (Multiple Assignees)** - 90% complete, just need to update edit modal
2. **Priority 6 (Related Items)** - Easier to implement, clear scope
3. **Priority 5 (Checklists/Subtasks)** - Most complex, requires many file renames

---

## Testing Checklist

After implementing each priority:

### Priority 4:
- [ ] Create task with multiple assignees
- [ ] Edit task to add/remove assignees
- [ ] Filter tasks by assignee
- [ ] Verify "My Tasks" filter works with multiple assignees

### Priority 5:
- [ ] Create checklist item for task
- [ ] Create checklist item for development item
- [ ] Mark checklist items as complete
- [ ] Create true subtask (full task with parent)
- [ ] View subtask hierarchy
- [ ] Delete checklist item

### Priority 6:
- [ ] Create "blocks" relationship between tasks
- [ ] Verify bidirectional relationship created
- [ ] View related items in detail page
- [ ] Delete relationship
- [ ] Create cross-module relationship (task → development)

---

## Next Steps

1. Complete Priority 4 by updating `TaskEditModal` for multi-select assignees
2. Implement Priority 6 (Related Items) - create API routes and UI components
3. Implement Priority 5 (Checklists/Subtasks) - rename files and update UI text


