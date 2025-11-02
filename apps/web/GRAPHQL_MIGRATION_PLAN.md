# GraphQL Migration Plan - JSR Task Management System

## Executive Summary

This document outlines the systematic migration from REST API to GraphQL for the JSR Task Management System. The migration will be done incrementally to ensure zero downtime and no loss of functionality.

**Current State:**
- 47 files making REST API calls via `fetch('/api/...)`
- 30+ REST API endpoints in `apps/web/src/app/api/`
- Multiple N+1 query patterns causing performance issues

**Target State:**
- GraphQL-first architecture with REST endpoints as fallback
- Single GraphQL endpoint (`/api/graphql`) for all data fetching
- 70-90% reduction in API calls
- Improved developer experience with type-safe queries

---

## Phase 1: Analysis Complete ✅

### REST API Endpoints Inventory

#### Core Data Endpoints
1. **Tasks** (`/api/tasks`)
   - GET: Fetch all tasks
   - POST: Create task
   - Used by: 10+ components

2. **Bugs** (`/api/bugs`)
   - GET: Fetch bugs with filters
   - POST: Create bug
   - Used by: 8+ components

3. **Users** (`/api/users`)
   - GET: Fetch all users
   - POST: Create user
   - Used by: 15+ components

4. **Projects** (`/api/projects`)
   - GET: Fetch projects
   - POST: Create project
   - Used by: 5+ components

5. **Settings** (`/api/settings`)
   - GET: Fetch settings
   - POST/PATCH: Update settings
   - Used by: 3+ components

#### Specialized Endpoints
6. **Dashboard Data** (`/api/dashboard-data`) - Already optimized
7. **User Batch** (`/api/users/batch`) - Already optimized
8. **Work Items** (`/api/work-items/user/[employeeId]`)
9. **Activity Log** (`/api/activity-log`)
10. **Subtasks** (`/api/subtasks`)
11. **Bug Subtasks** (`/api/bug-subtasks`)
12. **Leaves** (`/api/leaves`)
13. **WFH** (`/api/wfh`)
14. **Permissions** (`/api/permissions`)
15. **Work Hours** (`/api/work-hours`)
16. **Deleted Items** (`/api/deleted-items`)

### Components Making REST Calls (47 files)

#### High Priority (Dashboard & Core Features)
1. `apps/web/src/app/dashboard/page.tsx` - Dashboard (HIGHEST IMPACT)
2. `apps/web/src/app/tasks/page.tsx` - Task list
3. `apps/web/src/app/tasks/[taskId]/page.tsx` - Task detail
4. `apps/web/src/app/tasks/create/page.tsx` - Task creation
5. `apps/web/src/app/bugs/page.tsx` - Bug list
6. `apps/web/src/app/bugs/[bugId]/page.tsx` - Bug detail
7. `apps/web/src/app/bugs/create/page.tsx` - Bug creation
8. `apps/web/src/components/dashboard/TaskListNew.tsx` - Dashboard task list
9. `apps/web/src/components/dashboard/UnifiedWorkItems.tsx` - Work items widget

#### Medium Priority (Management Features)
10. `apps/web/src/app/master-tasks/page.tsx` - All tasks view
11. `apps/web/src/app/master-bugs/page.tsx` - All bugs view
12. `apps/web/src/app/approvals/page.tsx` - Approvals dashboard
13. `apps/web/src/app/analytics/page.tsx` - Analytics
14. `apps/web/src/app/profile/page.tsx` - User profile
15. `apps/web/src/components/subtasks/SubTaskList.tsx` - Subtask management
16. `apps/web/src/components/subtasks/SubTaskForm.tsx` - Subtask creation
17. `apps/web/src/components/bugs/BugSubTaskForm.tsx` - Bug subtask creation

#### Lower Priority (Admin & Settings)
18. `apps/web/src/app/settings/page.tsx` - Settings management
19. `apps/web/src/app/settings/permissions/page.tsx` - Permissions
20. `apps/web/src/app/projects/page.tsx` - Projects list
21. `apps/web/src/app/projects/create/page.tsx` - Project creation
22. `apps/web/src/app/deleted-items/page.tsx` - Deleted items
23. `apps/web/src/components/admin/SettingsEditor.tsx` - Settings editor
24. `apps/web/src/components/admin/UserImport.tsx` - User import

#### Specialized Features
25. `apps/web/src/app/leave/apply/page.tsx` - Leave application
26. `apps/web/src/app/wfh/apply/page.tsx` - WFH application
27. `apps/web/src/components/FloatingTimer.tsx` - Timer widget
28. `apps/web/src/components/ProjectSelector.tsx` - Project selector
29. `apps/web/src/components/UnifiedTimeline.tsx` - Activity timeline
30. `apps/web/src/components/WorkHoursReport.tsx` - Work hours report

---

## Phase 2: Migration Strategy

### Approach: Incremental Feature-Based Migration

**Principles:**
1. ✅ Keep both REST and GraphQL active during migration
2. ✅ Migrate one feature area at a time
3. ✅ Test thoroughly before moving to next feature
4. ✅ Commit after each successful feature migration
5. ✅ Maintain rollback capability at all times

### Migration Order (Priority-Based)

#### **Wave 1: Dashboard (Week 1)**
- **Impact**: Highest - Most frequently accessed page
- **Complexity**: Medium - Already has unified endpoint
- **Components**: 
  - `apps/web/src/app/dashboard/page.tsx`
  - `apps/web/src/components/dashboard/TaskListNew.tsx`
  - `apps/web/src/components/dashboard/UnifiedWorkItems.tsx`
- **GraphQL Queries**: `GET_DASHBOARD` (already defined)
- **Expected Improvement**: 95% reduction in API calls (100+ → 1)

#### **Wave 2: Tasks (Week 1-2)**
- **Impact**: High - Core feature
- **Complexity**: Medium
- **Components**:
  - `apps/web/src/app/tasks/page.tsx` - List view
  - `apps/web/src/app/tasks/[taskId]/page.tsx` - Detail view
  - `apps/web/src/app/tasks/create/page.tsx` - Creation
  - `apps/web/src/components/subtasks/SubTaskList.tsx`
  - `apps/web/src/components/subtasks/SubTaskForm.tsx`
- **GraphQL Queries**: `GET_TASKS`, `GET_TASK`
- **GraphQL Mutations**: `CREATE_TASK`, `UPDATE_TASK`, `DELETE_TASK`
- **Expected Improvement**: 80% reduction in API calls

#### **Wave 3: Bugs (Week 2)**
- **Impact**: High - Core feature
- **Complexity**: Medium
- **Components**:
  - `apps/web/src/app/bugs/page.tsx` - List view
  - `apps/web/src/app/bugs/[bugId]/page.tsx` - Detail view
  - `apps/web/src/app/bugs/create/page.tsx` - Creation
  - `apps/web/src/components/bugs/BugEditModal.tsx`
  - `apps/web/src/components/bugs/BugSubTaskForm.tsx`
- **GraphQL Queries**: `GET_BUGS`, `GET_BUG`
- **GraphQL Mutations**: `CREATE_BUG`, `UPDATE_BUG`, `DELETE_BUG`
- **Expected Improvement**: 80% reduction in API calls

#### **Wave 4: User Management (Week 3)**
- **Impact**: Medium - Used across all features
- **Complexity**: Low - Simple data structure
- **Components**:
  - `apps/web/src/app/profile/page.tsx`
  - `apps/web/src/components/ProjectSelector.tsx`
  - All components using user dropdowns
- **GraphQL Queries**: `GET_USERS`, `GET_USER`
- **GraphQL Mutations**: `CREATE_USER`, `UPDATE_USER`
- **Expected Improvement**: 90% reduction in user-related calls

#### **Wave 5: Management Views (Week 3-4)**
- **Impact**: Medium - Used by managers
- **Complexity**: Low
- **Components**:
  - `apps/web/src/app/master-tasks/page.tsx`
  - `apps/web/src/app/master-bugs/page.tsx`
  - `apps/web/src/app/approvals/page.tsx`
  - `apps/web/src/app/analytics/page.tsx`
- **GraphQL Queries**: Reuse existing queries with filters
- **Expected Improvement**: 85% reduction in API calls

#### **Wave 6: Remaining Features (Week 4-5)**
- **Impact**: Low-Medium
- **Complexity**: Varies
- **Components**:
  - Leave/WFH applications
  - Projects management
  - Settings & Permissions
  - Deleted items
  - Work hours reports
- **Note**: Some features may remain on REST if GraphQL doesn't provide significant benefit

---

## Phase 3: Testing Strategy

### Per-Component Testing Checklist

For each migrated component:

1. **Functional Testing**
   - [ ] Data loads correctly
   - [ ] All filters work as expected
   - [ ] Create/Update/Delete operations succeed
   - [ ] Error messages display properly
   - [ ] Loading states work correctly

2. **Performance Testing**
   - [ ] Measure API call count (before vs after)
   - [ ] Measure total load time
   - [ ] Verify DataLoader batching is working
   - [ ] Check cache hit rates

3. **Edge Cases**
   - [ ] Empty state (no data)
   - [ ] Large datasets (100+ items)
   - [ ] Network errors
   - [ ] Concurrent operations
   - [ ] Permission-based filtering

4. **Regression Testing**
   - [ ] All existing features still work
   - [ ] No console errors
   - [ ] No TypeScript errors
   - [ ] Production build succeeds

### Automated Testing

```bash
# Run before migration
npm run build
npm run test (if tests exist)

# Run after each component migration
npm run build
npm run test
```

### Manual Testing Checklist

- [ ] Login and navigate to migrated page
- [ ] Verify data displays correctly
- [ ] Test all CRUD operations
- [ ] Test filters and search
- [ ] Test pagination (if applicable)
- [ ] Test with different user roles
- [ ] Check browser console for errors
- [ ] Verify network tab shows GraphQL calls

---

## Phase 4: Rollback Procedures

### Immediate Rollback (If Critical Issues Found)

1. **Revert Git Commit**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Redeploy Previous Version**
   - Vercel automatically deploys on push
   - Previous deployment remains accessible

3. **Verify Rollback**
   - Test affected pages
   - Confirm REST endpoints working
   - Check error logs

### Partial Rollback (Single Component)

1. **Identify Problematic Component**
2. **Revert Component Changes**
   ```bash
   git checkout HEAD~1 -- apps/web/src/app/[component]/page.tsx
   git commit -m "Rollback: Revert [component] to REST"
   git push origin main
   ```

3. **Keep Other Migrations Active**

### Emergency Procedures

If GraphQL endpoint fails completely:

1. **Disable GraphQL Route**
   - Comment out `/api/graphql/route.ts`
   - Redeploy

2. **All Components Fall Back to REST**
   - Components should handle GraphQL errors gracefully
   - Implement fallback to REST in error handlers

---

## Phase 5: Implementation Guidelines

### Code Pattern for Migration

**Before (REST):**
```typescript
const [tasks, setTasks] = useState<Task[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      setTasks(data.data)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }
  fetchTasks()
}, [])
```

**After (GraphQL):**
```typescript
import { apolloClient, QUERIES } from '@/lib/graphql-client'
import { gql } from '@apollo/client'

const [tasks, setTasks] = useState<Task[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchTasks = async () => {
    try {
      const { data } = await apolloClient.query({
        query: gql(QUERIES.GET_TASKS),
        variables: { assignedTo: employeeId }
      })
      setTasks(data.tasks)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      // Fallback to REST if GraphQL fails
      const response = await fetch('/api/tasks')
      const restData = await response.json()
      setTasks(restData.data)
    } finally {
      setLoading(false)
    }
  }
  fetchTasks()
}, [employeeId])
```

### Error Handling Pattern

```typescript
try {
  // Try GraphQL first
  const { data } = await apolloClient.query({ ... })
  return data
} catch (graphqlError) {
  console.warn('GraphQL failed, falling back to REST:', graphqlError)
  // Fallback to REST
  const response = await fetch('/api/...')
  return await response.json()
}
```

---

## Phase 6: Success Metrics

### Performance Metrics

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Dashboard API Calls | 100+ | 1-5 | Network tab |
| Dashboard Load Time | 2-3s | <500ms | Performance API |
| Task List API Calls | 20+ | 1-2 | Network tab |
| Bug List API Calls | 15+ | 1-2 | Network tab |
| Cache Hit Rate | 30% | 70%+ | `/api/cache/stats` |
| Error Rate | <1% | <0.5% | `/api/metrics` |

### Migration Progress Tracking

- [ ] Wave 1: Dashboard (3 components)
- [ ] Wave 2: Tasks (5 components)
- [ ] Wave 3: Bugs (5 components)
- [ ] Wave 4: Users (3 components)
- [ ] Wave 5: Management (4 components)
- [ ] Wave 6: Remaining (10 components)

**Total: 30 components to migrate**

---

## Phase 7: Post-Migration

### Monitoring

1. **Performance Dashboard** (`/performance`)
   - Monitor API call patterns
   - Track GraphQL vs REST usage
   - Identify slow queries

2. **Error Tracking**
   - Monitor GraphQL errors
   - Track fallback to REST frequency
   - Alert on error rate spikes

3. **User Feedback**
   - Collect performance feedback
   - Monitor support tickets
   - Track user satisfaction

### Optimization Opportunities

After migration complete:

1. **Deprecate Unused REST Endpoints**
   - Identify endpoints with zero traffic
   - Mark as deprecated
   - Remove after 30 days

2. **Add GraphQL Subscriptions**
   - Real-time task updates
   - Live notifications
   - Collaborative editing

3. **Implement Persisted Queries**
   - Reduce payload size
   - Improve security
   - Better caching

---

## Timeline Summary

| Week | Focus | Components | Status |
|------|-------|------------|--------|
| 1 | Dashboard + Tasks | 8 | Pending |
| 2 | Bugs | 5 | Pending |
| 3 | Users + Management | 7 | Pending |
| 4-5 | Remaining Features | 10 | Pending |

**Total Duration: 4-5 weeks**

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| GraphQL endpoint failure | Low | High | Fallback to REST in all components |
| Performance regression | Low | Medium | Thorough testing before deployment |
| Data inconsistency | Low | High | Keep REST and GraphQL in sync |
| User disruption | Low | Medium | Incremental rollout, quick rollback |
| Developer confusion | Medium | Low | Clear documentation, code examples |

---

## Conclusion

This migration plan provides a systematic, low-risk approach to transitioning from REST to GraphQL. By following the incremental wave-based strategy, we can achieve significant performance improvements while maintaining system stability and user experience.

**Next Steps:**
1. Review and approve this plan
2. Begin Wave 1: Dashboard migration
3. Monitor metrics and gather feedback
4. Proceed with subsequent waves based on results

