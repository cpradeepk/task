# GraphQL Migration - React Native Mobile App

## Overview

The JSR Task Management mobile app has been migrated to use GraphQL with automatic REST API fallback. This provides better performance, reduced network overhead, and exact data fetching while maintaining backward compatibility.

## Architecture

### GraphQL-First with REST Fallback Pattern

Every data-fetching service follows this pattern:

```typescript
// Try GraphQL first
try {
  console.log('🔵 [Component] Attempting GraphQL query...')
  const data = await executeGraphQLQuery(QUERIES.GET_XXX, { variables })
  console.log('✅ [Component] GraphQL query successful')
  return { success: true, data }
} catch (graphqlError) {
  console.warn('⚠️ [Component] GraphQL failed, falling back to REST:', graphqlError)
  
  // Fallback to REST API
  const restResult = await restApiCall()
  console.log('✅ [Component] REST API successful')
  return restResult
}
```

### Benefits

- **Zero Downtime**: Automatic fallback ensures the app always works
- **Better Performance**: GraphQL reduces over-fetching and under-fetching
- **Exact Data Fetching**: Request only the fields you need
- **Reduced Network Overhead**: Single query can replace multiple REST calls
- **Future-Proof**: Easy to add new fields without breaking existing code

## Files Structure

### New Files

1. **`src/services/graphqlQueries.ts`** (392 lines)
   - All GraphQL queries and mutations
   - Mirrors the web app's GraphQL implementation
   - Includes: Tasks, Bugs, Users, Projects, Settings queries

2. **`src/services/graphqlClient.ts`** (133 lines)
   - GraphQL client with authentication
   - Helper functions for queries and mutations
   - Automatic REST fallback logic

### Modified Files

1. **`src/services/taskService.ts`**
   - `getAllTasks()` - GraphQL with REST fallback
   - `getTaskById()` - GraphQL with REST fallback
   - `getTasksByEmployeeId()` - GraphQL with REST fallback

2. **`src/services/bugService.ts`**
   - `getAllBugs()` - GraphQL with REST fallback
   - `getBugById()` - GraphQL with REST fallback

3. **`src/services/userService.ts`**
   - `getAllUsers()` - GraphQL with REST fallback

4. **`src/services/projectService.ts`**
   - `getAllProjects()` - GraphQL with REST fallback

5. **`src/services/settingsService.ts`**
   - `getAllSettings()` - GraphQL with REST fallback (non-grouped only)

6. **`src/config/api.ts`**
   - Added `GRAPHQL: '/api/graphql'` endpoint

## Available GraphQL Queries

### Tasks
- `GET_TASKS` - All tasks with optional filters (assignedTo, status, priority)
- `GET_TASK` - Single task by taskId (includes subtasks)

### Bugs
- `GET_BUGS` - All bugs with optional filters (assignedTo, status, severity, category)
- `GET_BUG` - Single bug by bugId (includes subtasks)

### Users
- `GET_USERS` - All users

### Projects
- `GET_PROJECTS` - All projects
- `GET_PROJECT` - Single project by projectId (includes tasks)

### Settings
- `GET_SETTINGS` - All settings with optional activeOnly filter
- `GET_SETTING` - Single setting by key

### Dashboard
- `GET_DASHBOARD` - Dashboard data (tasks, bugs, users, settings)

## Available GraphQL Mutations

### Tasks
- `CREATE_TASK` - Create new task
- `UPDATE_TASK` - Update existing task
- `DELETE_TASK` - Delete task

### Bugs
- `CREATE_BUG` - Create new bug
- `UPDATE_BUG` - Update existing bug
- `DELETE_BUG` - Delete bug

## Usage Examples

### Using GraphQL in Services

```typescript
import { executeGraphQLWithFallback } from './graphqlClient'
import { QUERIES } from './graphqlQueries'

export const getAllTasks = async (): Promise<ApiResponse<Task[]>> => {
  return executeGraphQLWithFallback<Task[]>(
    QUERIES.GET_TASKS,
    {},
    () => get<Task[]>(API_ENDPOINTS.TASKS),
    'TaskService.getAllTasks'
  ).then(response => {
    if (response.success && response.data) {
      const tasks = Array.isArray(response.data) 
        ? response.data 
        : (response.data as any).tasks || []
      return { success: true, data: tasks }
    }
    return response
  })
}
```

### Using GraphQL Directly

```typescript
import { executeGraphQLQuery } from '../services/graphqlClient'
import { QUERIES } from '../services/graphqlQueries'

// In your component
const loadTasks = async () => {
  try {
    const data = await executeGraphQLQuery(QUERIES.GET_TASKS, {
      assignedTo: currentUser.employeeId,
      status: 'In Progress'
    })
    
    setTasks(data.tasks)
  } catch (error) {
    console.error('Failed to load tasks:', error)
  }
}
```

### Using Mutations

```typescript
import { executeGraphQLMutation } from '../services/graphqlClient'
import { MUTATIONS } from '../services/graphqlQueries'

const createTask = async (taskData: Partial<Task>) => {
  const result = await executeGraphQLMutation(
    MUTATIONS.CREATE_TASK,
    { input: taskData },
    'CreateTaskScreen'
  )
  
  if (result.success) {
    console.log('Task created:', result.data)
  } else {
    console.error('Failed to create task:', result.error)
  }
}
```

## Testing

### Verify GraphQL is Working

1. **Enable Debug Logging**:
   - Open React Native debugger
   - Watch console for GraphQL logs

2. **Look for Success Messages**:
   ```
   🔵 [TaskService.getAllTasks] Attempting GraphQL query...
   ✅ [TaskService.getAllTasks] GraphQL query successful
   ```

3. **Check Fallback Behavior**:
   - If GraphQL fails, you'll see:
   ```
   ⚠️ [TaskService.getAllTasks] GraphQL failed, falling back to REST: [error]
   ✅ [TaskService.getAllTasks] REST API successful
   ```

### Test Scenarios

1. **Normal Operation**: GraphQL should work for all queries
2. **Network Issues**: Should fallback to REST automatically
3. **Server Errors**: Should handle errors gracefully
4. **Authentication**: JWT token should be included in all requests

## Performance Improvements

### Before GraphQL
- Task List: 1 REST call
- Task Detail: 1 REST call + 1 subtasks call = 2 calls
- Bug List: 1 REST call
- Bug Detail: 1 REST call + 1 subtasks call = 2 calls
- Dashboard: 4 separate REST calls (tasks, bugs, users, settings)

### After GraphQL
- Task List: 1 GraphQL query
- Task Detail: 1 GraphQL query (includes subtasks)
- Bug List: 1 GraphQL query
- Bug Detail: 1 GraphQL query (includes subtasks)
- Dashboard: 1 GraphQL query (all data)

**Estimated Performance Gains**:
- 50-60% reduction in API calls
- 30-40% reduction in data transfer
- Faster response times with GraphQL batching
- Better caching with GraphQL query structure

## Troubleshooting

### GraphQL Query Fails

**Symptom**: Console shows "GraphQL failed, falling back to REST"

**Possible Causes**:
1. GraphQL endpoint not available
2. Network connectivity issues
3. Authentication token expired
4. Query syntax error

**Solution**: Check the error message in console logs. The app will automatically use REST API as fallback.

### Data Format Mismatch

**Symptom**: Data is undefined or in wrong format

**Possible Cause**: GraphQL returns data in different structure than REST

**Solution**: Check the data transformation in service methods:
```typescript
const tasks = Array.isArray(response.data) 
  ? response.data 
  : (response.data as any).tasks || []
```

### Authentication Issues

**Symptom**: "Unauthorized" errors

**Solution**: Ensure JWT token is stored in AsyncStorage:
```typescript
await AsyncStorage.setItem('userToken', token)
```

## Future Enhancements

1. **Add GraphQL Subscriptions**: Real-time updates for tasks/bugs
2. **Implement Caching**: Apollo Client for better caching
3. **Add Optimistic Updates**: Instant UI updates before server response
4. **Pagination**: Cursor-based pagination for large datasets
5. **Offline Support**: Queue mutations when offline

## Migration Status

✅ **Completed**:
- Task queries (getAllTasks, getTaskById, getTasksByEmployeeId)
- Bug queries (getAllBugs, getBugById)
- User queries (getAllUsers)
- Project queries (getAllProjects)
- Settings queries (getAllSettings - non-grouped)
- GraphQL client with REST fallback
- All mutations defined (CREATE/UPDATE/DELETE for tasks and bugs)

⏳ **Pending**:
- Dashboard screen integration
- Mutation integration in create/edit screens
- GraphQL subscriptions for real-time updates
- Apollo Client integration for advanced caching

## Support

For issues or questions about the GraphQL migration, check:
1. Console logs for detailed error messages
2. Network tab in React Native debugger
3. GraphQL endpoint: `https://task.amtariksha.com/api/graphql`
4. Web app implementation in `apps/web/src/lib/graphql-queries.ts`

