# GraphQL API Guide

## Overview

The JSR Task Management System now includes a GraphQL API for flexible and efficient data fetching. GraphQL allows clients to request exactly the data they need, reducing over-fetching and under-fetching issues common with REST APIs.

## GraphQL Endpoint

**URL**: `/api/graphql`

**Methods**: `GET` (for GraphQL Playground), `POST` (for queries and mutations)

## GraphQL Playground

In development mode, you can access the GraphQL Playground at:

```
http://localhost:3000/api/graphql
```

The playground provides:
- Interactive query editor with autocomplete
- Schema documentation browser
- Query history
- Real-time query execution

## Key Features

### 1. DataLoader for N+1 Prevention

The GraphQL API uses DataLoader to batch and cache database queries, preventing N+1 query problems:

- **User Loader**: Batches user queries by employeeId
- **Task Loader**: Batches task queries by taskId
- **Bug Loader**: Batches bug queries by bugId
- **Subtask Loader**: Batches subtask queries by parentTaskId
- **Bug Subtask Loader**: Batches bug subtask queries by parentBugId

### 2. Flexible Filtering

All list queries support filtering:

```graphql
query {
  tasks(assignedTo: "EMP001", status: "In Progress", priority: "High") {
    taskId
    description
    status
  }
}
```

### 3. Nested Data Fetching

Fetch related data in a single query:

```graphql
query {
  task(taskId: "TSK-123") {
    taskId
    description
    assignedToUser {
      name
      email
    }
    subtasks {
      description
      status
    }
  }
}
```

## Example Queries

### Get Dashboard Data

```graphql
query GetDashboard {
  dashboard(employeeId: "EMP001", role: "employee") {
    tasks {
      taskId
      description
      status
      priority
      assignedToUser {
        name
        email
      }
    }
    bugs {
      bugId
      description
      severity
      status
    }
    users {
      employeeId
      name
      role
    }
    settings {
      key
      value
    }
  }
}
```

### Get Tasks with Filters

```graphql
query GetMyTasks {
  tasks(assignedTo: "EMP001", status: "In Progress") {
    taskId
    description
    priority
    startDate
    endDate
    estimatedHours
    actualHours
    assignedByUser {
      name
    }
    subtasks {
      subTaskId
      description
      status
    }
  }
}
```

### Get Single Task with Full Details

```graphql
query GetTaskDetails {
  task(taskId: "TSK-123") {
    taskId
    description
    assignedTo
    assignedBy
    support
    startDate
    endDate
    priority
    estimatedHours
    actualHours
    status
    remarks
    difficulties
    assignedToUser {
      employeeId
      name
      email
      department
    }
    assignedByUser {
      name
    }
    supportUsers {
      employeeId
      name
    }
    subtasks {
      subTaskId
      description
      assignedTo
      status
      estimatedHours
      actualHours
    }
    project {
      projectId
      projectName
    }
  }
}
```

### Get Bugs with Filters

```graphql
query GetBugs {
  bugs(severity: "Critical", status: "Open") {
    bugId
    description
    category
    severity
    status
    reportedDate
    assignedToUser {
      name
    }
    reportedByUser {
      name
    }
    subtasks {
      description
      status
    }
  }
}
```

### Get All Users

```graphql
query GetUsers {
  users {
    employeeId
    name
    email
    department
    role
    status
    tasks {
      taskId
      description
      status
    }
    bugs {
      bugId
      description
      status
    }
  }
}
```

## Example Mutations

### Create Task

```graphql
mutation CreateTask {
  createTask(input: {
    description: "Implement user authentication"
    assignedTo: "EMP001"
    assignedBy: "EMP002"
    support: ["EMP003", "EMP004"]
    startDate: "2025-01-15"
    endDate: "2025-01-20"
    priority: "High"
    estimatedHours: 16
    selectType: "Development"
    projectId: "PRJ-001"
  }) {
    taskId
    description
    status
  }
}
```

### Update Task

```graphql
mutation UpdateTask {
  updateTask(
    taskId: "TSK-123"
    input: {
      status: "In Progress"
      actualHours: 8
      remarks: "Making good progress"
    }
  ) {
    taskId
    status
    actualHours
    remarks
  }
}
```

### Delete Task

```graphql
mutation DeleteTask {
  deleteTask(taskId: "TSK-123")
}
```

### Create Bug

```graphql
mutation CreateBug {
  createBug(input: {
    description: "Login button not working on mobile"
    category: "UI"
    severity: "High"
    assignedTo: "EMP001"
    assignedBy: "EMP002"
    reportedBy: "EMP003"
    reportedDate: "2025-01-15"
    estimatedHours: 4
  }) {
    bugId
    description
    status
  }
}
```

### Update Bug

```graphql
mutation UpdateBug {
  updateBug(
    bugId: "BUG-123"
    input: {
      status: "Resolved"
      resolvedDate: "2025-01-16"
      actualHours: 3
      remarks: "Fixed CSS issue"
    }
  ) {
    bugId
    status
    resolvedDate
  }
}
```

## Using GraphQL in Frontend

### Option 1: Using Apollo Client (Recommended)

```typescript
import { apolloClient, QUERIES } from '@/lib/graphql-client'
import { gql } from '@apollo/client'

// Execute query
const { data } = await apolloClient.query({
  query: gql(QUERIES.GET_TASKS),
  variables: { assignedTo: 'EMP001' }
})

// Execute mutation
const { data } = await apolloClient.mutate({
  mutation: gql(MUTATIONS.CREATE_TASK),
  variables: { input: { ... } }
})
```

### Option 2: Using Fetch API

```typescript
const response = await fetch('/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `
      query GetTasks($assignedTo: String) {
        tasks(assignedTo: $assignedTo) {
          taskId
          description
        }
      }
    `,
    variables: { assignedTo: 'EMP001' }
  })
})

const { data } = await response.json()
```

## Performance Benefits

### 1. Reduced API Calls

Instead of multiple REST calls:
```
GET /api/tasks
GET /api/users/EMP001
GET /api/users/EMP002
GET /api/subtasks?taskId=TSK-123
```

Single GraphQL query:
```graphql
query {
  task(taskId: "TSK-123") {
    description
    assignedToUser { name }
    assignedByUser { name }
    subtasks { description }
  }
}
```

### 2. No Over-fetching

Request only the fields you need:
```graphql
query {
  users {
    employeeId
    name
    # Only these two fields, not the entire user object
  }
}
```

### 3. Automatic Batching

DataLoader automatically batches multiple user requests into a single database query:
```
// Instead of 10 separate queries
SELECT * FROM users WHERE employeeId = 'EMP001'
SELECT * FROM users WHERE employeeId = 'EMP002'
...

// Single batched query
SELECT * FROM users WHERE employeeId IN ('EMP001', 'EMP002', ...)
```

## Migration from REST to GraphQL

You can gradually migrate from REST to GraphQL:

1. **Keep REST endpoints**: Existing REST endpoints continue to work
2. **Add GraphQL queries**: Start using GraphQL for new features
3. **Migrate incrementally**: Move existing features to GraphQL one at a time
4. **Deprecate REST**: Once fully migrated, deprecate old REST endpoints

## Best Practices

1. **Use fragments** for reusable field selections
2. **Implement pagination** for large lists
3. **Add error handling** for all queries and mutations
4. **Cache aggressively** using Apollo Client cache
5. **Monitor performance** using GraphQL metrics
6. **Use aliases** when fetching the same field with different arguments

## Troubleshooting

### GraphQL Playground not loading

- Ensure `introspection: true` in Apollo Server config
- Check that you're in development mode
- Verify the endpoint is `/api/graphql`

### DataLoader not batching

- Ensure you're creating a new context for each request
- Check that loaders are being used correctly in resolvers

### Slow queries

- Use DataLoader for all related data fetching
- Add database indexes for frequently queried fields
- Implement query complexity limits
- Use persisted queries for production

## Next Steps

1. Explore the schema in GraphQL Playground
2. Try example queries and mutations
3. Integrate GraphQL into your frontend components
4. Monitor performance improvements
5. Gradually migrate from REST to GraphQL

