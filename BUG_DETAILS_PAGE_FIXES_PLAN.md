# Bug Details Page Comprehensive Fixes Plan

## Overview
This document outlines the fixes needed for the bug details page based on user requirements.

---

## Current State Analysis

### Bug Interface (`apps/web/src/lib/types.ts`)
- Has `severity` field (displayed as "Criticality" in UI)
- Has `priority` field (removed from bug creation form but still in interface)
- Has `category`, `platform`, `environment` fields
- Has `projectId` and `subprojectId` fields (optional)
- Has timer fields: `timerTotalTime` (milliseconds), `actualHours` (hours)

### Bug Creation Page (`apps/web/src/app/bugs/create/page.tsx`)
- Uses "Criticality" label for `severity` field ✅
- Removed "Priority" field from form ✅
- Made Project and Subproject mandatory ✅
- Loads dropdown values from settings table ✅
- Uses dynamic icons from settings metadata ✅

### Bug Details Page (`apps/web/src/app/bugs/[bugId]/page.tsx`)
- Shows "Priority" field (needs to be removed or renamed to Criticality) ❌
- Shows Category, Platform, Environment as read-only ❌
- Does NOT show Project/Subproject ❌
- Has "Log Hours" button that directly updates `actualHours` ❌
- Shows time in hours format (e.g., "2h") instead of hh:mm:ss ❌
- Has related bugs functionality (needs testing) ❓

---

## Required Fixes

### Fix 1: Update Bug Information Section ✅
**Location**: Lines 585-622 in `apps/web/src/app/bugs/[bugId]/page.tsx`

**Changes Needed**:
1. Remove "Priority" field (or rename to "Criticality" if we keep severity)
2. Make Category, Platform, Environment editable inline (similar to Status and Assignee)
3. Add Project field (read-only, shows project name)
4. Add Subproject field (read-only, shows subproject name)
5. Load dropdown options from settings table
6. Use dynamic icons from settings metadata

**Implementation**:
- Add state for editing each field
- Add settings loading for dropdown options
- Create inline edit UI for each field
- Add project/subproject name fetching

---

### Fix 2: Convert Time Display to hh:mm:ss Format ✅
**Location**: Lines 684-760 in `apps/web/src/app/bugs/[bugId]/page.tsx`

**Current Format**:
- Estimated: "2h"
- Actual: "3.5h"

**New Format**:
- Estimated: "02:00:00"
- Actual: "03:30:00"

**Implementation**:
- Create `formatHoursToTime(hours: number): string` helper function
- Update all time displays in Time Tracking section
- Update Log Hours modal to show hh:mm:ss format

**Helper Function**:
```typescript
function formatHoursToTime(hours: number): string {
  const totalSeconds = Math.floor(hours * 3600)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
```

---

### Fix 3: Connect Log Hours to Timer System ✅
**Location**: Lines 251-283 (handleAddHours function) and 420-425 (Log Hours button)

**Current Behavior**:
- Opens modal with hours input
- Directly updates `actualHours` field in database
- No connection to timer system

**New Behavior**:
- Opens modal showing current timer data
- Allows manual time entry OR uses timer data
- Updates both `actualHours` AND `timerTotalTime`
- Syncs with timer system

**Implementation**:
1. Check if bug has active timer
2. If timer exists, show timer data in modal
3. Allow user to:
   - Use timer time (convert `timerTotalTime` ms to hours)
   - OR manually enter hours
4. Update both fields:
   - `actualHours` = existing + new hours
   - `timerTotalTime` = existing + (new hours * 3600000) ms
5. Reset timer state to 'stopped'
6. Log to activity log

---

### Fix 4: Update Bug Edit Modal ✅
**Location**: `apps/web/src/components/bugs/BugEditModal.tsx`

**Changes Needed**:
1. Match structure of bug creation page
2. Load dropdown values from settings table
3. Remove old hardcoded fields
4. Use dynamic icons
5. Include Project/Subproject fields
6. Remove Priority field (or rename to Criticality)

---

### Fix 5: Fix Related Bugs Functionality ✅
**Location**: Bug creation page and bug details page

**Issue**: Related bugs multi-select may not work when no bugs exist in project

**Testing Needed**:
1. Test with no bugs in project
2. Test with multiple bugs in project
3. Verify multi-select works correctly
4. Check if related bugs display in bug details

---

### Fix 6: Add Subtask Functionality to Bugs ✅
**Similar to Tasks**

**Requirements**:
1. Add subtasks table for bugs (similar to tasks)
2. Create bug subtask API endpoints
3. Add subtask UI to bug details page
4. Add subtask display to dashboard
5. Allow drag-and-drop reordering
6. Individual assignment and status tracking

**Database Migration Needed**:
```sql
CREATE TABLE IF NOT EXISTS bug_subtasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_bug_id VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  assigned_to VARCHAR(50) NOT NULL,
  status ENUM('Not Started', 'In Progress', 'Completed') DEFAULT 'Not Started',
  is_completed BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(50) NOT NULL,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(50) NULL,
  FOREIGN KEY (parent_bug_id) REFERENCES bugs(bug_id) ON DELETE CASCADE,
  INDEX idx_parent_bug (parent_bug_id),
  INDEX idx_display_order (display_order)
);
```

---

## Implementation Order

1. ✅ **Fix 2: Time Format** (Easiest, no dependencies)
2. ✅ **Fix 1: Bug Information Section** (Medium complexity)
3. ✅ **Fix 3: Log Hours Integration** (Depends on timer understanding)
4. ✅ **Fix 4: Bug Edit Modal** (Depends on Fix 1)
5. ✅ **Fix 5: Related Bugs** (Testing and minor fixes)
6. ✅ **Fix 6: Bug Subtasks** (Most complex, new feature)

---

## Testing Checklist

### Bug Information Section
- [ ] Can edit Category inline
- [ ] Can edit Platform inline
- [ ] Can edit Environment inline
- [ ] Criticality field shows correctly (or Priority removed)
- [ ] Project name displays correctly
- [ ] Subproject name displays correctly
- [ ] Dropdown options load from settings table
- [ ] Icons display correctly

### Time Tracking
- [ ] Estimated hours shows as hh:mm:ss
- [ ] Actual hours shows as hh:mm:ss
- [ ] Progress bar calculates correctly
- [ ] Log Hours modal shows hh:mm:ss format

### Log Hours Integration
- [ ] Modal shows current timer data if active
- [ ] Can use timer time
- [ ] Can manually enter hours
- [ ] Both actualHours and timerTotalTime update
- [ ] Activity log entry created

### Bug Edit Modal
- [ ] Matches bug creation page structure
- [ ] Loads settings from database
- [ ] Shows dynamic icons
- [ ] Project/Subproject fields present
- [ ] Priority field removed/renamed

### Related Bugs
- [ ] Works with no bugs in project
- [ ] Works with multiple bugs
- [ ] Multi-select functions correctly
- [ ] Related bugs display in details

### Bug Subtasks
- [ ] Can create subtasks
- [ ] Can edit subtasks
- [ ] Can delete subtasks
- [ ] Can reorder subtasks
- [ ] Subtasks show in dashboard
- [ ] Individual assignment works
- [ ] Status tracking works

---

## Files to Modify

1. `apps/web/src/app/bugs/[bugId]/page.tsx` - Main bug details page
2. `apps/web/src/components/bugs/BugEditModal.tsx` - Bug edit modal
3. `apps/web/src/lib/types.ts` - Bug interface (if needed)
4. `apps/web/database/migrations/018_create_bug_subtasks.sql` - New migration
5. `apps/web/src/app/api/bug-subtasks/route.ts` - New API endpoint
6. `apps/web/src/app/api/bug-subtasks/[id]/route.ts` - New API endpoint
7. `apps/web/src/app/api/bug-subtasks/reorder/route.ts` - New API endpoint

---

## Notes

- The `severity` field is displayed as "Criticality" in UI but stored as `severity` in database
- The `priority` field was removed from bug creation but still exists in Bug interface
- Timer stores time in milliseconds (`timerTotalTime`)
- Actual hours stores time in decimal hours (`actualHours`)
- Need to keep both fields in sync when logging hours
- Settings table uses one-row-per-key structure with JSON values
- Icons are stored in settings metadata field

---

## Success Criteria

✅ All inline editing works smoothly
✅ Time displays in hh:mm:ss format everywhere
✅ Log hours integrates with timer system
✅ Bug edit modal matches creation page
✅ Related bugs functionality works
✅ Bug subtasks fully functional
✅ All tests pass
✅ No TypeScript errors
✅ Build succeeds
✅ Deployed to production

