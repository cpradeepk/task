# Attendance Calendar & Approvals Integration - Walkthrough

## Summary
Successfully completed the integration of Attendance Calendar and Attendance Approvals tabs into the `/approvals` page. The implementation includes full UI for viewing, approving, and rejecting attendance edit requests, as well as a comprehensive calendar view for tracking team attendance.

## Changes Made

### 1. **Attendance Approvals Tab** (`/apps/web/src/app/approvals/page.tsx`)

#### Added UI Components:
- **Pending Requests List**: Displays all pending attendance edit requests with:
  - Employee name and ID
  - Request type badge (Sign In Edit, Sign Out Edit, Missing Entry)
  - Attendance date
  - Original time (if applicable)
  - New requested time
  - Submission timestamp
  - Reason for the request
  
- **Action Buttons**: Each request has three buttons:
  - **Approve**: Approves the attendance edit request
  - **Reject**: Rejects the attendance edit request
  - **View**: Opens a detailed modal with full request information

- **Detail Modal**: Full-screen modal showing:
  - Employee details (name, department, role)
  - Request type with color-coded badge
  - Attendance date
  - Original and new times
  - Reason for request
  - Submission timestamp
  - Approve/Reject actions

#### Added Functions:
- `fetchPendingAttendanceRequests()`: Fetches pending attendance requests from GraphQL API
- `handleApproveAttendanceRequest(requestId)`: Approves a request and updates local state
- `handleRejectAttendanceRequest(requestId)`: Rejects a request and updates local state
- `useEffect` hook to automatically fetch requests when manager status is confirmed

### 2. **Attendance Calendar Tab** (`/apps/web/src/app/approvals/page.tsx`)

#### Integration:
- Renders the `AttendanceCalendarView` component when the calendar tab is active
- Passes `teamMembers` prop to filter calendar data for manager's team
- Seamless integration with existing tab structure

### 3. **Backend Support** (Already Implemented)

The following GraphQL resolvers were already in place:

#### Queries:
- `pendingAttendanceRequests`: Fetches all pending attendance edit requests
- `attendanceCalendar`: Fetches attendance data for calendar view with:
  - Date range filtering
  - Department filtering
  - Team member filtering
  - Employee search
  - Pagination support

#### Mutations:
- `approveAttendanceRequest`: Approves a request and updates attendance logs
- `rejectAttendanceRequest`: Rejects a request

## Features

### Attendance Approvals Tab
✅ View all pending attendance edit requests  
✅ Color-coded request type badges  
✅ Approve/Reject functionality with confirmation  
✅ Detailed view modal for each request  
✅ Real-time state updates after approval/rejection  
✅ Loading states and empty states  
✅ Responsive design for mobile and desktop  

### Attendance Calendar Tab
✅ Monthly calendar grid view  
✅ Employee rows with attendance status for each day  
✅ Color-coded status indicators:
  - 🟢 Present (P)
  - 🔵 Online (O)
  - 🔴 Absent (A)
  - 🟡 On Leave (L)
  - 🟣 Work From Home (W)
  - 🟠 Half Day (H)
  - ⚪ Weekend (-)
✅ Click-to-view details modal  
✅ Department and employee search filters  
✅ Pagination for large teams  
✅ CSV export functionality  
✅ Month navigation (Previous/Next/Today)  

## User Flow

### Approving an Attendance Request

1. Manager navigates to `/approvals` page
2. Clicks on "Attendance Approvals" tab
3. Views list of pending requests with all details
4. Can either:
   - Click "Approve" → Confirms → Request approved → Removed from list
   - Click "Reject" → Confirms → Request rejected → Removed from list
   - Click "View" → Opens detail modal → Can approve/reject from modal

### Viewing Attendance Calendar

1. Manager navigates to `/approvals` page
2. Clicks on "Attendance Calendar" tab
3. Views monthly calendar with all team members
4. Can:
   - Navigate between months
   - Filter by department
   - Search for specific employees
   - Click on any cell to view detailed attendance information
   - Export calendar data to CSV

## Technical Details

### State Management
- `pendingAttendanceRequests`: Array of pending requests
- `isLoadingAttendance`: Loading state for attendance requests
- `selectedAttendanceRequest`: Currently selected request for detail modal
- `activeTab`: Controls which tab is displayed

### GraphQL Queries Used
```graphql
query PendingAttendanceRequests {
  pendingAttendanceRequests {
    id
    userId
    attendanceDate
    requestType
    originalTime
    newTime
    reason
    status
    createdAt
    user {
      employeeId
      name
      department
      role
    }
  }
}

query AttendanceCalendar(
  $startDate: String!
  $endDate: String!
  $department: String
  $teamMembers: [String!]
  $search: String
  $page: Int
  $limit: Int
) {
  attendanceCalendar(...) {
    employees { ... }
    records { ... }
    pagination { ... }
  }
}
```

### GraphQL Mutations Used
```graphql
mutation ApproveAttendanceRequest($requestId: ID!) {
  approveAttendanceRequest(requestId: $requestId) {
    id
    status
  }
}

mutation RejectAttendanceRequest($requestId: ID!) {
  rejectAttendanceRequest(requestId: $requestId) {
    id
    status
  }
}
```

## Testing Recommendations

1. **Attendance Approvals Tab**:
   - [ ] Verify pending requests load correctly
   - [ ] Test approve functionality
   - [ ] Test reject functionality
   - [ ] Test detail modal opens and closes
   - [ ] Verify requests are removed from list after approval/rejection
   - [ ] Test with no pending requests (empty state)
   - [ ] Test loading state

2. **Attendance Calendar Tab**:
   - [ ] Verify calendar loads with correct month
   - [ ] Test month navigation
   - [ ] Test department filter
   - [ ] Test employee search
   - [ ] Test pagination
   - [ ] Test CSV export
   - [ ] Test cell click to view details
   - [ ] Verify status colors are correct

3. **Integration**:
   - [ ] Test tab switching between all tabs
   - [ ] Verify teamMembers prop is passed correctly
   - [ ] Test with different user roles (manager, top management, admin)
   - [ ] Verify permission checks work correctly

## Next Steps

- Test the implementation in a development environment
- Verify GraphQL queries return expected data
- Test approve/reject actions with real data
- Ensure proper error handling for edge cases
- Consider adding toast notifications instead of alerts for better UX
