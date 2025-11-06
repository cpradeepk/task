# GraphQL Logging Examples

This document shows real examples of what you'll see in the browser console and server terminal when using the GraphQL logging system.

## Browser Console Examples

### Example 1: Dashboard Query (Success)

When you navigate to `/dashboard`, you'll see:

```
🔍 [GraphQL QUERY] dashboard 14:23:45.123
├─ 📝 Operation: dashboard
├─ 🔤 Type: query
├─ 🔧 Variables:
│  ┌─────────────┬──────────┐
│  │ employeeId  │ AM-0006  │
│  │ role        │ employee │
│  └─────────────┴──────────┘
└─ 📄 Query:
   query dashboard($employeeId: String!, $role: String!) {
     dashboard(employeeId: $employeeId, role: $role) {
       tasks { taskId description status ... }
       bugs { bugId description severity ... }
       users { employeeId name email ... }
       settings { key value ... }
     }
   }

✅ [GraphQL QUERY] dashboard 245ms
├─ ⏱️ Duration: 245ms
└─ 📦 Response Data:
   ├─ tasks: Array(12) [{ taskId: "TSK-001", ... }, ...]
   ├─ bugs: Array(5) [{ bugId: "BUG-001", ... }, ...]
   ├─ users: Array(25) [{ employeeId: "AM-0001", ... }, ...]
   └─ settings: Array(18) [{ key: "priority_options", ... }, ...]
```

### Example 2: Create Task Mutation (Success)

When you create a new task:

```
✏️ [GraphQL MUTATION] createTask 14:24:10.456
├─ 📝 Operation: createTask
├─ 🔤 Type: mutation
├─ 🔧 Variables:
│  ┌──────────────────┬─────────────────────────────┐
│  │ description      │ Fix login authentication    │
│  │ assignedTo       │ AM-0006                     │
│  │ assignedBy       │ AM-0001                     │
│  │ priority         │ U&I                         │
│  │ startDate        │ 2025-01-06                  │
│  │ endDate          │ 2025-01-08                  │
│  │ estimatedHours   │ 8                           │
│  └──────────────────┴─────────────────────────────┘
└─ 📄 Query:
   mutation createTask($input: CreateTaskInput!) {
     createTask(input: $input) {
       taskId
       description
       status
       ...
     }
   }

✅ [GraphQL MUTATION] createTask 89ms
├─ ⏱️ Duration: 89ms
└─ 📦 Response Data:
   └─ createTask: Object {
        taskId: "TSK-1234567890",
        description: "Fix login authentication",
        status: "Pending",
        assignedTo: ["AM-0006"],
        priority: "U&I"
      }
```

### Example 3: Query with Error

When a GraphQL query fails:

```
🔍 [GraphQL QUERY] tasks 14:25:30.789
├─ 📝 Operation: tasks
├─ 🔤 Type: query
├─ 🔧 Variables:
│  ┌─────────────┬──────────┐
│  │ assignedTo  │ AM-0006  │
│  │ status      │ Pending  │
│  └─────────────┴──────────┘
└─ 📄 Query: query tasks($assignedTo: String, $status: String) { ... }

❌ [GraphQL QUERY] tasks FAILED 156ms
├─ ⏱️ Duration: 156ms
├─ ❌ GraphQL Errors:
│  └─ Error 1:
│     ├─ Message: syntax error at or near "WHERE"
│     ├─ Path: tasks
│     └─ Extensions: {
│          code: "INTERNAL_SERVER_ERROR",
│          exception: {
│            code: "42601",
│            detail: null,
│            hint: null
│          }
│        }
├─ 🔍 Full Error Object:
│  └─ ApolloError {
│       graphQLErrors: [...],
│       networkError: null,
│       message: "syntax error at or near \"WHERE\"",
│       ...
│     }
└─ 📚 Stack Trace:
   Error: syntax error at or near "WHERE"
     at Object.tasks (resolvers.ts:134)
     at executeOperation (apollo-server.ts:245)
     ...
```

### Example 4: Network Error

When the server is unreachable:

```
🔍 [GraphQL QUERY] users 14:26:15.234
└─ ... (operation details)

❌ [GraphQL QUERY] users FAILED 5023ms
├─ ⏱️ Duration: 5023ms
├─ ⚠️ Network Error:
│  └─ TypeError: Failed to fetch
│     at fetch (native)
│     at httpLink.ts:45
│     ...
└─ 🔍 Full Error Object: {...}
```

## Server Terminal Examples

### Example 1: Dashboard Query (Server-Side)

In your terminal running `npm run dev`:

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
    SQL: SELECT * FROM tasks WHERE deleted_at IS NULL AND (assigned_by = $1 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(assigned_to) AS elem WHERE elem = $2) OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(support) AS elem WHERE elem = $3)) ORDER BY created_at DESC
    Params: ["AM-0006", "AM-0006", "AM-0006"]
  ✅ [DB Result] [dashboard.tasks] 12 rows in 45ms
  
  🗄️ [DB Query] [dashboard.bugs]
    SQL: SELECT * FROM bugs WHERE deleted_at IS NULL AND (assigned_to = $1 OR reported_by = $2) ORDER BY created_at DESC
    Params: ["AM-0006", "AM-0006"]
  ✅ [DB Result] [dashboard.bugs] 5 rows in 23ms
  
  🗄️ [DB Query] [dashboard.users]
    SQL: SELECT * FROM users WHERE deleted_at IS NULL ORDER BY name
    Params: []
  ✅ [DB Result] [dashboard.users] 25 rows in 18ms
  
  🗄️ [DB Query] [dashboard.settings]
    SQL: SELECT * FROM settings WHERE is_active = true ORDER BY key
    Params: []
  ✅ [DB Result] [dashboard.settings] 18 rows in 12ms
  
  ✅ [Resolver] dashboard completed in 245ms → Object(4 keys)

================================================================================
✅ [GraphQL Server] dashboard completed in 245ms
================================================================================
```

### Example 2: Create Task Mutation (Server-Side)

```
================================================================================
🚀 [GraphQL Server] Incoming MUTATION: createTask
⏱️  Timestamp: 2025-01-06T14:24:10.456Z
🔧 Variables: {
  "input": {
    "description": "Fix login authentication",
    "assignedTo": "AM-0006",
    "assignedBy": "AM-0001",
    "priority": "U&I",
    "startDate": "2025-01-06",
    "endDate": "2025-01-08",
    "estimatedHours": 8
  }
}
================================================================================

⚙️ [Resolver] createTask ⏱️ 14:24:10.456
  🔧 Args: {"input":{...}}
  
  🗄️ [DB Query] [createTask]
    SQL: INSERT INTO tasks (taskId, description, assignedTo, ...) VALUES ($1, $2, $3, ...)
    Params: ["TSK-1234567890", "Fix login authentication", "AM-0006", ...]
  ✅ [DB Result] [createTask] 1 rows in 34ms
  
  ✅ [Resolver] createTask completed in 89ms → Object(15 keys)

================================================================================
✅ [GraphQL Server] createTask completed in 89ms
================================================================================
```

### Example 3: Query with Database Error (Server-Side)

```
================================================================================
🚀 [GraphQL Server] Incoming QUERY: tasks
⏱️  Timestamp: 2025-01-06T14:25:30.789Z
🔧 Variables: {
  "assignedTo": "AM-0006",
  "status": "Pending"
}
================================================================================

⚙️ [Resolver] tasks ⏱️ 14:25:30.789
  🔧 Args: {"assignedTo":"AM-0006","status":"Pending"}
  
  🗄️ [DB Query] [tasks]
    SQL: SELECT * FROM tasks WHERE deleted_at IS NULL AND assigned_to = $1 WHERE status = $2
    Params: ["AM-0006", "Pending"]
  ❌ [DB Error] [tasks] after 12ms
    Message: syntax error at or near "WHERE"
    Code: 42601
    Detail: null
    Hint: null
  
  ❌ [Resolver] tasks FAILED in 156ms
    Error: syntax error at or near "WHERE"
    Code: 42601
    Stack: Error: syntax error at or near "WHERE"
      at Connection.parseE (/node_modules/pg/lib/connection.js:614:13)
      at Connection.parseMessage (/node_modules/pg/lib/connection.js:413:19)
      ...

================================================================================
❌ [GraphQL Server] tasks FAILED in 156ms
Errors: [
  {
    "message": "syntax error at or near \"WHERE\"",
    "extensions": {
      "code": "INTERNAL_SERVER_ERROR"
    }
  }
]
================================================================================
```

## How to Read the Logs

### Color Coding (in browser)
- 🟢 **Green** (`#10b981`): Success messages
- 🔴 **Red** (`#ef4444`): Error messages
- 🟡 **Yellow** (`#f59e0b`): Warning messages
- 🔵 **Blue** (`#3b82f6`): Info messages
- 🟣 **Purple** (`#8b5cf6`): Mutations
- 🔷 **Cyan** (`#06b6d4`): Queries

### Emoji Legend
- 🔍 Query operation
- ✏️ Mutation operation
- ✅ Success
- ❌ Error
- ⚠️ Warning
- ⏱️ Timer/Duration
- 📦 Data/Response
- 🔧 Variables/Parameters
- ⚙️ Resolver
- 🗄️ Database query
- 📝 Operation name
- 🔤 Operation type
- 📄 Query string
- 📚 Stack trace

### Performance Indicators
- **< 100ms**: Excellent (green)
- **100-500ms**: Good (yellow)
- **> 500ms**: Slow (red) - investigate!

### Common Patterns

**N+1 Query Problem**: Look for many similar database queries in sequence
```
🗄️ [DB Query] [User.tasks] ... 1 rows in 5ms
🗄️ [DB Query] [User.tasks] ... 1 rows in 4ms
🗄️ [DB Query] [User.tasks] ... 1 rows in 6ms
... (repeated 100 times)
```

**Slow Query**: Database query taking too long
```
🗄️ [DB Query] [tasks] ... 
✅ [DB Result] [tasks] 1000 rows in 2345ms  ⚠️ SLOW!
```

**GraphQL Error Chain**: Follow the error from client to server to database
```
Browser: ❌ [GraphQL QUERY] tasks FAILED
Server:  ❌ [Resolver] tasks FAILED
DB:      ❌ [DB Error] syntax error at or near "WHERE"
```

