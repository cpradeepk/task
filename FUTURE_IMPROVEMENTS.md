# Future Improvements - JSR Task Management System

**Last Updated:** 2025-11-13

---

## Changelog

- **2025-11-13**: Added detailed Task 5 (Offline Functionality) implementation plan with subtasks, acceptance criteria, and timelines. Added Mobile App - Feed Features section.
- **2025-11-12**: Initial document created with offline handling improvements for mobile app

---

## Table of Contents

1. [Mobile App - Offline Handling](#mobile-app---offline-handling)
2. [Mobile App - Feed Features](#mobile-app---feed-features)
3. [Task Management](#task-management)
4. [Bug Tracking](#bug-tracking)
5. [Social Feed](#social-feed)
6. [Leave & WFH Management](#leave--wfh-management)
7. [Performance & Optimization](#performance--optimization)
8. [Security & Authentication](#security--authentication)
9. [Developer Experience](#developer-experience)

---

## Mobile App - Offline Handling

**Last Updated:** 2025-11-13
**Category:** Mobile App
**Priority:** 🔴 High
**Status:** Planned (Deferred from Task 5)
**Estimated Effort:** 14.5 hours (6 subtasks)
**Reference:** See `apps/mobile/OFFLINE_HANDLING_AUDIT.md` for detailed implementation roadmap

**Note:** This was originally Task 5 in the push notification implementation plan. It has been deferred to future development to prioritize push notifications (Task 4) first.

### Overview

The mobile app currently has partial offline support (40% complete). Core infrastructure exists (network detection, cache persistence, offline UI indicator), but critical features are missing that prevent a complete offline-first experience.

### Current State

**What Works:**
- ✅ Network detection via `useNetworkStatus` hook (100% complete)
- ✅ Apollo Client cache persistence with AsyncStorage (90% complete)
- ✅ Offline UI indicator component exists (disabled, needs enabling)
- ✅ Storage utilities for secure and regular data (100% complete)

**What's Missing:**
- ❌ Mutation queuing (0% complete)
- ❌ Offline sync mechanism (0% complete)
- ❌ Optimistic UI updates (0% complete)
- ⚠️ Enhanced error handling (40% complete)

### Planned Features

#### 1. Mutation Queue System
**Priority:** 🔴 High  
**Effort:** 4-6 hours  
**Status:** Planned

**Description:**
Implement offline mutation queuing to prevent data loss when users create/update/delete tasks, bugs, or other entities while offline.

**Implementation:**
- Install `apollo3-offline` or implement custom queue
- Create `apps/mobile/src/utils/offlineQueue.ts` utility
- Store pending mutations in AsyncStorage
- Persist queue across app restarts
- Add queue status to app state

**Acceptance Criteria:**
- [ ] Users can create tasks while offline
- [ ] Mutations are queued in AsyncStorage
- [ ] Queue persists across app restarts
- [ ] Queue status visible in UI
- [ ] No data loss when offline

---

#### 2. Offline Sync Mechanism
**Priority:** 🔴 High  
**Effort:** 3-4 hours  
**Status:** Planned

**Description:**
Automatically sync queued mutations when network connectivity is restored.

**Implementation:**
- Create `apps/mobile/src/hooks/useOfflineSync.ts` hook
- Listen for network state changes using `useNetworkStatus`
- Process pending mutations when network returns
- Handle sync errors and conflicts
- Add sync status UI indicator (Material Design progress indicator)

**Acceptance Criteria:**
- [ ] Queue automatically processes when online
- [ ] Sync progress shown in UI
- [ ] Sync errors handled gracefully
- [ ] Conflict resolution strategy implemented
- [ ] User notified of sync status

---

#### 3. Optimistic UI Updates
**Priority:** 🟡 Medium  
**Effort:** 3-4 hours  
**Status:** Planned

**Description:**
Provide instant UI feedback for mutations before server confirmation, improving perceived performance.

**Implementation:**
- Add `optimisticResponse` to all mutations
- Implement cache update logic
- Add rollback mechanism for failed mutations
- Test optimistic updates for create/update/delete operations

**Acceptance Criteria:**
- [ ] UI updates immediately on mutation
- [ ] Tasks/bugs appear in lists instantly
- [ ] Failed mutations rollback correctly
- [ ] User sees loading state during server confirmation

---

#### 4. Enhanced Error Handling
**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Status:** Planned

**Description:**
Improve error handling to differentiate between offline errors and server errors, with appropriate user feedback and retry logic.

**Implementation:**
- Enhance Apollo Client error link
- Add user-facing error messages (Material Design Snackbar)
- Implement retry logic with exponential backoff
- Differentiate offline vs server errors
- Add error recovery strategies

**Acceptance Criteria:**
- [ ] User-friendly error messages displayed
- [ ] Transient errors retry automatically
- [ ] Offline errors queue mutations
- [ ] Server errors show appropriate messages
- [ ] Error recovery options provided

---

#### 5. Offline-Aware UI Components
**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Status:** Planned

**Description:**
Update UI components to provide clear feedback about offline status and queued operations.

**Implementation:**
- Enable and redesign `OfflineBanner` with Material Design 3
- Add "Offline" badge to action buttons
- Display queued items count
- Add "Retry" button for failed syncs
- Implement Material Design Snackbar for sync notifications
- Show sync progress indicator

**Acceptance Criteria:**
- [ ] Offline banner visible when offline
- [ ] Action buttons show offline state
- [ ] Queued operations count displayed
- [ ] Sync notifications appear
- [ ] Progress indicator shows during sync

---

### Implementation Phases

**Phase 1: Enable Existing Features** (1-2 hours)
- Uncomment `<OfflineBanner />` in `App.tsx`
- Test offline banner functionality
- Update `USER_GUIDE.md` with accurate offline capabilities

**Phase 2: Implement Mutation Queue** (4-6 hours)
- Install dependencies
- Create offline queue utility
- Integrate with mutations
- Test queue persistence

**Phase 3: Implement Sync Mechanism** (3-4 hours)
- Create sync hook
- Process queue on network return
- Handle errors and conflicts
- Add sync status UI

**Phase 4: Material Design Integration** (2-3 hours)
- Redesign offline components
- Add Material Design animations
- Integrate with new UI

**Phase 5: Optimistic Updates** (3-4 hours)
- Add optimistic responses
- Implement cache updates
- Test rollback mechanism

---

### Testing Requirements

**Offline Scenarios:**
- [ ] View cached data while offline
- [ ] Create/update/delete while offline (queued)
- [ ] Sync when network returns
- [ ] Handle sync failures
- [ ] Resolve conflicts
- [ ] Test queue persistence across app restarts

**UI/UX:**
- [ ] Offline banner appears/disappears correctly
- [ ] Sync progress indicator works
- [ ] Error messages are user-friendly
- [ ] Queued items count accurate

---

### Risk Assessment

**If NOT Implemented:**
- 🔴 **HIGH RISK:** Users lose data when offline
- 🔴 **HIGH RISK:** Poor user experience (no feedback for offline actions)
- 🟡 **MEDIUM RISK:** Inconsistent behavior between web and mobile apps

**Recommendation:** Implement Phases 1-3 (mutation queue + sync) for production-ready offline experience.

---

## Mobile App - Feed Features

**Last Updated:** 2025-11-13
**Category:** Mobile App - Social Feed
**Priority:** 🟡 Medium
**Status:** Planned
**Estimated Effort:** 8-12 hours

### Overview

The mobile app currently has basic feed functionality (view posts, create posts, view comments). Several advanced features from the web app are missing that would enhance the social experience.

### Missing Features

#### 1. Post Reactions (Likes)
**Priority:** 🟡 Medium
**Effort:** 2-3 hours
**Status:** Planned

**Description:**
Add ability to like/unlike posts, similar to web app functionality.

**Implementation:**
- Add like button to FeedScreen post cards
- Add like button to FeedPostDetailsScreen
- Implement `TOGGLE_POST_REACTION` GraphQL mutation
- Show like count and user's like status
- Add optimistic UI updates

**Files to Modify:**
- `apps/mobile/src/screens/FeedScreen.tsx`
- `apps/mobile/src/screens/FeedPostDetailsScreen.tsx` (if exists, or create)
- `apps/mobile/src/config/graphql-queries.ts`

**Acceptance Criteria:**
- [ ] Users can like/unlike posts
- [ ] Like count updates in real-time
- [ ] Like button shows active state when user has liked
- [ ] Optimistic UI updates (instant feedback)

---

#### 2. Comment Reactions (Likes)
**Priority:** 🟢 Low
**Effort:** 1-2 hours
**Status:** Planned

**Description:**
Add ability to like/unlike comments on posts.

**Implementation:**
- Add like button to comment items
- Implement `TOGGLE_COMMENT_REACTION` GraphQL mutation
- Show like count on comments
- Add optimistic UI updates

**Files to Modify:**
- `apps/mobile/src/screens/FeedPostDetailsScreen.tsx`
- `apps/mobile/src/config/graphql-queries.ts`

**Acceptance Criteria:**
- [ ] Users can like/unlike comments
- [ ] Like count shown on comments
- [ ] Like button shows active state

---

#### 3. Post Editing
**Priority:** 🟡 Medium
**Effort:** 2-3 hours
**Status:** Planned

**Description:**
Allow users to edit their own posts after creation.

**Implementation:**
- Add edit button to user's own posts (3-dot menu)
- Create edit post screen or modal
- Implement `UPDATE_POST` GraphQL mutation
- Show "edited" indicator on edited posts
- Preserve attachments during edit

**Files to Create/Modify:**
- `apps/mobile/src/screens/EditPostScreen.tsx` (NEW)
- `apps/mobile/src/screens/FeedScreen.tsx`
- `apps/mobile/src/config/graphql-queries.ts`

**Acceptance Criteria:**
- [ ] Users can edit their own posts
- [ ] Edit preserves attachments
- [ ] Edited posts show "edited" indicator
- [ ] Edit screen pre-fills with existing content

---

#### 4. Post Deletion
**Priority:** 🟡 Medium
**Effort:** 1-2 hours
**Status:** Planned

**Description:**
Allow users to delete their own posts.

**Implementation:**
- Add delete button to user's own posts (3-dot menu)
- Add confirmation dialog (Material Design AlertDialog)
- Implement `DELETE_POST` GraphQL mutation
- Remove post from cache after deletion

**Files to Modify:**
- `apps/mobile/src/screens/FeedScreen.tsx`
- `apps/mobile/src/screens/FeedPostDetailsScreen.tsx`
- `apps/mobile/src/config/graphql-queries.ts`

**Acceptance Criteria:**
- [ ] Users can delete their own posts
- [ ] Confirmation dialog shown before deletion
- [ ] Post removed from UI after deletion
- [ ] Cache updated correctly

---

#### 5. Comment Editing & Deletion
**Priority:** 🟢 Low
**Effort:** 2-3 hours
**Status:** Planned

**Description:**
Allow users to edit/delete their own comments.

**Implementation:**
- Add edit/delete buttons to user's own comments
- Add confirmation dialog for deletion
- Implement `UPDATE_COMMENT` and `DELETE_COMMENT` GraphQL mutations
- Show "edited" indicator on edited comments

**Files to Modify:**
- `apps/mobile/src/screens/FeedPostDetailsScreen.tsx`
- `apps/mobile/src/config/graphql-queries.ts`

**Acceptance Criteria:**
- [ ] Users can edit their own comments
- [ ] Users can delete their own comments
- [ ] Confirmation dialog shown before deletion
- [ ] Edited comments show "edited" indicator

---

#### 6. Post Attachments (Images)
**Priority:** 🟡 Medium
**Effort:** 3-4 hours
**Status:** Planned

**Description:**
Add ability to attach images to posts (currently only available in web app).

**Implementation:**
- Add image picker to CreatePostScreen
- Upload images to AWS S3 (reuse existing S3 upload logic from bug attachments)
- Display image thumbnails in post cards
- Add image viewer for full-size images
- Support multiple images per post

**Files to Modify:**
- `apps/mobile/src/screens/CreatePostScreen.tsx`
- `apps/mobile/src/screens/FeedScreen.tsx`
- `apps/mobile/src/screens/FeedPostDetailsScreen.tsx`
- Reuse `apps/mobile/src/utils/s3Upload.ts` (if exists)

**Acceptance Criteria:**
- [ ] Users can attach images to posts
- [ ] Images uploaded to S3
- [ ] Image thumbnails shown in feed
- [ ] Tap image to view full-size
- [ ] Support multiple images per post

---

### Implementation Priority

**Recommended Order:**
1. **Post Reactions** (most impactful for engagement)
2. **Post Editing & Deletion** (basic content management)
3. **Post Attachments** (feature parity with web app)
4. **Comment Reactions** (nice-to-have)
5. **Comment Editing & Deletion** (nice-to-have)

**Total Estimated Effort:** 11-17 hours

---

## Task Management

**Last Updated:** 2025-11-12  
**Category:** Task Management  
**Priority:** TBD  
**Status:** Placeholder

*Features related to task management improvements will be added here as they are identified.*

---

## Bug Tracking

**Last Updated:** 2025-11-12  
**Category:** Bug Tracking  
**Priority:** TBD  
**Status:** Placeholder

*Features related to bug tracking improvements will be added here as they are identified.*

---

## Social Feed

**Last Updated:** 2025-11-12  
**Category:** Social Feed  
**Priority:** TBD  
**Status:** Placeholder

*Features related to social feed improvements will be added here as they are identified.*

---

## Leave & WFH Management

**Last Updated:** 2025-11-12  
**Category:** Leave & WFH  
**Priority:** TBD  
**Status:** Placeholder

*Features related to leave and WFH management improvements will be added here as they are identified.*

---

## Performance & Optimization

**Last Updated:** 2025-11-12  
**Category:** Performance  
**Priority:** TBD  
**Status:** Placeholder

*Performance optimization features will be added here as they are identified.*

---

## Security & Authentication

**Last Updated:** 2025-11-12  
**Category:** Security  
**Priority:** TBD  
**Status:** Placeholder

*Security and authentication improvements will be added here as they are identified.*

---

## Developer Experience

**Last Updated:** 2025-11-12  
**Category:** Developer Experience  
**Priority:** TBD  
**Status:** Placeholder

*Developer experience improvements will be added here as they are identified.*

---

## How to Use This Document

### Adding New Features

When adding a new feature to this document:

1. **Choose the appropriate category** or create a new one
2. **Update the changelog** at the top with date and brief description
3. **Update the "Last Updated" timestamp** for the category
4. **Include all required fields:**
   - Priority (🔴 High / 🟡 Medium / ⚪ Low)
   - Status (Planned / In Progress / Completed)
   - Estimated Effort (hours or days)
   - Description
   - Implementation details
   - Acceptance criteria
   - Testing requirements (if applicable)

### Moving Features to Implementation

When a feature moves from "Planned" to "In Progress":

1. Update the **Status** field
2. Update the **Last Updated** timestamp
3. Add a changelog entry
4. Create corresponding tasks in the task management system

### Completing Features

When a feature is completed:

1. Update **Status** to "Completed"
2. Add completion date to changelog
3. Update relevant documentation (SRS.md, ARCHITECTURE.md, etc.)
4. Consider moving completed features to a separate "Completed Improvements" section

---

features to be added:
1. Task Platform
task.aedhas.com
2. Project Teams
Ability to add team members.
Only team members should be able to:
View tasks and bugs
Edit tasks and bugs
Assign tasks
Comment on tasks, bugs, and features
*Project Roles
Project Manager
Developer
Tester
3. Voice Creation
Voice input for creating tasks, bugs, features, posts, and local comments.
4. Notifications
WhatsApp, Telegram, and in-app notifications.
5. Gamification
Provide points or credits to individuals based on their work.
6. Daily Task Display
A section that lists all pending tasks for the current day.
7. Task Assignment Limitation
Back-to-back task assigning is not possible.
8.MOM
9.edit sign/sign out timing for admin

**End of Document**

