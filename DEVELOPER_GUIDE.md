# JSR Task Management - Developer Guide

**Version:** 1.0  
**Last Updated:** 2025-11-12  
**Document Owner:** JSR Development Team

---

## Changelog
- **2025-11-12**: Initial Developer Guide creation - Setup instructions, code patterns, conventions, best practices

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Code Conventions](#code-conventions)
5. [GraphQL Development](#graphql-development)
6. [Database Development](#database-development)
7. [Component Development](#component-development)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Common Patterns](#common-patterns)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

---

## Getting Started

**Last Updated:** 2025-11-12

### Prerequisites

- **Node.js**: 18.x or later
- **npm**: 9.x or later
- **Git**: Latest version
- **Code Editor**: VS Code recommended
- **Database Access**: Supabase credentials
- **AWS Access**: S3 credentials for file uploads

### Quick Start

```bash
# Clone repository
git clone https://github.com/cpradeepk/task.git
cd task

# Install dependencies
npm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your credentials

# Start development server
cd apps/web
npm run dev

# In another terminal, start mobile app
cd apps/mobile
npm start
```

### Repository Structure

```
jsr_web_app-jsr_tool/
├── apps/
│   ├── web/                 # Next.js web application
│   │   ├── src/
│   │   │   ├── app/         # Next.js App Router pages
│   │   │   ├── components/  # React components
│   │   │   ├── graphql/     # GraphQL schema and resolvers
│   │   │   ├── lib/         # Utility functions
│   │   │   └── styles/      # CSS and styling
│   │   ├── public/          # Static assets
│   │   └── package.json
│   └── mobile/              # React Native mobile app
│       ├── src/
│       │   ├── screens/     # Mobile screens
│       │   ├── components/  # Mobile components
│       │   ├── config/      # GraphQL queries
│       │   ├── services/    # Apollo Client setup
│       │   └── types/       # TypeScript types
│       ├── android/         # Android native code
│       └── package.json
├── packages/
│   └── shared/              # Shared TypeScript types
├── .augment/
│   └── rules/               # Agent documentation protocols
├── docs/                    # Additional documentation
├── scripts/                 # Database migration scripts
├── ARCHITECTURE.md          # System architecture
├── SRS.md                   # System requirements
├── DEVELOPER_GUIDE.md       # This file
├── QUICK_REFERENCE.md       # Quick reference
├── agent_history.md         # Agent session logs
├── turbo.json               # Turborepo configuration
└── package.json             # Root package.json
```

---

## Development Environment Setup

**Last Updated:** 2025-11-12

### Web App Setup

#### 1. Install Dependencies
```bash
cd apps/web
npm install
```

#### 2. Configure Environment Variables

Create `apps/web/.env.local`:

```bash
# Database
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres

# JWT
JWT_SECRET=your-secret-key-here

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=amtariksha@gmail.com
SMTP_PASS=your-app-password-here

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=amtariksha

# Optional: Redis (for caching)
REDIS_URL=redis://default:[password]@[host]:6379
```

#### 3. Start Development Server
```bash
npm run dev
```

Server runs at `http://localhost:3000`

### Mobile App Setup

#### 1. Install Dependencies
```bash
cd apps/mobile
npm install
```

#### 2. Configure Environment Variables

Create `apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=https://task.amtariksha.com/api/graphql
# For local development:
# EXPO_PUBLIC_API_URL=http://localhost:3000/api/graphql
```

#### 3. Start Expo Dev Server
```bash
npm start
```

#### 4. Build Android APK (for testing)
```bash
cd android
./gradlew assembleDebug --no-daemon
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Database Setup

#### 1. Access Supabase Dashboard
- URL: https://supabase.com/dashboard/project/rbckjkdohzbclomrufrx
- Project ID: rbckjkdohzbclomrufrx
- Region: ap-south-1

#### 2. Run Migrations (if needed)
```bash
cd scripts
node run-migrations.js
```

#### 3. Test Connection
```bash
node scripts/test-supabase-connection.js
```

---

## Project Structure

**Last Updated:** 2025-11-12

### Web App Structure

```
apps/web/src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   └── graphql/              # GraphQL endpoint
│   │       └── route.ts          # GraphQL handler
│   ├── (auth)/                   # Auth routes
│   │   └── login/
│   ├── (dashboard)/              # Dashboard routes
│   │   ├── tasks/
│   │   ├── bugs/
│   │   ├── leave/
│   │   ├── wfh/
│   │   └── feed/
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # React components
│   ├── ui/                       # UI components
│   ├── tasks/                    # Task components
│   ├── bugs/                     # Bug components
│   └── shared/                   # Shared components
├── graphql/                      # GraphQL layer
│   ├── schema.ts                 # Type definitions
│   ├── resolvers.ts              # Resolvers
│   └── context.ts                # GraphQL context
├── lib/                          # Utilities
│   ├── db.ts                     # Database client
│   ├── auth.ts                   # Authentication
│   ├── email.ts                  # Email service
│   └── s3.ts                     # S3 client
└── styles/                       # Styling
    └── globals.css               # Global styles
```

### Mobile App Structure

```
apps/mobile/src/
├── screens/                      # Screen components
│   ├── LoginScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── TaskListScreen.tsx
│   ├── TaskDetailsScreen.tsx
│   ├── BugListScreen.tsx
│   ├── BugDetailsScreen.tsx
│   └── FeedScreen.tsx
├── components/                   # Reusable components
│   ├── TaskCard.tsx
│   ├── BugCard.tsx
│   └── Timer.tsx
├── config/                       # Configuration
│   └── graphql-queries.ts        # GraphQL queries
├── services/                     # Services
│   └── apolloClient.ts           # Apollo Client setup
├── types/                        # TypeScript types
│   └── index.ts
└── navigation/                   # Navigation setup
    └── AppNavigator.tsx
```

---

## Code Conventions

**Last Updated:** 2025-11-12

### TypeScript

#### Naming Conventions

```typescript
// Interfaces and Types: PascalCase
interface TaskInput {
  name: string;
  description: string;
}

type TaskStatus = 'Yet to Start' | 'In Progress' | 'Completed';

// Variables and Functions: camelCase
const taskId = 'TSK-001';
function createTask(input: TaskInput) { }

// Constants: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_PAGE_SIZE = 20;

// Components: PascalCase
function TaskCard({ task }: { task: Task }) { }

// Files: kebab-case
// task-list.tsx, bug-details.tsx, graphql-queries.ts
```

#### Type Safety

```typescript
// ✅ GOOD: Use explicit types
function getTask(taskId: string): Promise<Task | null> {
  // ...
}

// ❌ BAD: Avoid 'any'
function getTask(taskId: any): any {
  // ...
}

// ✅ GOOD: Use type guards
function isTask(entity: Task | Bug): entity is Task {
  return 'taskId' in entity;
}

// ✅ GOOD: Use optional chaining
const projectName = task.project?.projectName ?? 'No Project';

// ✅ GOOD: Use nullish coalescing
const priority = task.priority ?? 'NU&NI';
```

### React/Next.js

#### Component Structure

```typescript
// ✅ GOOD: Functional components with TypeScript
interface TaskCardProps {
  task: Task;
  onUpdate?: (task: Task) => void;
}

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  // Hooks at the top
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();

  // Event handlers
  const handleEdit = () => {
    setIsEditing(true);
  };

  // Render
  return (
    <div className="task-card">
      {/* JSX */}
    </div>
  );
}
```

#### Hooks Usage

```typescript
// ✅ GOOD: Custom hooks for reusable logic
function useTimer(entityType: string, entityId: string) {
  const [timerState, setTimerState] = useState<TimerState>('stopped');
  const [elapsedTime, setElapsedTime] = useState(0);

  const startTimer = async () => {
    // Start timer logic
  };

  return { timerState, elapsedTime, startTimer };
}

// Usage
const { timerState, elapsedTime, startTimer } = useTimer('task', taskId);
```

### GraphQL

#### Schema Conventions

```typescript
// ✅ GOOD: Clear, descriptive type names
type Task {
  taskId: String!
  name: String!
  description: String!
  status: String!
  assignedToUsers: [User!]!
  project: Project
}

// ✅ GOOD: Input types for mutations
input TaskInput {
  name: String!
  description: String!
  assignedTo: [String!]!
  startDate: String!
  endDate: String!
  priority: String
  projectId: String
}

// ✅ GOOD: Consistent naming for queries/mutations
type Query {
  tasks(assignedTo: String, status: String, limit: Int, offset: Int): [Task!]!
  task(taskId: String!): Task
}

type Mutation {
  createTask(input: TaskInput!): Task!
  updateTask(taskId: String!, input: TaskInput!): Task!
  deleteTask(taskId: String!): Boolean!
}
```

#### Resolver Patterns

```typescript
// ✅ GOOD: Use field resolvers for related data
const resolvers = {
  Task: {
    // Field resolver for project
    project: async (parent, args, context) => {
      if (!parent.projectId) return null;
      return context.dataloaders.project.load(parent.projectId);
    },

    // Field resolver for assignedToUsers
    assignedToUsers: async (parent, args, context) => {
      const assignedTo = parent.assignedTo || [];
      return context.dataloaders.user.loadMany(assignedTo);
    },
  },

  Query: {
    tasks: async (parent, args, context) => {
      // Validate authentication
      if (!context.user) {
        throw new Error('Unauthorized');
      }

      // Build query
      const query = buildTaskQuery(args, context.user);

      // Execute query
      const tasks = await context.db.query(query);

      return tasks;
    },
  },
};
```

### Database

#### Query Patterns

```typescript
// ✅ GOOD: Use parameterized queries
const query = `
  SELECT * FROM tasks
  WHERE task_id = $1 AND deleted_at IS NULL
`;
const result = await db.query(query, [taskId]);

// ❌ BAD: String concatenation (SQL injection risk)
const query = `SELECT * FROM tasks WHERE task_id = '${taskId}'`;

// ✅ GOOD: Use transactions for multiple operations
const client = await db.connect();
try {
  await client.query('BEGIN');

  await client.query('INSERT INTO tasks ...', [values]);
  await client.query('INSERT INTO activity_log ...', [values]);

  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### Error Handling

```typescript
// ✅ GOOD: Specific error types
class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// ✅ GOOD: Try-catch with specific handling
try {
  const task = await getTask(taskId);
  if (!task) {
    throw new NotFoundError(`Task ${taskId} not found`);
  }
  return task;
} catch (error) {
  if (error instanceof NotFoundError) {
    return null;
  }
  console.error('Error fetching task:', error);
  throw error;
}
```

---

## GraphQL Development

**Last Updated:** 2025-11-12

### Adding a New Query

#### 1. Define Type in Schema

```typescript
// apps/web/src/graphql/schema.ts

export const typeDefs = `
  type Query {
    # ... existing queries ...

    # New query
    tasksByProject(projectId: String!, limit: Int, offset: Int): [Task!]!
  }
`;
```

#### 2. Implement Resolver

```typescript
// apps/web/src/graphql/resolvers.ts

export const resolvers = {
  Query: {
    // ... existing resolvers ...

    tasksByProject: async (parent, args, context) => {
      const { projectId, limit = 20, offset = 0 } = args;

      // Validate authentication
      if (!context.user) {
        throw new Error('Unauthorized');
      }

      // Build query
      const query = `
        SELECT * FROM tasks
        WHERE project_id = $1
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      // Execute query
      const result = await context.db.query(query, [projectId, limit, offset]);

      return result.rows;
    },
  },
};
```

#### 3. Add Query to Mobile App

```typescript
// apps/mobile/src/config/graphql-queries.ts

export const GET_TASKS_BY_PROJECT = gql`
  query GetTasksByProject($projectId: String!, $limit: Int, $offset: Int) {
    tasksByProject(projectId: $projectId, limit: $limit, offset: $offset) {
      taskId
      name
      description
      status
      priority
      assignedToUsers {
        employeeId
        name
        email
      }
      project {
        projectId
        projectName
      }
    }
  }
`;
```

#### 4. Use Query in Component

```typescript
// apps/mobile/src/screens/ProjectTasksScreen.tsx

import { useQuery } from '@apollo/client/react';
import { GET_TASKS_BY_PROJECT } from '../config/graphql-queries';

export function ProjectTasksScreen({ projectId }: { projectId: string }) {
  const { data, loading, error } = useQuery(GET_TASKS_BY_PROJECT, {
    variables: { projectId, limit: 20, offset: 0 },
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  const tasks = data?.tasksByProject || [];

  return (
    <FlatList
      data={tasks}
      renderItem={({ item }) => <TaskCard task={item} />}
      keyExtractor={(item) => item.taskId}
    />
  );
}
```

### Adding a New Mutation

#### 1. Define Mutation in Schema

```typescript
// apps/web/src/graphql/schema.ts

export const typeDefs = `
  input UpdateTaskStatusInput {
    taskId: String!
    status: String!
    remarks: String
  }

  type Mutation {
    # ... existing mutations ...

    updateTaskStatus(input: UpdateTaskStatusInput!): Task!
  }
`;
```

#### 2. Implement Resolver

```typescript
// apps/web/src/graphql/resolvers.ts

export const resolvers = {
  Mutation: {
    updateTaskStatus: async (parent, args, context) => {
      const { taskId, status, remarks } = args.input;

      // Validate authentication
      if (!context.user) {
        throw new Error('Unauthorized');
      }

      // Get current task
      const currentTask = await getTask(taskId, context.db);
      if (!currentTask) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Check permissions
      if (!canEditTask(currentTask, context.user)) {
        throw new Error('Unauthorized to edit this task');
      }

      // Stop timer if status is Closed or Resolved
      if (status === 'Closed' || status === 'Resolved') {
        if (currentTask.timerState === 'running') {
          await stopTimer('task', taskId, context);
        }
      }

      // Update task
      const query = `
        UPDATE tasks
        SET status = $1, remarks = $2, updated_at = NOW()
        WHERE task_id = $3
        RETURNING *
      `;
      const result = await context.db.query(query, [status, remarks, taskId]);

      // Log activity
      await logActivity({
        entityType: 'task',
        entityId: taskId,
        userId: context.user.employeeId,
        actionType: 'status_changed',
        fieldName: 'status',
        oldValue: currentTask.status,
        newValue: status,
        description: `Changed status from ${currentTask.status} to ${status}`,
      }, context.db);

      return result.rows[0];
    },
  },
};
```

### Using DataLoader for N+1 Prevention

```typescript
// apps/web/src/graphql/context.ts

import DataLoader from 'dataloader';

export function createContext(req, db) {
  return {
    user: req.user,
    db,
    dataloaders: {
      // Project DataLoader
      project: new DataLoader(async (projectIds) => {
        const query = `
          SELECT * FROM projects
          WHERE project_id = ANY($1)
        `;
        const result = await db.query(query, [projectIds]);

        // Map results to match input order
        const projectMap = new Map(
          result.rows.map(p => [p.project_id, p])
        );
        return projectIds.map(id => projectMap.get(id) || null);
      }),

      // User DataLoader
      user: new DataLoader(async (employeeIds) => {
        const query = `
          SELECT * FROM users
          WHERE employee_id = ANY($1)
        `;
        const result = await db.query(query, [employeeIds]);

        const userMap = new Map(
          result.rows.map(u => [u.employee_id, u])
        );
        return employeeIds.map(id => userMap.get(id) || null);
      }),
    },
  };
}
```

---

## Database Development

**Last Updated:** 2025-11-12

### Adding a New Table

#### 1. Create Migration Script

```javascript
// scripts/migrations/007_add_notifications_table.js

module.exports = {
  up: async (db) => {
    await db.query(`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        notification_id VARCHAR(100) UNIQUE NOT NULL,
        user_id VARCHAR(50) NOT NULL REFERENCES users(employee_id),
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        notification_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read SMALLINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX idx_notifications_created_at ON notifications(created_at);
    `);
  },

  down: async (db) => {
    await db.query(`DROP TABLE IF EXISTS notifications;`);
  },
};
```

#### 2. Run Migration

```bash
cd scripts
node run-migrations.js
```

#### 3. Update GraphQL Schema

```typescript
// apps/web/src/graphql/schema.ts

export const typeDefs = `
  type Notification {
    notificationId: String!
    userId: String!
    entityType: String!
    entityId: String!
    notificationType: String!
    title: String!
    message: String!
    isRead: Boolean!
    createdAt: String!
  }

  type Query {
    notifications(limit: Int, offset: Int): [Notification!]!
    unreadNotificationCount: Int!
  }

  type Mutation {
    markNotificationAsRead(notificationId: String!): Boolean!
    markAllNotificationsAsRead: Boolean!
  }
`;
```

### Database Best Practices

#### Indexes

```sql
-- ✅ GOOD: Index frequently queried columns
CREATE INDEX idx_tasks_assigned_to_gin ON tasks USING GIN (assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);

-- ✅ GOOD: Partial indexes for soft deletes
CREATE INDEX idx_tasks_active ON tasks(task_id) WHERE deleted_at IS NULL;

-- ✅ GOOD: Composite indexes for common queries
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
```

#### Soft Deletes

```sql
-- ✅ GOOD: Always use soft deletes
UPDATE tasks
SET deleted_at = NOW(), deleted_by = $1
WHERE task_id = $2;

-- ✅ GOOD: Exclude soft-deleted records in queries
SELECT * FROM tasks
WHERE deleted_at IS NULL;
```

#### JSONB Usage

```sql
-- ✅ GOOD: Use JSONB for flexible arrays/objects
-- tasks.assigned_to: ["AM-0001", "AM-0002"]
-- tasks.timer_sessions: [{"start": "...", "end": "...", "duration": 3600}]

-- Query JSONB array
SELECT * FROM tasks
WHERE assigned_to @> '["AM-0001"]'::jsonb;

-- Update JSONB field
UPDATE tasks
SET assigned_to = assigned_to || '["AM-0003"]'::jsonb
WHERE task_id = $1;
```

---

## Component Development

**Last Updated:** 2025-11-12

### Creating a New Component

#### Web Component Example

```typescript
// apps/web/src/components/tasks/TaskTimer.tsx

'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { START_TIMER, PAUSE_TIMER, STOP_TIMER } from '@/graphql/mutations';

interface TaskTimerProps {
  taskId: string;
  timerState: 'running' | 'paused' | 'stopped' | null;
  timerStartTime?: string;
  timerTotalTime?: number;
  onTimerUpdate?: () => void;
}

export function TaskTimer({
  taskId,
  timerState,
  timerStartTime,
  timerTotalTime = 0,
  onTimerUpdate,
}: TaskTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  const [startTimer] = useMutation(START_TIMER);
  const [pauseTimer] = useMutation(PAUSE_TIMER);
  const [stopTimer] = useMutation(STOP_TIMER);

  // Update elapsed time every second when running
  useEffect(() => {
    if (timerState !== 'running' || !timerStartTime) return;

    const interval = setInterval(() => {
      const start = new Date(timerStartTime).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000);
      setElapsedTime(timerTotalTime + elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState, timerStartTime, timerTotalTime]);

  const handleStart = async () => {
    try {
      await startTimer({ variables: { entityType: 'task', entityId: taskId } });
      onTimerUpdate?.();
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const handlePause = async () => {
    try {
      await pauseTimer({ variables: { entityType: 'task', entityId: taskId } });
      onTimerUpdate?.();
    } catch (error) {
      console.error('Error pausing timer:', error);
    }
  };

  const handleStop = async () => {
    try {
      await stopTimer({ variables: { entityType: 'task', entityId: taskId } });
      onTimerUpdate?.();
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="task-timer">
      <div className="timer-display">
        {formatTime(elapsedTime)}
      </div>
      <div className="timer-controls">
        {timerState === 'running' ? (
          <>
            <button onClick={handlePause}>Pause</button>
            <button onClick={handleStop}>Stop</button>
          </>
        ) : timerState === 'paused' ? (
          <>
            <button onClick={handleStart}>Resume</button>
            <button onClick={handleStop}>Stop</button>
          </>
        ) : (
          <button onClick={handleStart}>Start</button>
        )}
      </div>
    </div>
  );
}
```

#### Mobile Component Example

```typescript
// apps/mobile/src/components/TaskCard.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface TaskCardProps {
  task: {
    taskId: string;
    name: string;
    status: string;
    priority: string;
    assignedToUsers?: Array<{ name: string }>;
    project?: { projectName: string };
  };
}

export function TaskCard({ task }: TaskCardProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('TaskDetails', { taskId: task.taskId });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'U&I': return '#f44336';
      case 'U&NI': return '#ff9800';
      case 'NU&I': return '#2196f3';
      default: return '#9e9e9e';
    }
  };

  const assigneeNames = task.assignedToUsers?.map(u => u.name).join(', ') || 'Unassigned';
  const projectName = task.project?.projectName || '';

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.header}>
        <Text style={styles.taskId}>{task.taskId}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
          <Text style={styles.priorityText}>{task.priority}</Text>
        </View>
      </View>

      <Text style={styles.taskName} numberOfLines={2}>
        {task.name}
      </Text>

      {projectName && (
        <Text style={styles.projectName} numberOfLines={1}>
          📁 {projectName}
        </Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.status}>{task.status}</Text>
        <Text style={styles.assignee}>👤 {assigneeNames}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskId: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  projectName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: '500',
  },
  assignee: {
    fontSize: 12,
    color: '#666',
  },
});
```

### Collapsible Text Component

```typescript
// apps/web/src/components/ui/CollapsibleText.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleTextProps {
  text: string;
  maxCharacters?: number;
  maxLines?: number;
  className?: string;
}

export function CollapsibleText({
  text,
  maxCharacters = 300,
  maxLines = 5,
  className = '',
}: CollapsibleTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldCollapse, setShouldCollapse] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(getComputedStyle(textRef.current).lineHeight);
      const actualLines = textRef.current.scrollHeight / lineHeight;

      const exceedsCharacters = text.length > maxCharacters;
      const exceedsLines = actualLines > maxLines;

      setShouldCollapse(exceedsCharacters || exceedsLines);
    }
  }, [text, maxCharacters, maxLines]);

  if (!shouldCollapse) {
    return (
      <div className={`whitespace-pre-wrap ${className}`}>
        {text}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={textRef}
        className={`whitespace-pre-wrap transition-all duration-300 ${
          isExpanded ? '' : 'line-clamp-5'
        }`}
        style={{
          maxHeight: isExpanded ? 'none' : `${maxLines * 1.5}em`,
          overflow: 'hidden',
        }}
      >
        {text}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2 ml-auto"
      >
        {isExpanded ? (
          <>
            Show less <ChevronUp size={16} />
          </>
        ) : (
          <>
            Show more <ChevronDown size={16} />
          </>
        )}
      </button>
    </div>
  );
}
```

---

## Testing

**Last Updated:** 2025-11-12

### Unit Testing

```typescript
// apps/web/src/lib/__tests__/auth.test.ts

import { describe, it, expect } from '@jest/globals';
import { validatePassword, hashPassword, comparePassword } from '../auth';

describe('Auth utilities', () => {
  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      expect(validatePassword('Password123!')).toBe(true);
      expect(validatePassword('MyP@ssw0rd')).toBe(true);
    });

    it('should reject short passwords', () => {
      expect(validatePassword('Pass1!')).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      expect(validatePassword('Password!')).toBe(false);
    });
  });

  describe('hashPassword and comparePassword', () => {
    it('should hash and verify passwords correctly', async () => {
      const password = 'MyPassword123!';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(await comparePassword(password, hash)).toBe(true);
      expect(await comparePassword('WrongPassword', hash)).toBe(false);
    });
  });
});
```

### Integration Testing

```typescript
// apps/web/src/graphql/__tests__/task-resolvers.test.ts

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestContext } from '../test-utils';
import { resolvers } from '../resolvers';

describe('Task resolvers', () => {
  let context;

  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await context.cleanup();
  });

  describe('Query.tasks', () => {
    it('should return tasks for authenticated user', async () => {
      const result = await resolvers.Query.tasks(
        null,
        { limit: 10, offset: 0 },
        context
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('taskId');
      expect(result[0]).toHaveProperty('name');
    });

    it('should throw error for unauthenticated user', async () => {
      const unauthContext = { ...context, user: null };

      await expect(
        resolvers.Query.tasks(null, {}, unauthContext)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('Mutation.createTask', () => {
    it('should create a new task', async () => {
      const input = {
        name: 'Test Task',
        description: 'Test description',
        assignedTo: ['AM-0001'],
        startDate: '2025-11-12',
        endDate: '2025-11-15',
        priority: 'U&I',
      };

      const result = await resolvers.Mutation.createTask(
        null,
        { input },
        context
      );

      expect(result).toHaveProperty('taskId');
      expect(result.name).toBe(input.name);
      expect(result.description).toBe(input.description);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- task-resolvers.test.ts
```

---

## Deployment

**Last Updated:** 2025-11-12

### Web App Deployment (Vercel)

#### 1. Configure Environment Variables

In Vercel dashboard, add all environment variables from `.env.local`:
- DATABASE_URL
- JWT_SECRET
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET

#### 2. Deploy

```bash
# Automatic deployment on push to main
git push origin main

# Manual deployment
vercel --prod
```

#### 3. Verify Deployment

- Check build logs in Vercel dashboard
- Test GraphQL endpoint: https://task.amtariksha.com/api/graphql
- Test login functionality
- Check email notifications

### Mobile App Deployment

#### 1. Build Release APK

```bash
cd apps/mobile/android
./gradlew assembleRelease
```

#### 2. Sign APK

```bash
# Generate keystore (one-time)
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Sign APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore app/build/outputs/apk/release/app-release-unsigned.apk my-key-alias

# Align APK
zipalign -v 4 app/build/outputs/apk/release/app-release-unsigned.apk app-release.apk
```

#### 3. Distribute

- Upload to Google Play Store (future)
- Or distribute APK directly for internal testing

---

## Common Patterns

**Last Updated:** 2025-11-12

### Authentication Check

```typescript
// Middleware pattern for protected routes
export function requireAuth(handler) {
  return async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const user = await verifyToken(token);
      req.user = user;
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}
```

### Activity Logging

```typescript
// Helper function for logging activities
export async function logActivity(
  {
    entityType,
    entityId,
    userId,
    actionType,
    fieldName = null,
    oldValue = null,
    newValue = null,
    description,
    isComment = 0,
    attachments = null,
  },
  db
) {
  const query = `
    INSERT INTO activity_log (
      entity_type, entity_id, user_id, action_type,
      field_name, old_value, new_value, description,
      is_comment, attachments
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;

  await db.query(query, [
    entityType,
    entityId,
    userId,
    actionType,
    fieldName,
    oldValue,
    newValue,
    description,
    isComment,
    attachments,
  ]);
}

// Usage
await logActivity({
  entityType: 'task',
  entityId: taskId,
  userId: user.employeeId,
  actionType: 'status_changed',
  fieldName: 'status',
  oldValue: 'In Progress',
  newValue: 'Completed',
  description: 'Changed status from In Progress to Completed',
}, db);
```

### Email Sending

```typescript
// Helper function for sending emails
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Usage
await sendEmail({
  to: user.email,
  subject: 'Task Assigned',
  html: renderTaskAssignmentEmail({ task, assignedBy }),
});
```

---

## Troubleshooting

**Last Updated:** 2025-11-12

### Common Issues

#### Apollo Client 4.x Import Errors (Mobile)

**Problem**: `useQuery is not a function` error in mobile app

**Solution**: Import React hooks from `@apollo/client/react`:

```typescript
// ✅ CORRECT
import { useQuery, useMutation } from '@apollo/client/react';
import { ApolloClient, InMemoryCache } from '@apollo/client';

// ❌ WRONG
import { useQuery, useMutation } from '@apollo/client';
```

#### Database Connection Pool Exhausted

**Problem**: "Too many connections" error

**Solution**:
1. Check for unclosed connections in resolvers
2. Increase connection pool size in DATABASE_URL
3. Use connection pooling (PgBouncer)

```typescript
// ✅ GOOD: Release connection
const client = await db.connect();
try {
  // ... queries ...
} finally {
  client.release(); // Always release!
}
```

#### Metro Bundler Cache Issues (Mobile)

**Problem**: Changes not reflecting in mobile app

**Solution**: Clear Metro cache:

```bash
cd apps/mobile
npm start -- --reset-cache
```

#### GraphQL N+1 Query Problem

**Problem**: Too many database queries for related data

**Solution**: Use DataLoader:

```typescript
// Create DataLoader in context
const projectLoader = new DataLoader(async (ids) => {
  const projects = await db.query('SELECT * FROM projects WHERE project_id = ANY($1)', [ids]);
  const projectMap = new Map(projects.rows.map(p => [p.project_id, p]));
  return ids.map(id => projectMap.get(id));
});

// Use in resolver
project: (parent, args, context) => {
  return context.dataloaders.project.load(parent.projectId);
}
```

---

## Best Practices

**Last Updated:** 2025-11-12

### Security

1. **Never commit `.env.local` or `.env` files**
2. **Always use parameterized queries** (prevent SQL injection)
3. **Validate all user inputs** (sanitize, validate types)
4. **Use JWT for authentication** (don't store passwords in tokens)
5. **Implement rate limiting** (prevent abuse)
6. **Use HTTPS in production** (encrypt data in transit)
7. **Hash passwords with bcrypt** (never store plain text)

### Performance

1. **Use DataLoader** to prevent N+1 queries
2. **Add database indexes** on frequently queried columns
3. **Implement pagination** for large datasets
4. **Use JSONB indexes** for JSONB column queries
5. **Cache frequently accessed data** (Redis)
6. **Optimize images** before uploading to S3
7. **Use CDN** for static assets

### Code Quality

1. **Write TypeScript** for type safety
2. **Use ESLint and Prettier** for consistent formatting
3. **Write tests** for critical functionality
4. **Document complex logic** with comments
5. **Use meaningful variable names** (avoid abbreviations)
6. **Keep functions small** (single responsibility)
7. **Handle errors gracefully** (try-catch, error boundaries)

### Git Workflow

1. **Commit often** with descriptive messages
2. **Use feature branches** for new features
3. **Review code** before merging
4. **Test before pushing** to main branch
5. **Keep commits atomic** (one logical change per commit)
6. **Write good commit messages** (what and why, not how)

---

**For system requirements, see SRS.md**
**For architecture details, see ARCHITECTURE.md**
**For quick reference, see QUICK_REFERENCE.md**


