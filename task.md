# Task Checklist

## UI Fixes (From Previous Session)

### Issue #1: Add User Modal - Field Visibility
- [ ] Locate UserModal component
- [ ] Add top padding/margin to prevent navbar overlap
- [ ] Test field visibility
- [ ] Verify scrolling behavior

### Issue #2: Create Post - Slide-over Drawer
- [ ] Create CreatePostModal component
- [ ] Add form fields (title, content, topics, attachments, mentions)
- [ ] Update Feed page to use modal
- [ ] Handle ?create=true URL param
- [ ] Update Navbar link
- [ ] Add "Create Post" button to Feed page

### Issue #3: Attendance Date Format
- [ ] Locate admin attendance dashboard component
- [ ] Update backend resolver to format dates (YYYY-MM-DD HH:MM:SS)
- [ ] Update frontend to parse and display dates correctly
- [ ] Remove milliseconds from database queries
- [ ] Test date display

---

## Critical Fixes (COMPLETED - Previous Session)

### Issue #1: Feed Tab Restoration
- [x] Add 'feed' to AVAILABLE_TABS in permissions.ts
- [x] Add 'feed' to all role permissions
- [x] Create migration script for existing users
- [x] Add Feed to Navbar with sub-menu

### Issue #2: Login Redirect
- [x] Update LoginForm to redirect based on is_system_admin
- [x] System admins → /dashboard
- [x] Regular users → /home

### Issue #3: Attendance Logic Fixes
- [x] Create database migration for location tracking
- [x] Update GraphQL schema (attendance nullable, add location fields)
- [x] Fix attendance resolver (remove placeholder, return null)
- [x] Add undoSignOut mutation
- [x] Create location helper utility
- [x] Update signIn/signOut mutations with location
- [x] Update DailyAttendanceCard UI states
- [x] Add Undo Sign Out button

### Issue #4: Navbar Alignment
- [x] Fix secondary menu center alignment
- [x] Add overflow detection logic
- [x] Conditionally apply justify-center/justify-start

---

## Bug Fixes (Current Session)

### 1. Home Page Error - employeeId null
- [x] Investigate dashboard query in GraphQL resolvers
- [x] Fix null employeeId issue in User resolver
- [ ] Test dashboard loading

### 2. Personal Notes Visibility
- [x] Review current personal notes implementation
- [x] Update feed query to filter personal notes by user
- [ ] Ensure personal notes only visible to creator
- [ ] Test feed visibility

### 3. Create Post Button in Top Nav
- [x] Locate top navigation component
- [x] Wire up create post dialog to nav button
- [ ] Test create post functionality

### 4. Task Modal Cancel Button
- [x] Locate task modal component
- [x] Verify cancel button functionality
- [ ] Test modal cancel behavior

### 5. Task Assignment Default
- [x] Locate task creation form
- [x] Auto-populate assigned_to with current user
- [x] Ensure field remains editable
- [ ] Test task creation

### 6. Profile Edit Restrictions
- [x] Find profile edit component
- [x] Disable name, email, phone, department, manager_email fields
- [ ] Keep telegram_token and password editable
- [ ] Test profile edit form

### 7. Home/Attendance Dashboard Navigation
- [x] Create tabbed interface for home page
- [x] Implement /home route with default dashboard tab
- [x] Implement /home/attendance route for attendance tab
- [ ] Update navigation structure
- [ ] Test navigation and URL routing

### 8. Timer Permissions
- [x] Find timer component(s)
- [x] Add permission check (assignedTo or support members)
- [x] Disable timer for unauthorized users
- [x] Add tooltip with error message
- [ ] Test timer permissions for various user roles

### 9. Critical Crashes & Date Normalization
- [x] Fix duplicate declarations in task creation page
- [x] Fix null return in bugs/settings resolvers
- [x] Normalize date storage to ISO 8601 in mutations
- [x] Verify fixes
- [x] Fix Task Creation Page Crash (currentUser undefined)
- [x] Fix Task Creation Cancel Button (navigate back)
- [x] Fix Missing Saved Posts Topic (auto-create on save)
- [x] Fix `ensurePersonalTopics` logic flaw (name collision)
- [x] Fix `ensurePersonalTopics` duplicate key error (race condition)
- [x] Fix database constraint for personal topics (migration 035)
- [x] Implement "Saved Posts" in mobile app (parity)
- [x] Build mobile app locally

---

# Mobile App Feature Parity

## Planning
- [x] Analyze web app features vs mobile app features
- [x] Create implementation plan for Attendance Dashboard

## Implementation: Attendance Dashboard
- [x] Add `ADMIN_DASHBOARD_QUERY` to `graphql-queries.ts`
- [x] Create `AttendanceDashboardScreen.tsx`
- [x] Register `AttendanceDashboardScreen` in `App.tsx`
- [x] Add "Attendance Dashboard" to `CustomDrawerContent.tsx`

## Verification
- [x] Build and test mobile app locally

---

## Overall Verification
- [ ] Test all fixes in development environment
- [ ] Create comprehensive walkthrough documentation
