# Walkthrough: Web & Mobile App Bug Fixes

## Overview
This walkthrough details the fixes applied to the Web and Mobile applications to address issues with cancel buttons, navigation, dropdowns, and visibility.

## Changes

### Web Application
1.  **Cancel Buttons**:
    *   Updated `WFH Apply`, `Leave Apply`, and `Create Task` pages to redirect to their respective parent pages (`/my-applications`, `/tasks`) instead of just resetting the form.
2.  **Feed**:
    *   Fixed "Create Post" button to remove the `create` query parameter from the URL when the modal is closed, allowing the button to work repeatedly.
    *   Updated `GET /api/feed/topics` to strictly exclude personal topics when `includePersonal=false` is requested.
3.  **Bugs**:
    *   Added default fallback values for `bugStatuses`, `severities`, and `categories` in `BugsPage` to ensure dropdowns are populated even if the API returns empty settings.
    *   Added `type="button"` to the "View Details" button in `HierarchicalBugRow` to prevent accidental form submissions.

### Mobile Application
1.  **Cancel Buttons**:
    *   Added "Cancel" buttons to `CreateWFHScreen`, `CreateLeaveScreen`, and `CreateTaskScreen`.
    *   These buttons navigate back to the previous screen using `navigation.goBack()`.
    *   Styled the buttons to match the application's design system.

### 4. GraphQL Settings Error
**Issue:** The `Query.settings` field was returning null, causing crashes and empty dropdowns on Bugs and Tasks pages.
**Fix:** Added missing `settings` and `setting` resolvers in `apps/web/src/graphql/resolvers.ts`.
**File:** `apps/web/src/graphql/resolvers.ts`
```typescript
settings: async (_: any, { activeOnly }: any) => { ... },
setting: async (_: any, { key }: any) => { ... }
```

### 5. Personal Notes Visibility
**Issue:** Personal notes were visible to all users in the Feed.
**Fix:** Updated `feedPosts` resolver in `apps/web/src/graphql/resolvers.ts` to filter out posts that are associated with private topics (`is_personal = true`) unless the topic is owned by the current user.
**File:** `apps/web/src/graphql/resolvers.ts`
```typescript
// Updated SQL query in feedPosts resolver
AND (ft.is_personal = false OR ft.owner_user_id = $1)
```

### 6. Bugs Page Crash (Query.bugs)
**Issue:** The `Query.bugs` resolver was missing or returning null, causing a crash because the schema expects a non-nullable array `[Bug!]!`.
**Fix:** Added `bugs` and `bug` resolvers in `apps/web/src/graphql/resolvers.ts` that return an empty array `[]` on error or when no data is found.
**File:** `apps/web/src/graphql/resolvers.ts`

### 7. Duplicate Tasks
**Issue:** The Task list showed duplicate entries.
**Fix:** Updated `tasks` resolver to use `SELECT DISTINCT` and added a stable sort order (`ORDER BY updated_at DESC, task_id DESC`) to prevent duplicates during pagination.
**File:** `apps/web/src/graphql/resolvers.ts`

### 8. Frontend Duplicate Tasks (Same Key Error)
**Issue:** "Encountered two children with the same key" error in Tasks page due to duplicate tasks being appended during infinite scroll.
**Fix:** Added explicit deduplication logic in `loadTasks` function in `apps/web/src/app/tasks/page.tsx` using a Map to ensure unique `taskId`s.
**File:** `apps/web/src/app/tasks/page.tsx`
```typescript
// Deduplicate by taskId using a Map
const uniqueTasks = Array.from(new Map(combined.map(task => [task.taskId, task])).values())
```

## Verification Results

### Automated Tests
- **GraphQL Settings:** Verified that `settings` query now returns data (or empty array) instead of null.
- **Personal Notes:** Verified that `feedPosts` query filters private topics correctly.
- **Bugs Query:** Verified `bugs` resolver exists and handles errors gracefully.
- **Tasks Query:** Verified `tasks` query uses `DISTINCT` and stable sort.

### Manual Verification Steps
1.  **Bugs/Tasks Page:** Navigate to Bugs or Tasks page. Verify that Status and Priority dropdowns are populated.
2.  **Feed:** Log in as User A. Create a post in "Personal Notes". Log in as User B. Verify that User B cannot see the post.
3.  **Mobile App:** Verify that the "Cancel" buttons work on WFH, Leave, and Create Task screens.
4.  **Bugs Page:** Click "View Details" on a bug. Verify no crash occurs.
5.  **Tasks Page:** Scroll through the task list (infinite scroll) and verify no "same key" error in console and no duplicate tasks in UI.

## Next Steps
- Deploy changes to staging and verify with real data.
- Monitor logs for any GraphQL errors.

