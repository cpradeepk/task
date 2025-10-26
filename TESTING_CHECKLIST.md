# Project Hierarchy Implementation - Testing Checklist

## Phase 11: Testing & Validation

This document outlines all the tests that should be performed to validate the project hierarchy implementation.

---

## 1. Database Schema Tests

### Projects Table
- [x] Projects table created successfully
- [x] All columns present (id, project_id, project_name, parent_project_id, etc.)
- [x] Status ENUM values correct ('Active', 'Inactive', 'Deleted')
- [x] Foreign key constraint on parent_project_id works
- [x] Sample data inserted (10 projects: 3 main, 7 sub-projects)
- [ ] Indexes created and working efficiently

### Tasks Table Updates
- [x] project_id column added to tasks table
- [x] Foreign key constraint with SET NULL works
- [x] Index on project_id created
- [ ] Existing tasks still work without project_id

### Bugs Table Updates
- [x] project_id column added to bugs table
- [x] feature column added to bugs table
- [x] type column added with ENUM ('testcase', 'feature', 'other')
- [x] Foreign key constraint with SET NULL works
- [x] Indexes created
- [ ] Existing bugs still work without new fields

---

## 2. Backend API Tests

### Projects API (`/api/projects`)

#### GET /api/projects
- [ ] Returns all active projects by default
- [ ] Filter by status works (Active, Inactive, Deleted)
- [ ] Filter by type works (main, sub)
- [ ] includeDeleted parameter works (admin only)
- [ ] Returns proper error for unauthorized users
- [ ] Response includes all required fields

#### POST /api/projects
- [ ] Creates new main project successfully
- [ ] Creates new sub-project successfully
- [ ] Auto-generates project_id (PRJ-001, PRJ-002, etc.)
- [ ] Validates required fields (project_name, status)
- [ ] Prevents sub-projects from having sub-projects (2-level limit)
- [ ] Only admin/top_management can create projects
- [ ] Returns proper error messages for validation failures

#### GET /api/projects/[projectId]
- [ ] Returns project details with sub-projects
- [ ] Returns 404 for non-existent project
- [ ] Includes sub-projects list for main projects
- [ ] Works for both main and sub-projects

#### PUT /api/projects/[projectId]
- [ ] Updates project successfully
- [ ] Validates hierarchy constraints
- [ ] Only admin/top_management can update
- [ ] Returns updated project data

#### DELETE /api/projects/[projectId]
- [ ] Soft deletes project (sets status to 'Deleted')
- [ ] Sets deleted_at and deleted_by
- [ ] Only admin can delete
- [ ] Returns error if project has active sub-projects
- [ ] Tasks/bugs associated with project are not deleted (SET NULL)

#### POST /api/projects/[projectId]/restore
- [ ] Restores deleted project
- [ ] Only admin can restore
- [ ] Sets status back to 'Active'
- [ ] Clears deleted_at and deleted_by

#### GET /api/projects/hierarchy
- [ ] Returns projects in tree structure
- [ ] Main projects at root level
- [ ] Sub-projects nested under parents
- [ ] Proper parent-child relationships

### Work Items API (`/api/work-items/user/[employeeId]`)
- [ ] Returns both tasks and bugs for user
- [ ] Filter by type works (all, task, bug)
- [ ] Filter by projectId works
- [ ] Filter by status works
- [ ] Includes project names
- [ ] Sorted by creation date (newest first)
- [ ] Returns empty array for user with no items

### Tasks API Updates
- [ ] POST /api/tasks accepts projectId
- [ ] GET /api/tasks returns projectId
- [ ] Tasks can be created without projectId (optional)

### Bugs API Updates
- [ ] POST /api/bugs accepts projectId, feature, type
- [ ] GET /api/bugs returns all new fields
- [ ] Bugs can be created without new fields (optional)
- [ ] Type validation works (testcase, feature, other)

---

## 3. Frontend Component Tests

### ProjectSelector Component
- [ ] Displays hierarchical project dropdown
- [ ] Shows tree structure with indentation (└─)
- [ ] "None" option appears when includeNone=true
- [ ] Loading state displays correctly
- [ ] Error state displays correctly
- [ ] onChange callback works
- [ ] Disabled state works
- [ ] Required validation works

### WorkItemFilters Component
- [ ] Tab selection works (All, Tasks, Bugs)
- [ ] Project filter dropdown works
- [ ] Status filter dropdown works
- [ ] Clear filters button works
- [ ] Active filter count badge displays correctly
- [ ] onFilterChange callback works
- [ ] Responsive layout works

### UnifiedWorkItems Component
- [ ] Displays tasks and bugs together
- [ ] Stats cards show correct counts
- [ ] Filtering works correctly
- [ ] Click on item navigates to detail page
- [ ] Status badges display with correct colors
- [ ] Priority colors display correctly
- [ ] Project names display when assigned
- [ ] Due dates display correctly
- [ ] Severity badges display for bugs
- [ ] Loading state works
- [ ] Error state works
- [ ] Empty state works

---

## 4. UI Page Tests

### Projects List Page (`/projects`)
- [ ] Displays all projects in tree structure
- [ ] Visual hierarchy with indentation
- [ ] Status badges display correctly
- [ ] Create button visible for admin/top_management only
- [ ] Click on project navigates to details
- [ ] Empty state displays when no projects

### Project Create Page (`/projects/create`)
- [ ] Form displays correctly
- [ ] Project name input works
- [ ] Parent project selector works
- [ ] Description textarea works
- [ ] Status dropdown works
- [ ] Submit creates project successfully
- [ ] Validation errors display
- [ ] Only admin/top_management can access
- [ ] Redirects after successful creation

### Project Details Page (`/projects/[projectId]`)
- [ ] Displays project information
- [ ] Shows sub-projects list (if main project)
- [ ] Delete button visible for admin only
- [ ] Confirmation dialog works
- [ ] Delete action works
- [ ] Returns to list after deletion

### Task Create Page Updates
- [ ] ProjectSelector component displays
- [ ] Project selection works
- [ ] "Assign to someone else" checkbox visible for admin/top_management
- [ ] Checkbox toggles assignee field
- [ ] Task creation with project works
- [ ] Task creation without project works

### Bug Create Page Updates
- [ ] ProjectSelector component displays
- [ ] Feature input field displays
- [ ] Type dropdown displays with correct options
- [ ] All fields are optional
- [ ] Bug creation with all fields works
- [ ] Bug creation without new fields works
- [ ] Form validation works

### Dashboard Updates
- [ ] UnifiedWorkItems component displays
- [ ] Tabs work correctly
- [ ] Filters work correctly
- [ ] Stats display correctly
- [ ] Existing dashboard functionality preserved

---

## 5. Permission Tests

### Admin Permissions
- [ ] Can create projects
- [ ] Can update projects
- [ ] Can delete projects
- [ ] Can restore deleted projects
- [ ] Can view deleted projects
- [ ] Can assign tasks to others

### Top Management Permissions
- [ ] Can create projects
- [ ] Can update projects
- [ ] Cannot delete projects
- [ ] Cannot restore deleted projects
- [ ] Cannot view deleted projects
- [ ] Can assign tasks to others

### Employee Permissions
- [ ] Cannot create projects
- [ ] Cannot update projects
- [ ] Cannot delete projects
- [ ] Cannot restore deleted projects
- [ ] Cannot view deleted projects
- [ ] Cannot assign tasks to others (only self)

---

## 6. Data Integrity Tests

### Hierarchy Constraints
- [ ] Cannot create sub-project of a sub-project
- [ ] Cannot set parent_project_id to a sub-project
- [ ] Circular references prevented
- [ ] Orphaned sub-projects handled correctly

### Soft Delete Behavior
- [ ] Deleted projects not shown in normal lists
- [ ] Deleted projects shown to admin with includeDeleted=true
- [ ] Tasks/bugs keep their project_id when project deleted
- [ ] Restored projects become active again

### Foreign Key Behavior
- [ ] Deleting project sets tasks.project_id to NULL
- [ ] Deleting project sets bugs.project_id to NULL
- [ ] Cannot delete project with active sub-projects

---

## 7. Email Template Tests

### Task Creation Email
- [ ] Includes project name when task has project
- [ ] Shows "No project assigned" when no project
- [ ] All other fields still work

### Bug Creation Email
- [ ] Includes project name when bug has project
- [ ] Includes feature when specified
- [ ] Includes type when specified
- [ ] Shows defaults for missing fields
- [ ] All other fields still work

### Bug Assignment Email
- [ ] Includes project name when bug has project
- [ ] Includes feature when specified
- [ ] Includes type when specified
- [ ] Shows defaults for missing fields
- [ ] All other fields still work

---

## 8. Integration Tests

### End-to-End Workflows

#### Create Project and Task
1. [ ] Admin creates main project
2. [ ] Admin creates sub-project under main project
3. [ ] User creates task assigned to sub-project
4. [ ] Task appears in dashboard with project name
5. [ ] Email sent includes project name

#### Create Project and Bug
1. [ ] Admin creates project
2. [ ] User creates bug assigned to project
3. [ ] Bug includes feature and type
4. [ ] Bug appears in dashboard with project info
5. [ ] Email sent includes all bug details

#### Delete and Restore Project
1. [ ] Admin creates project with tasks/bugs
2. [ ] Admin deletes project
3. [ ] Project disappears from normal lists
4. [ ] Tasks/bugs still exist but project_id is NULL
5. [ ] Admin restores project
6. [ ] Project appears in lists again
7. [ ] Tasks/bugs still have NULL project_id (not restored)

#### Filter Work Items
1. [ ] User has tasks and bugs in multiple projects
2. [ ] Filter by project shows only items from that project
3. [ ] Filter by type shows only tasks or bugs
4. [ ] Filter by status shows only items with that status
5. [ ] Clear filters shows all items

---

## 9. Performance Tests

- [ ] Projects list loads quickly (< 1s)
- [ ] Hierarchy API responds quickly (< 500ms)
- [ ] Work items API handles large datasets (100+ items)
- [ ] Filters apply without lag
- [ ] Database queries use indexes efficiently

---

## 10. Browser Compatibility Tests

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## 11. Responsive Design Tests

- [ ] Projects list responsive on mobile
- [ ] Project create form responsive on mobile
- [ ] Task create form responsive on mobile
- [ ] Bug create form responsive on mobile
- [ ] Dashboard responsive on mobile
- [ ] Filters responsive on mobile
- [ ] Dropdowns work on touch devices

---

## Test Results Summary

**Total Tests**: ~150
**Passed**: TBD
**Failed**: TBD
**Skipped**: TBD

---

## Known Issues

(To be filled during testing)

---

## Next Steps

1. Run all tests systematically
2. Document any failures
3. Fix issues found
4. Re-test failed cases
5. Update documentation
6. Deploy to production

---

**Testing Started**: [Date]
**Testing Completed**: [Date]
**Tested By**: [Name]

