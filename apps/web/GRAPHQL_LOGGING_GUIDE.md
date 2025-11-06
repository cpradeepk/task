# GraphQL Logging System Guide

## Overview

The JSR Task Management System now includes a comprehensive GraphQL logging system that provides detailed visibility into all GraphQL operations, making debugging and performance monitoring much easier.

## Features

### 🎨 Visual Formatting
- **Color-coded logs**: Green for success, red for errors, yellow for warnings, cyan for queries, purple for mutations
- **Collapsible groups**: Clean, organized console output using `console.group()`
- **Emoji indicators**: Quick visual identification of log types (🔍 queries, ✏️ mutations, ✅ success, ❌ errors)
- **Structured data**: Uses `console.table()` for variables and parameters

### ⏱️ Performance Monitoring
- **Timestamps**: Precise timing for all operations (HH:MM:SS.mmm format)
- **Duration tracking**: Measures execution time for queries, mutations, and resolvers
- **Database query timing**: Tracks individual SQL query performance

### 🔍 Detailed Information
- **Operation details**: Name, type (query/mutation), variables
- **Full query strings**: See the exact GraphQL query being executed
- **Response data**: Preview of returned data with array lengths and object keys
- **Error details**: Full error chain including GraphQL errors, network errors, and stack traces
- **Database queries**: SQL statements, parameters, and row counts

### 🎯 Conditional Logging
- **Development mode**: Full detailed logging with all features enabled
- **Production mode**: Minimal error logging only (error messages without sensitive data)

## How to Use

### 1. Browser Console (Client-Side)

Open your browser's developer tools (F12) and go to the Console tab. You'll see logs for all GraphQL operations:

#### Query Example
```
🔍 [GraphQL QUERY] dashboard 14:23:45.123
  📝 Operation: dashboard
  🔤 Type: query
  🔧 Variables:
  ┌─────────────┬──────────┐
  │ employeeId  │ AM-0006  │
  │ role        │ employee │
  └─────────────┴──────────┘
  📄 Query: query dashboard($employeeId: String!, $role: String!) { ... }

✅ [GraphQL QUERY] dashboard 245ms
  ⏱️ Duration: 245ms
  📦 Response Data:
    tasks: Array(12) [...]
    bugs: Array(5) [...]
    users: Array(25) [...]
    settings: Array(18) [...]
```

#### Mutation Example
```
✏️ [GraphQL MUTATION] createTask 14:24:10.456
  📝 Operation: createTask
  🔤 Type: mutation
  🔧 Variables:
  ┌──────────────┬─────────────────────┐
  │ description  │ Fix login bug       │
  │ assignedTo   │ AM-0006             │
  │ priority     │ U&I                 │
  └──────────────┴─────────────────────┘

✅ [GraphQL MUTATION] createTask 89ms
  ⏱️ Duration: 89ms
  📦 Response Data:
    createTask: Object { taskId: "TSK-1234", ... }
```

#### Error Example
```
❌ [GraphQL QUERY] tasks FAILED 156ms
  ⏱️ Duration: 156ms
  ❌ GraphQL Errors:
    Error 1:
      Message: syntax error at or near "WHERE"
      Path: tasks
      Extensions: { code: "INTERNAL_SERVER_ERROR" }
  🔍 Full Error Object: {...}
  📚 Stack Trace: Error: syntax error...
```

### 2. Server Console (Server-Side)

When running `npm run dev`, you'll see detailed server-side logs in your terminal:

```
================================================================================
🚀 [GraphQL Server] Incoming QUERY: dashboard
⏱️  Timestamp: 2025-01-06T14:23:45.123Z
🔧 Variables: {
  "employeeId": "AM-0006",
  "role": "employee"
}
================================================================================

⚙️ [Resolver] dashboard ⏱️ 14:23:45.123
  🔧 Args: {"employeeId":"AM-0006","role":"employee"}
  🗄️ [DB Query] [dashboard.tasks]
    SQL: SELECT * FROM tasks WHERE deleted_at IS NULL AND ...
    Params: ["AM-0006", "AM-0006", "AM-0006"]
  ✅ [DB Result] [dashboard.tasks] 12 rows in 45ms
  🗄️ [DB Query] [dashboard.bugs]
    SQL: SELECT * FROM bugs WHERE deleted_at IS NULL AND ...
    Params: ["AM-0006", "AM-0006"]
  ✅ [DB Result] [dashboard.bugs] 5 rows in 23ms
  ✅ [Resolver] dashboard completed in 245ms → Object(4 keys)

================================================================================
✅ [GraphQL Server] dashboard completed in 245ms
================================================================================
```

### 3. Filtering Logs

Use browser console filters to focus on specific types of logs:

- **Only queries**: Filter by `[GraphQL QUERY]`
- **Only mutations**: Filter by `[GraphQL MUTATION]`
- **Only errors**: Filter by `FAILED` or `❌`
- **Specific operation**: Filter by operation name (e.g., `dashboard`, `createTask`)
- **Performance issues**: Filter by duration (e.g., look for `>500ms`)

## Architecture

### Client-Side Logging Flow

1. **Apollo Link Chain**: Logging is integrated via Apollo Client links
2. **Operation Start**: Logs query/mutation details before execution
3. **Operation Success**: Logs response data and duration after execution
4. **Operation Error**: Logs full error details if operation fails

### Server-Side Logging Flow

1. **API Route**: Logs incoming GraphQL requests
2. **Resolver Start**: Logs when resolver begins execution
3. **Database Query**: Logs SQL queries and parameters
4. **Database Result**: Logs row count and query duration
5. **Resolver Success/Error**: Logs final result or error

## Files

- **`apps/web/src/lib/graphql-logger.ts`**: Core logging utility
- **`apps/web/src/lib/graphql-client.ts`**: Client-side integration
- **`apps/web/src/app/api/graphql/route.ts`**: Server request logging
- **`apps/web/src/graphql/resolvers.ts`**: Resolver-level logging

## Configuration

Logging is automatically enabled in development mode (`NODE_ENV=development`) and disabled in production.

To modify logging behavior, edit `apps/web/src/lib/graphql-logger.ts`:

```typescript
const isDevelopment = process.env.NODE_ENV === 'development'
```

## Best Practices

1. **Use collapsible groups**: Click the arrow to expand/collapse log groups
2. **Check timestamps**: Identify slow operations by comparing timestamps
3. **Review error paths**: GraphQL errors include the path to the failing field
4. **Monitor database queries**: Look for N+1 query problems or slow SQL
5. **Use browser filters**: Focus on specific operations or error types

## Troubleshooting

### No logs appearing in browser console

1. Check that you're in development mode (`npm run dev`)
2. Open browser DevTools (F12) → Console tab
3. Make sure console filters are not hiding logs
4. Verify GraphQL operations are actually being executed

### Server logs not showing

1. Check terminal where `npm run dev` is running
2. Verify `NODE_ENV=development` in `.env.local`
3. Check that GraphQL operations are reaching the server

### Too many logs

1. Use browser console filters to focus on specific operations
2. Collapse log groups you don't need
3. Clear console regularly (Ctrl+L or Cmd+K)

## Examples

See the main application for live examples:
- Dashboard page: Multiple queries (tasks, bugs, users, settings)
- Task creation: Mutation with variables
- Profile page: User query with nested data

