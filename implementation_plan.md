# UI Fixes Implementation Plan

## Overview
Fix three UI/UX issues: Add User modal field visibility, Create Post modal implementation, and attendance date formatting.

## Issue #1: Add User Modal - Fields Overlapping with Navbar

### Problem
Employee ID and Full Name fields are cut off at the top, overlapping with the sticky navbar (z-index issue).

### Solution
**File**: `src/components/admin/UserModal.tsx`

1. Add top padding to the form container to account for navbar height
2. Ensure the drawer content starts below the navbar
3. Adjust the drawer's positioning or add margin-top

**Changes**:
- Add `pt-20` or `mt-16` to the form container
- Ensure drawer has proper `top` offset to account for navbar
- Test scrolling behavior

---

## Issue #2: Create Post Modal - Convert to Slide-over Drawer

### Problem
Current "Create Post" opens a vertically-centered modal that's often off-screen, requiring scrolling.

### Solution
Create a new `CreatePostModal` component similar to `UserModal` with slide-over drawer from the right.

### Files to Modify/Create

#### [NEW] `src/components/feed/CreatePostModal.tsx`
- Slide-over drawer from right (same as UserModal)
- Form fields:
  - Title (text input)
  - Content (textarea with rich text support)
  - Topics (multi-select dropdown)
  - Attachments (file upload)
  - Mentions (user search/select)
- Submit and Cancel buttons
- Same styling as UserModal

#### [MODIFY] `src/app/feed/page.tsx`
- Add state for modal open/close
- Add "Create Post" button on the page
- Handle URL param `?create=true` to auto-open modal
- Remove old modal implementation

#### [MODIFY] `src/components/layout/Navbar.tsx`
- Update "Create Post" link to use `?create=true` param instead of direct navigation

---

## Issue #3: Attendance Dashboard - Invalid Date Format

### Problem
Sign In/Sign Out times showing "Invalid" because timestamps are in milliseconds but database stores as `YYYY-MM-DD HH:MM:SS.mmm+TZ` format.

### Root Cause
Database stores: `2025-11-21 09:35:23.441+00` (ISO 8601 with timezone)
Frontend expects: Milliseconds timestamp or needs proper parsing

### Solution

#### Backend Changes

**File**: `src/graphql/resolvers.ts` - `adminDashboardData` resolver

1. Convert timestamps to ISO 8601 format (YYYY-MM-DD HH:MM:SS) without milliseconds
2. Use `to_char()` in SQL query or format in resolver:
   ```sql
   to_char(sign_in_time, 'YYYY-MM-DD HH24:MI:SS') as sign_in_time
   ```

#### Frontend Changes

**File**: Admin attendance dashboard component (need to locate)

1. Parse ISO string dates properly
2. Format for display using `date-fns` format function
3. Display format: `MMM DD, YYYY HH:mm` (e.g., "Nov 21, 2025 09:35")

---

## Verification Plan

### Issue #1 Testing
1. Open Users page
2. Click "Add User"
3. Verify Employee ID and Full Name fields are fully visible
4. Verify no overlap with navbar
5. Test scrolling behavior

### Issue #2 Testing
1. Click "Create Post" from navbar → verify drawer opens from right
2. Click "Create Post" button on Feed page → verify drawer opens
3. Navigate to `/feed?create=true` → verify drawer auto-opens
4. Fill form and submit → verify post creation
5. Cancel → verify drawer closes

### Issue #3 Testing
1. Navigate to Admin Attendance Dashboard
2. Verify dates show as "Nov 21, 2025 09:35" format
3. Verify no "Invalid" text appears
4. Test with different date ranges
# Bug Fixes Implementation Plan

## Overview

This plan addresses 8 bugs in the task management system, ranging from GraphQL resolver issues to UI/UX improvements and permission controls.

## User Review Required

> [!IMPORTANT]
> **Personal Notes Implementation**: Currently, personal notes are identified by a unique topic per user (`is_personal = true` and `owner_user_id`). The feed query needs to filter posts to show only:
> - Public posts from everyone
> - Personal notes only from the current user
> 
> This approach maintains the existing database schema without requiring migration.

> [!WARNING]
> **Profile Edit Restrictions**: The following fields will become read-only (grayed out) in edit mode:
> - Name
> - Email
> - Phone
> - Department  
> - Manager Email
> 
> Only `telegram_token` and `password` will remain editable. This is a significant UX change that may require user training.

---

## Proposed Changes

### Bug 1: Home Page Error - `employeeId` is null

#### Problem
The `homeDashboardData` GraphQL query is failing with "Cannot return null for non-nullable field User.employeeId" even though all users have employee IDs.

#### Root Cause Analysis
Looking at the resolver in [`resolvers.ts:390-455`](file:///mnt/work/projects/amtarikshadev/task/apps/web/src/graphql/resolvers.ts#L390-L455), the query joins `leave_applications` and `wfh_applications` with `users` table. The issue likely occurs when:
1. The JOIN returns rows where user data is missing
2. The `employee_id` field mapping is inconsistent

#### Solution
**[MODIFY]** [`src/graphql/resolvers.ts`](file:///mnt/work/projects/amtarikshadev/task/apps/web/src/graphql/resolvers.ts)

Update the `homeDashboardData` resolver (lines 390-455) to:
1. Add explicit NULL checks for user data
2. Filter out any records where `employee_id` is NULL
3. Add defensive mapping to ensure `employeeId` is always returned

```typescript
membersOnLeave: leaveResult.rows
  .filter((row: any) => row.employee_id) // Filter out null employee_ids
  .map((row: any) => ({
    user: {
      employeeId: row.employee_id || '', // Defensive fallback
      name: row.name || 'Unknown',
      email: row.email || ''
    },
    // ... rest of mapping
  })),
```

---

### Bug 2: Personal Notes Visibility

#### Problem
Personal notes are visible to all users instead of only the creator.

#### Current Implementation
- Personal notes are stored in `feed_topics` table with `is_personal = true` and `owner_user_id` set to the creator
- Each user has a unique personal notes topic (e.g., "John's Personal Notes")
- Posts are linked to topics via `feed_post_topics` table

#### Solution
**[MODIFY]** [`src/graphql/resolvers.ts`](file:///mnt/work/projects/amtarikshadev/task/apps/web/src/graphql/resolvers.ts)

Update the `feedPosts` resolver to filter out personal notes from other users:

```sql
-- Add to the WHERE clause
AND (
  -- Include all non-personal topic posts
  ft.is_personal = false
  OR
  -- Include personal notes only if user is the owner
  (ft.is_personal = true AND ft.owner_user_id = $currentUserId)
)
```

This ensures:
- Public posts from all users are visible
- Personal notes are only visible to their creator

---

### Bug 3: Create Post Button in Top Nav

#### Problem
The "Create Post" button in the Feed submenu doesn't open the create post dialog.

#### Current Implementation
Looking at [`Navbar.tsx:82-84`](file:///mnt/work/projects/amtarikshadev/task/apps/web/src/components/layout/Navbar.tsx#L82-L84):
```typescript
{ label: 'Create Post', href: '/feed?create=true', icon: FileText, key: 'feed' },
```

The button navigates to `/feed?create=true` but the feed page needs to detect this query parameter and open the dialog.

#### Solution
**[MODIFY]** [`src/app/feed/page.tsx`](file:///mnt/work/projects/amtarikshadev/task/apps/web/src/app/feed/page.tsx)

1. Add query parameter detection using `useSearchParams()`
2. Auto-open create post dialog when `create=true` is present
3. Remove the query parameter after opening the dialog

```typescript
const searchParams = useSearchParams()
const shouldOpenCreate = searchParams.get('create') === 'true'

useEffect(() => {
  if (shouldOpenCreate) {
    setIsCreateDialogOpen(true)
    // Clean up URL
    router.replace('/feed', { scroll: false })
  }
}, [shouldOpenCreate])
```

---

### Bug 4: Task Modal Cancel Button

#### Problem
The cancel button in task modals does nothing when clicked.

#### Investigation Needed
Need to find the task modal component and identify the cancel button handler.

#### Solution
**[MODIFY]** Task modal component (to be identified)

Ensure the cancel button:
1. Closes the modal
2. Resets form state to initial values
3. Clears any validation errors

```typescript
const handleCancel = () => {
  setFormData(initialFormData) // Reset to initial state
  setErrors({}) // Clear errors
  onClose() // Close modal
}
```

---

### Bug 5: Task Assignment Default to Current User

#### Problem
When creating a new task, the assignee field should default to the current user.

#### Solution
**[MODIFY]** Task creation form component

Set initial form state with current user pre-selected:

```typescript
const [formData, setFormData] = useState({
  assignedTo: [currentUser.employeeId], // Pre-populate with current user
  // ... other fields
})
```

The field should remain editable so users can change the assignee if needed.

---

### Bug 6: Profile Edit Restrictions

#### Problem
All fields are editable in profile edit mode, but only `telegram_token` and `password` should be editable.

#### Solution
**[MODIFY]** [`src/app/profile/page.tsx`](file:///mnt/work/projects/amtarikshadev/task/apps/web/src/app/profile/page.tsx)

Update the profile form (lines 443-587) to disable specific fields:

1. **Name** (line 466-475): Change `disabled={!isEditing}` to `disabled={true}`
2. **Email** (line 484-493): Change `disabled={!isEditing}` to `disabled={true}`
3. **Phone** (line 505-512): Change `disabled={!isEditing}` to `disabled={true}`
4. **Department** (line 522-536): Change `disabled={!isEditing || isLoadingSettings}` to `disabled={true}`
5. **Manager Email** (line 544-553): Change `disabled={!isEditing}` to `disabled={true}`

Keep editable:
- **Telegram Token** (line 560-568): Keep `disabled={!isEditing}`
- **Password** (line 572-586): Already only shown when editing

Add visual styling to match Employee ID field (line 455):
```typescript
className="input-field pl-10 bg-gray-100 cursor-not-allowed"
```

---

### Bug 7: Home/Attendance Dashboard Navigation

#### Problem
Need to create a tabbed interface under "Home" with:
- Default tab: Home Dashboard (current `/home` page)
- Second tab: Attendance Dashboard (current `/admin/attendance` page)

#### Solution

**[NEW]** [`src/app/home/layout.tsx`](file:///mnt/work/projects/amtarikshadev/task/apps/web/src/app/home/layout.tsx)

Create a layout with tab navigation:

```typescript
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const tabs = [
    { name: 'Dashboard', href: '/home', icon: Home },
    { name: 'Attendance', href: '/home/attendance', icon: Calendar }
  ]
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        {children}
      </div>
    </div>
  )
}
```

**[MODIFY]** [`src/app/home/page.tsx`](file:///mnt/work/projects/amtarikshadev/task/apps/web/src/app/home/page.tsx)

Remove `<Navbar />` component (line 102) since it's now in the layout.

**[NEW]** [`src/app/home/attendance/page.tsx`](file:///mnt/work/projects/amtarikshadev/task/apps/web/src/app/home/attendance/page.tsx)

Move or copy the attendance dashboard content from `/admin/attendance` to this new route.

**[MODIFY]** [`src/components/layout/Navbar.tsx`](file:///mnt/work/projects/amtarikshadev/task/apps/web/src/components/layout/Navbar.tsx)

Update the navigation structure (lines 69-129) to reflect the new home structure:
- Keep "Home" as a top-level item pointing to `/home`
- Remove "Attendance Dashboard" from Admin submenu (line 111) since it's now under Home

---

### Bug 8: Timer Permissions

#### Problem
Timers can be started by anyone, but should only be startable by:
- Main task assignees (in `assigned_to` array)
- Support members (in `support` array)

#### Solution

**[MODIFY]** [`src/components/TimerButton.tsx`](file:///mnt/work/projects/amtarikshadev/task/apps/web/src/components/TimerButton.tsx)

Add permission check props and logic:

```typescript
interface TimerButtonProps {
  entityType: 'task' | 'bug'
  entityId: string
  entityTitle: string
  status?: string
  assignedTo?: string[] // Add this
  support?: string[] // Add this
  currentUserId: string // Add this
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function TimerButton({
  entityType,
  entityId,
  entityTitle,
  status,
  assignedTo = [],
  support = [],
  currentUserId,
  size = 'md',
  showLabel = false
}: TimerButtonProps) {
  // Check if user has permission
  const hasPermission = 
    assignedTo.includes(currentUserId) || 
    support.includes(currentUserId)
  
  // Disable if no permission
  const isDisabled = !hasPermission || (status && disabledStatuses.includes(status))
  
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!hasPermission && !isActive) {
      alert("It's not your task. Only assigned members and support team can start the timer.")
      return
    }
    
    // ... rest of logic
  }
  
  // Update button styling to show disabled state
  const buttonClass = `
    ${sizeClasses[size]}
    rounded-full
    transition-all
    duration-200
    flex
    items-center
    justify-center
    ${isActive
      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/50'
      : isDisabled
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
        : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
    }
  `
  
  // Add tooltip
  const getTooltip = () => {
    if (!hasPermission && !isActive) {
      return "It's not your task. Only assigned members can start the timer."
    }
    if (isDisabled && !isActive) {
      return `Cannot start timer - status is "${status}"`
    }
    return isActive ? 'Stop timer' : 'Start timer'
  }
  
  return (
    <button
      onClick={handleClick}
      disabled={isLoading || isDisabled}
      className={buttonClass}
      title={getTooltip()}
    >
      {/* ... icon rendering */}
    </button>
  )
}
```

**[MODIFY]** All components using `TimerButton`

Update all usages to pass the new required props:
- `assignedTo={task.assignedTo}`
- `support={task.support}`
- `currentUserId={currentUser.employeeId}`

---

## Verification Plan

### Automated Tests

Currently, there are no existing automated tests for these features. Manual verification is required.

### Manual Verification

#### Bug 1: Home Page employeeId Error
1. Navigate to `/home` page
2. Verify the page loads without GraphQL errors
3. Check browser console for any "Cannot return null for non-nullable field User.employeeId" errors
4. Verify members on leave and WFH are displayed correctly

#### Bug 2: Personal Notes Visibility
1. User A: Create a personal note in the feed
2. User B: Log in and navigate to feed
3. Verify User B **cannot** see User A's personal note
4. User A: Verify they **can** see their own personal note
5. Create a public post and verify both users can see it

#### Bug 3: Create Post Button
1. Click "Feed" in the top navigation
2. Click "Create Post" in the submenu
3. Verify the create post dialog opens automatically
4. Verify the URL is `/feed` (without `?create=true` query parameter)

#### Bug 4: Task Modal Cancel Button
1. Open any task modal (create or edit)
2. Make some changes to the form
3. Click the "Cancel" button
4. Verify the modal closes
5. Reopen the modal and verify form is reset to initial state

#### Bug 5: Task Assignment Default
1. Click "Create New Task"
2. Verify the "Assigned To" field is pre-populated with your name/employee ID
3. Verify you can change the assignee to someone else
4. Create the task and verify it's assigned correctly

#### Bug 6: Profile Edit Restrictions
1. Navigate to `/profile`
2. Click "Edit Profile"
3. Verify the following fields are **disabled** (grayed out):
   - Name
   - Email
   - Phone
   - Department
   - Manager Email
4. Verify the following fields are **editable**:
   - Telegram Token
   - Password
5. Try to save changes and verify only editable fields are updated

#### Bug 7: Home/Attendance Dashboard Tabs
1. Navigate to `/home`
2. Verify you see two tabs: "Dashboard" and "Attendance"
3. Verify "Dashboard" tab is active by default
4. Click "Attendance" tab
5. Verify URL changes to `/home/attendance`
6. Verify attendance dashboard content is displayed
7. Click "Dashboard" tab and verify you return to home dashboard

#### Bug 8: Timer Permissions
1. **As assigned user**: Open a task assigned to you
   - Verify timer button is **enabled** (green)
   - Click to start timer - should work
2. **As support member**: Open a task where you're in support team
   - Verify timer button is **enabled** (green)
   - Click to start timer - should work
3. **As non-assigned user**: Open a task not assigned to you
   - Verify timer button is **disabled** (gray)
   - Hover over button - tooltip should say "It's not your task"
   - Click button - should show alert message
4. Repeat for bugs/development items

---

## Additional Notes

- All changes maintain backward compatibility with existing data
- No database migrations required
- Changes are primarily UI/UX improvements and permission controls
### Mobile App: Attendance Dashboard
**Goal:** Implement the Admin Attendance Dashboard in the mobile app to match web functionality.

#### [MODIFY] `apps/mobile/src/config/graphql-queries.ts`
- Add `ADMIN_DASHBOARD_QUERY` to fetch attendance stats and live data.

#### [NEW] `apps/mobile/src/screens/AttendanceDashboardScreen.tsx`
- Create a new screen component.
- Use `useQuery` with `ADMIN_DASHBOARD_QUERY`.
- Implement `RefreshControl` for pull-to-refresh.
- **UI Components:**
    - **Stats Grid:** Display cards for Online, Present, Absent, On Leave, WFH.
    - **Pending Requests:** Display cards for Pending Leave/WFH requests.
    - **Live Attendance List:** A scrollable list (or `FlatList`) showing active users with their status, time, and location. Use `Card` or `List.Item` from `react-native-paper`.

#### [MODIFY] `apps/mobile/src/App.tsx`
- Import `AttendanceDashboardScreen`.
- Add `Stack.Screen` for `AttendanceDashboard`.

#### [MODIFY] `apps/mobile/src/components/CustomDrawerContent.tsx`
- Add `AttendanceDashboard` to the `adminItems` list.
- Ensure it navigates to the correct screen name.

## Verification Plan
### Automated Tests
- None (Manual verification required).

### Manual Verification
1.  **Build:** Run `npm run build:local` and install on device.
2.  **Login:** Login as an Admin user.
3.  **Navigation:** Open drawer, expand "Admin", click "Attendance Dashboard".
4.  **Verify UI:**
    - Check if stats cards match the web dashboard.
    - Check if live attendance list loads.
    - Pull to refresh and verify data updates.
