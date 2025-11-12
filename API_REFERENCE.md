# JSR Task Management - GraphQL API Reference

**Version:** 1.0  
**Last Updated:** 2025-11-12  
**API Endpoint:** `https://task.amtariksha.com/api/graphql`  
**Local Development:** `http://localhost:3000/api/graphql`

---

## Changelog
- **2025-11-12**: Initial API Reference creation - Complete GraphQL API documentation with all queries, mutations, types, and examples

---

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [GraphQL Types](#graphql-types)
4. [Queries](#queries)
5. [Mutations](#mutations)
6. [Field Resolvers](#field-resolvers)
7. [Error Handling](#error-handling)
8. [Examples](#examples)
9. [Rate Limiting](#rate-limiting)
10. [Best Practices](#best-practices)

---

## Overview

**Last Updated:** 2025-11-12

### API Architecture

The JSR Task Management system uses a **GraphQL API** for all client-server communication. GraphQL provides:

- **Single Endpoint**: All requests go to `/api/graphql`
- **Flexible Queries**: Clients request exactly the data they need
- **Type Safety**: Strong typing with GraphQL schema
- **Batching**: DataLoader prevents N+1 query problems
- **Real-time**: Supports subscriptions (future enhancement)

### API Features

- ✅ **Authentication**: JWT-based authentication
- ✅ **Authorization**: Role-based access control (RBAC)
- ✅ **Pagination**: Limit/offset pagination for large datasets
- ✅ **Field Resolvers**: Automatic resolution of related data
- ✅ **DataLoader**: Batching and caching for performance
- ✅ **Error Handling**: Structured error responses
- ✅ **Logging**: Comprehensive request/response logging

### Supported Clients

- **Web App**: Next.js with Apollo Client
- **Mobile App**: React Native with Apollo Client 4.x
- **Third-party**: Any GraphQL client (curl, Postman, Insomnia)

---

## Authentication

**Last Updated:** 2025-11-12

### Authentication Flow

1. **Login**: Client sends `login` mutation with credentials
2. **Token**: Server returns JWT token
3. **Authorization**: Client includes token in `Authorization` header for all subsequent requests
4. **Validation**: Server validates token and extracts user information

### Login Mutation

```graphql
mutation Login($employeeId: String!, $password: String!) {
  login(employeeId: $employeeId, password: $password) {
    token
    user {
      employeeId
      name
      email
      role
      department
    }
  }
}
```

**Variables:**
```json
{
  "employeeId": "AM-0001",
  "password": "12345678"
}
```

**Response:**
```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "employeeId": "AM-0001",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "amtariksian",
        "department": "Engineering"
      }
    }
  }
}
```

### Authorization Header

All authenticated requests must include the JWT token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration

- **Expiration**: 7 days from issue
- **Refresh**: Re-login required after expiration
- **Storage**: Store securely (localStorage for web, SecureStore for mobile)

### Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **amtariksian** | View own tasks/bugs, create tasks/bugs, apply for leave/WFH |
| **management** | All amtariksian permissions + approve leave/WFH, view team data |
| **top_management** | All management permissions + view all data, manage projects |
| **admin** | Full access to all features and data |

---

## GraphQL Types

**Last Updated:** 2025-11-12

### Core Types

#### User

Represents a system user (employee).

```graphql
type User {
  employeeId: ID!              # Unique employee identifier (e.g., AM-0001)
  name: String!                # Full name
  email: String!               # Email address
  phone: String                # Phone number (optional)
  department: String           # Department name
  role: String!                # Role: amtariksian, management, top_management, admin
  status: String!              # Status: active, inactive
  managerEmail: String         # Manager's email for approvals
  isTodayTask: Boolean         # Has tasks due today
  warningCount: Int            # Number of warnings
  createdAt: String!           # Account creation timestamp
  updatedAt: String!           # Last update timestamp
  tasks: [Task!]!              # User's tasks (field resolver)
  bugs: [Bug!]!                # User's bugs (field resolver)
}
```

#### Task

Represents a work task.

```graphql
type Task {
  id: ID!                      # Database primary key
  taskId: String!              # Unique task identifier (e.g., TSK-001)
  selectType: String!          # Task type: Normal, Recursive
  recursiveType: String        # Recursive frequency: Daily, Weekly, Monthly
  name: String                 # Task name/title
  description: String!         # Task description
  assignedTo: [String!]!       # Array of employee IDs assigned to task
  assignedBy: String!          # Employee ID who assigned the task
  support: [String!]!          # Array of employee IDs providing support
  startDate: String!           # Start date (YYYY-MM-DD)
  endDate: String!             # End date (YYYY-MM-DD)
  priority: String!            # Priority: U&I, U&NI, NU&I, NU&NI
  estimatedHours: Float!       # Estimated hours to complete
  actualHours: Float           # Actual hours spent (from timer)
  dailyHours: String           # Daily hour breakdown (JSONB)
  status: String!              # Status: Yet to Start, In Progress, Completed, Closed
  remarks: String              # Additional remarks
  difficulties: String         # Difficulties encountered
  relatedTasks: String         # Related task IDs (comma-separated)
  projectId: String            # Project ID
  subprojectId: String         # Subproject ID
  parentTaskId: String         # Parent task ID (for subtasks)
  department: String           # Department
  timerState: String           # Timer state: running, paused, stopped
  deletedAt: String            # Soft delete timestamp
  deletedBy: String            # Employee ID who deleted
  createdAt: String!           # Creation timestamp
  updatedAt: String!           # Last update timestamp
  
  # Field Resolvers (automatically populated)
  assignedToUser: User         # First assigned user (deprecated, use assignedToUsers)
  assignedToUsers: [User!]!    # All assigned users
  assignedByUser: User         # User who assigned the task
  supportUsers: [User!]!       # Support users
  subtasks: [SubTask!]!        # Task checklists
  project: Project             # Project details
}
```

#### Bug

Represents a software bug or issue.

```graphql
type Bug {
  id: ID!                      # Database primary key
  bugId: String!               # Unique bug identifier (e.g., BUG-001)
  title: String                # Bug title
  description: String!         # Bug description
  category: String!            # Category: UI, Backend, Database, etc.
  severity: String!            # Severity: Critical, High, Medium, Low
  priority: String             # Priority: U&I, U&NI, NU&I, NU&NI
  status: String!              # Status: Open, In Progress, Resolved, Closed
  assignedTo: String           # Employee ID assigned to bug
  assignedBy: String           # Employee ID who assigned
  reportedBy: String           # Employee ID who reported
  reportedDate: String         # Date reported
  resolvedDate: String         # Date resolved
  startDate: String            # Start date
  endDate: String              # End date
  estimatedHours: Float        # Estimated hours
  actualHours: Float           # Actual hours (from timer)
  remarks: String              # Remarks
  attachments: [String!]       # S3 URLs of attachments
  projectId: String            # Project ID
  subprojectId: String         # Subproject ID
  relatedBugs: String          # Related bug IDs
  platform: String             # Platform: Web, Mobile, API
  type: String                 # Bug type
  feature: String              # Feature affected
  environment: String          # Environment: Dev, Staging, Production
  bugType: String              # Bug classification
  criticality: String          # Criticality level
  parentDevId: String          # Parent development ID
  timerState: String           # Timer state
  timerStartTime: String       # Timer start timestamp
  timerPausedTime: Int         # Paused time in seconds
  timerTotalTime: Int          # Total time in seconds
  timerSessions: String        # Timer sessions (JSONB)
  deletedAt: String            # Soft delete timestamp
  deletedBy: String            # Employee ID who deleted
  createdAt: String!           # Creation timestamp
  updatedAt: String!           # Last update timestamp

  # Field Resolvers
  assignedToUser: User         # Assigned user
  assignedByUser: User         # User who assigned
  reportedByUser: User         # User who reported
  subtasks: [BugSubTask!]!     # Development checklists
  project: Project             # Project details
}
```

#### Project

Represents a project or subproject.

```graphql
type Project {
  id: ID!                      # Database primary key
  projectId: String!           # Unique project identifier
  projectName: String!         # Project name
  description: String          # Project description
  parentProjectId: String      # Parent project ID (for subprojects)
  deletedAt: String            # Soft delete timestamp
  deletedBy: String            # Employee ID who deleted
  createdAt: String!           # Creation timestamp
  updatedAt: String!           # Last update timestamp
  tasks: [Task!]!              # Project tasks (field resolver)
}
```

#### FeedPost

Represents a social feed post.

```graphql
type FeedPost {
  postId: ID!                  # Unique post identifier
  contentType: String!         # Content type: text, link, media
  content: String              # Post content (HTML)
  linkUrl: String              # Link URL (for link posts)
  linkTitle: String            # Link title
  linkDescription: String      # Link description
  linkImage: String            # Link preview image
  mediaUrls: [String!]         # Media URLs (images/videos)
  createdBy: String!           # Employee ID of author
  createdAt: String            # Creation timestamp
  updatedAt: String            # Last update timestamp
  status: String!              # Status: active, archived, deleted

  # Field Resolvers
  author: User!                # Post author
  topics: [FeedTopic!]!        # Post topics/tags
  reactions: [FeedReaction!]!  # Post reactions
  comments: [FeedComment!]!    # Post comments
  viewCount: Int!              # View count
  commentCount: Int!           # Comment count
  isSaved: Boolean!            # Is saved by current user
  hasUserReacted: Boolean!     # Has current user reacted
}
```

### Input Types

#### CreateTaskInput

```graphql
input CreateTaskInput {
  description: String!         # Task description (required)
  assignedTo: String!          # Assigned employee ID (required)
  assignedBy: String!          # Assigner employee ID (required)
  support: [String!]           # Support employee IDs (optional)
  startDate: String!           # Start date YYYY-MM-DD (required)
  endDate: String!             # End date YYYY-MM-DD (required)
  priority: String!            # Priority: U&I, U&NI, NU&I, NU&NI (required)
  estimatedHours: Float!       # Estimated hours (required)
  selectType: String!          # Task type: Normal, Recursive (required)
  recursiveType: String        # Recursive type: Daily, Weekly, Monthly (optional)
  projectId: String            # Project ID (optional)
}
```

#### UpdateTaskInput

```graphql
input UpdateTaskInput {
  description: String          # Updated description
  assignedTo: String           # Updated assigned employee ID
  support: [String!]           # Updated support employee IDs
  startDate: String            # Updated start date
  endDate: String              # Updated end date
  priority: String             # Updated priority
  estimatedHours: Float        # Updated estimated hours
  actualHours: Float           # Updated actual hours
  status: String               # Updated status
  remarks: String              # Updated remarks
  difficulties: String         # Updated difficulties
}
```

#### CreateBugInput

```graphql
input CreateBugInput {
  description: String!         # Bug description (required)
  category: String!            # Category (required)
  severity: String!            # Severity (required)
  assignedTo: String!          # Assigned employee ID (required)
  assignedBy: String!          # Assigner employee ID (required)
  reportedBy: String!          # Reporter employee ID (required)
  reportedDate: String!        # Reported date (required)
  estimatedHours: Float        # Estimated hours (optional)
}
```

#### CreateFeedPostInput

```graphql
input CreateFeedPostInput {
  contentType: String!         # Content type: text, link, media (required)
  content: String!             # Post content (required)
  linkUrl: String              # Link URL (optional)
  linkTitle: String            # Link title (optional)
  linkDescription: String      # Link description (optional)
  linkImage: String            # Link image URL (optional)
  mediaUrls: [String!]         # Media URLs (optional)
  topicIds: [String!]!         # Topic IDs (required, at least one)
}
```

---

## Queries

**Last Updated:** 2025-11-12

### User Queries

#### users

Get all users in the system.

**Query:**
```graphql
query GetUsers {
  users {
    employeeId
    name
    email
    role
    department
    status
  }
}
```

**Authentication:** Required
**Authorization:** All roles
**Returns:** `[User!]!`

**Example Response:**
```json
{
  "data": {
    "users": [
      {
        "employeeId": "AM-0001",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "amtariksian",
        "department": "Engineering",
        "status": "active"
      }
    ]
  }
}
```

#### user

Get a specific user by employee ID.

**Query:**
```graphql
query GetUser($employeeId: ID!) {
  user(employeeId: $employeeId) {
    employeeId
    name
    email
    phone
    department
    role
    status
    managerEmail
    createdAt
  }
}
```

**Parameters:**
- `employeeId` (ID!, required): Employee ID to fetch

**Authentication:** Required
**Authorization:** All roles
**Returns:** `User` (nullable)

---

### Task Queries

#### tasks

Get tasks with optional filtering and pagination.

**Query:**
```graphql
query GetTasks(
  $assignedTo: String
  $assignedBy: String
  $status: String
  $priority: String
  $limit: Int
  $offset: Int
) {
  tasks(
    assignedTo: $assignedTo
    assignedBy: $assignedBy
    status: $status
    priority: $priority
    limit: $limit
    offset: $offset
  ) {
    taskId
    name
    description
    status
    priority
    startDate
    endDate
    estimatedHours
    actualHours
    assignedToUsers {
      employeeId
      name
      email
    }
    assignedByUser {
      employeeId
      name
    }
    project {
      projectId
      projectName
    }
  }
}
```

**Parameters:**
- `assignedTo` (String, optional): Filter by assigned employee ID
- `assignedBy` (String, optional): Filter by assigner employee ID
- `status` (String, optional): Filter by status
- `priority` (String, optional): Filter by priority
- `limit` (Int, optional): Maximum number of results (default: 20)
- `offset` (Int, optional): Number of results to skip (default: 0)

**Authentication:** Required
**Authorization:** All roles (filtered by role)
**Returns:** `[Task!]!`

**Example Variables:**
```json
{
  "assignedTo": "AM-0001",
  "status": "In Progress",
  "limit": 10,
  "offset": 0
}
```

#### task

Get a specific task by task ID.

**Query:**
```graphql
query GetTask($taskId: ID!) {
  task(taskId: $taskId) {
    taskId
    name
    description
    status
    priority
    startDate
    endDate
    estimatedHours
    actualHours
    remarks
    difficulties
    timerState
    assignedToUsers {
      employeeId
      name
      email
    }
    assignedByUser {
      employeeId
      name
    }
    supportUsers {
      employeeId
      name
    }
    project {
      projectId
      projectName
    }
    subtasks {
      subTaskId
      description
      status
      assignedToUser {
        name
      }
    }
  }
}
```

**Parameters:**
- `taskId` (ID!, required): Task ID to fetch

**Authentication:** Required
**Authorization:** All roles
**Returns:** `Task` (nullable)

---

### Bug Queries

#### bugs

Get bugs with optional filtering and pagination.

**Query:**
```graphql
query GetBugs(
  $assignedTo: String
  $reportedBy: String
  $status: String
  $severity: String
  $category: String
  $limit: Int
  $offset: Int
) {
  bugs(
    assignedTo: $assignedTo
    reportedBy: $reportedBy
    status: $status
    severity: $severity
    category: $category
    limit: $limit
    offset: $offset
  ) {
    bugId
    title
    description
    category
    severity
    status
    reportedDate
    assignedToUser {
      employeeId
      name
    }
    reportedByUser {
      employeeId
      name
    }
    project {
      projectId
      projectName
    }
  }
}
```

**Parameters:**
- `assignedTo` (String, optional): Filter by assigned employee ID
- `reportedBy` (String, optional): Filter by reporter employee ID
- `status` (String, optional): Filter by status
- `severity` (String, optional): Filter by severity
- `category` (String, optional): Filter by category
- `limit` (Int, optional): Maximum number of results
- `offset` (Int, optional): Number of results to skip

**Authentication:** Required
**Authorization:** All roles
**Returns:** `[Bug!]!`

---

### Feed Queries

#### feedPosts

Get feed posts with optional filtering and pagination.

**Query:**
```graphql
query GetFeedPosts(
  $topicId: String
  $status: String
  $search: String
  $limit: Int
  $offset: Int
) {
  feedPosts(
    topicId: $topicId
    status: $status
    search: $search
    limit: $limit
    offset: $offset
  ) {
    posts {
      postId
      contentType
      content
      createdAt
      author {
        employeeId
        name
        email
      }
      topics {
        id
        topicName
      }
      reactions {
        emoji
        count
        hasUserReacted
      }
      commentCount
      viewCount
    }
    total
    hasMore
  }
}
```

**Parameters:**
- `topicId` (String, optional): Filter by topic ID
- `status` (String, optional): Filter by status
- `search` (String, optional): Search in content
- `limit` (Int, optional): Maximum number of results
- `offset` (Int, optional): Number of results to skip

**Authentication:** Required
**Authorization:** All roles
**Returns:** `FeedPostsResponse!`

---

## Mutations

**Last Updated:** 2025-11-12

### Task Mutations

#### createTask

Create a new task.

**Mutation:**
```graphql
mutation CreateTask($input: CreateTaskInput!) {
  createTask(input: $input) {
    taskId
    name
    description
    status
    priority
    startDate
    endDate
    estimatedHours
    assignedToUsers {
      employeeId
      name
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "description": "Implement user authentication",
    "assignedTo": "AM-0001",
    "assignedBy": "AM-0002",
    "support": ["AM-0003"],
    "startDate": "2025-11-12",
    "endDate": "2025-11-15",
    "priority": "U&I",
    "estimatedHours": 16,
    "selectType": "Normal",
    "projectId": "PROJ-001"
  }
}
```

**Authentication:** Required
**Authorization:** All roles
**Returns:** `Task!`

**Side Effects:**
- Generates unique task ID (TSK-XXX)
- Creates activity log entry
- Sends email notification to assigned user
- Sets status to "Yet to Start" by default

#### updateTask

Update an existing task.

**Mutation:**
```graphql
mutation UpdateTask($taskId: ID!, $input: UpdateTaskInput!) {
  updateTask(taskId: $taskId, input: $input) {
    taskId
    status
    actualHours
    remarks
    updatedAt
  }
}
```

**Variables:**
```json
{
  "taskId": "TSK-001",
  "input": {
    "status": "In Progress",
    "remarks": "Started working on authentication module"
  }
}
```

**Authentication:** Required
**Authorization:** Assigned users, managers, admins
**Returns:** `Task!`

**Side Effects:**
- Updates task fields
- Creates activity log entry for each changed field
- Stops timer if status changed to "Closed" or "Resolved"
- Sends notification if status changed

#### deleteTask

Soft delete a task.

**Mutation:**
```graphql
mutation DeleteTask($taskId: ID!) {
  deleteTask(taskId: $taskId)
}
```

**Variables:**
```json
{
  "taskId": "TSK-001"
}
```

**Authentication:** Required
**Authorization:** Task creator, managers, admins
**Returns:** `Boolean!`

**Side Effects:**
- Sets `deleted_at` timestamp
- Sets `deleted_by` to current user
- Stops any running timer
- Creates activity log entry

---

### Bug Mutations

#### createBug

Create a new bug report.

**Mutation:**
```graphql
mutation CreateBug($input: CreateBugInput!) {
  createBug(input: $input) {
    bugId
    title
    description
    category
    severity
    status
    reportedDate
    assignedToUser {
      employeeId
      name
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "description": "Login button not working on mobile",
    "category": "UI",
    "severity": "High",
    "assignedTo": "AM-0001",
    "assignedBy": "AM-0002",
    "reportedBy": "AM-0003",
    "reportedDate": "2025-11-12",
    "estimatedHours": 4
  }
}
```

**Authentication:** Required
**Authorization:** All roles
**Returns:** `Bug!`

**Side Effects:**
- Generates unique bug ID (BUG-XXX)
- Creates activity log entry
- Sends email notification to assigned user
- Sets status to "Open" by default

#### updateBug

Update an existing bug.

**Mutation:**
```graphql
mutation UpdateBug($bugId: ID!, $input: UpdateBugInput!) {
  updateBug(bugId: $bugId, input: $input) {
    bugId
    status
    resolvedDate
    actualHours
    remarks
  }
}
```

**Variables:**
```json
{
  "bugId": "BUG-001",
  "input": {
    "status": "Resolved",
    "resolvedDate": "2025-11-12",
    "remarks": "Fixed button click handler"
  }
}
```

**Authentication:** Required
**Authorization:** Assigned user, managers, admins
**Returns:** `Bug!`

**Side Effects:**
- Updates bug fields
- Creates activity log entry
- Stops timer if status changed to "Closed" or "Resolved"
- Sends notification to reporter

---

### Feed Mutations

#### createFeedPost

Create a new feed post.

**Mutation:**
```graphql
mutation CreateFeedPost($input: CreateFeedPostInput!) {
  createFeedPost(input: $input) {
    postId
    contentType
    content
    createdAt
    author {
      employeeId
      name
    }
    topics {
      id
      topicName
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "contentType": "text",
    "content": "<p>Great work team! We shipped the new feature today.</p>",
    "topicIds": ["1", "2"]
  }
}
```

**Authentication:** Required
**Authorization:** All roles
**Returns:** `FeedPost!`

**Side Effects:**
- Generates unique post ID
- Parses and stores mentions (@username)
- Creates notifications for mentioned users
- Associates post with topics

#### toggleFeedReaction

Add or remove a reaction to a post.

**Mutation:**
```graphql
mutation ToggleFeedReaction($postId: ID!, $emoji: String!) {
  toggleFeedReaction(postId: $postId, emoji: $emoji) {
    action
    message
  }
}
```

**Variables:**
```json
{
  "postId": "1",
  "emoji": "👍"
}
```

**Authentication:** Required
**Authorization:** All roles
**Returns:** `FeedReactionResponse!`

**Response:**
```json
{
  "data": {
    "toggleFeedReaction": {
      "action": "added",
      "message": "Reaction added successfully"
    }
  }
}
```

**Side Effects:**
- Adds reaction if not exists
- Removes reaction if already exists (toggle)
- Creates notification for post author
- Updates reaction count

#### createFeedComment

Add a comment to a post.

**Mutation:**
```graphql
mutation CreateFeedComment(
  $postId: ID!
  $content: String!
  $parentCommentId: String
) {
  createFeedComment(
    postId: $postId
    content: $content
    parentCommentId: $parentCommentId
  ) {
    commentId
    content
    createdAt
    author {
      employeeId
      name
    }
  }
}
```

**Variables:**
```json
{
  "postId": "1",
  "content": "Great job! Looking forward to the next release.",
  "parentCommentId": null
}
```

**Authentication:** Required
**Authorization:** All roles
**Returns:** `FeedComment!`

**Side Effects:**
- Creates comment record
- Parses and stores mentions
- Creates notifications for post author and mentioned users
- Updates comment count on post

---

## Field Resolvers

**Last Updated:** 2025-11-12

### What are Field Resolvers?

Field resolvers automatically fetch related data when requested. They use **DataLoader** for batching and caching to prevent N+1 query problems.

### Task Field Resolvers

#### assignedToUsers

Resolves the array of users assigned to a task.

**Implementation:**
- Reads `assignedTo` JSONB array from task
- Uses UserLoader to batch-fetch users
- Returns array of User objects

**Example:**
```graphql
query {
  task(taskId: "TSK-001") {
    taskId
    assignedToUsers {  # Field resolver
      employeeId
      name
      email
    }
  }
}
```

#### project

Resolves the project associated with a task.

**Implementation:**
- Reads `projectId` from task
- Uses ProjectLoader to batch-fetch project
- Returns Project object or null

**Example:**
```graphql
query {
  task(taskId: "TSK-001") {
    taskId
    project {  # Field resolver
      projectId
      projectName
      description
    }
  }
}
```

#### subtasks

Resolves task checklists (subtasks).

**Implementation:**
- Uses SubtaskLoader to batch-fetch by parent task ID
- Returns array of SubTask objects

**Example:**
```graphql
query {
  task(taskId: "TSK-001") {
    taskId
    subtasks {  # Field resolver
      subTaskId
      description
      status
      assignedToUser {
        name
      }
    }
  }
}
```

### Bug Field Resolvers

#### assignedToUser, reportedByUser

Resolves user objects for bug assignment and reporting.

**Implementation:**
- Uses UserLoader to batch-fetch users
- Returns User object or null

#### subtasks

Resolves development checklists for a bug.

**Implementation:**
- Uses BugSubtaskLoader to batch-fetch by parent bug ID
- Returns array of BugSubTask objects

### Feed Field Resolvers

#### author

Resolves the author of a feed post or comment.

**Implementation:**
- Uses UserLoader to batch-fetch user
- Returns User object

#### topics

Resolves topics associated with a post.

**Implementation:**
- Queries feed_post_topics junction table
- Fetches topic details
- Returns array of FeedTopic objects

#### reactions

Resolves reactions for a post.

**Implementation:**
- Queries feed_reactions table
- Groups by emoji
- Calculates count and hasUserReacted
- Returns array of FeedReaction objects

---

## Error Handling

**Last Updated:** 2025-11-12

### Error Response Format

GraphQL errors are returned in the `errors` array:

```json
{
  "errors": [
    {
      "message": "Unauthorized",
      "locations": [{"line": 2, "column": 3}],
      "path": ["tasks"],
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ],
  "data": null
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHENTICATED` | No valid JWT token provided | 401 |
| `FORBIDDEN` | User lacks permission for operation | 403 |
| `BAD_USER_INPUT` | Invalid input parameters | 400 |
| `NOT_FOUND` | Requested resource not found | 404 |
| `INTERNAL_SERVER_ERROR` | Server error | 500 |

### Error Examples

#### Authentication Error

```json
{
  "errors": [
    {
      "message": "Unauthorized",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

#### Validation Error

```json
{
  "errors": [
    {
      "message": "Invalid input: startDate must be before endDate",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "field": "startDate"
      }
    }
  ]
}
```

#### Not Found Error

```json
{
  "errors": [
    {
      "message": "Task TSK-999 not found",
      "extensions": {
        "code": "NOT_FOUND",
        "resource": "Task",
        "id": "TSK-999"
      }
    }
  ]
}
```

---

## Examples

**Last Updated:** 2025-11-12

### Complete Task Workflow

#### 1. Login

```bash
curl -X POST https://task.amtariksha.com/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation Login($employeeId: String!, $password: String!) { login(employeeId: $employeeId, password: $password) { token user { employeeId name role } } }",
    "variables": {
      "employeeId": "AM-0001",
      "password": "12345678"
    }
  }'
```

#### 2. Create Task

```bash
curl -X POST https://task.amtariksha.com/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "mutation CreateTask($input: CreateTaskInput!) { createTask(input: $input) { taskId name status } }",
    "variables": {
      "input": {
        "description": "Implement login feature",
        "assignedTo": "AM-0001",
        "assignedBy": "AM-0002",
        "startDate": "2025-11-12",
        "endDate": "2025-11-15",
        "priority": "U&I",
        "estimatedHours": 16,
        "selectType": "Normal"
      }
    }
  }'
```

#### 3. Get Tasks

```bash
curl -X POST https://task.amtariksha.com/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "query GetTasks($assignedTo: String, $limit: Int) { tasks(assignedTo: $assignedTo, limit: $limit) { taskId name status priority assignedToUsers { name } } }",
    "variables": {
      "assignedTo": "AM-0001",
      "limit": 10
    }
  }'
```

#### 4. Update Task Status

```bash
curl -X POST https://task.amtariksha.com/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "mutation UpdateTask($taskId: ID!, $input: UpdateTaskInput!) { updateTask(taskId: $taskId, input: $input) { taskId status } }",
    "variables": {
      "taskId": "TSK-001",
      "input": {
        "status": "Completed"
      }
    }
  }'
```

---

## Rate Limiting

**Last Updated:** 2025-11-12

### Current Implementation

- **No rate limiting** currently implemented
- **Future Enhancement**: Implement rate limiting per user/IP

### Recommended Limits (Future)

- **Queries**: 100 requests per minute per user
- **Mutations**: 50 requests per minute per user
- **Login**: 5 attempts per minute per IP

---

## Best Practices

**Last Updated:** 2025-11-12

### Query Optimization

1. **Request Only Needed Fields**: Don't request all fields if you only need a few
2. **Use Pagination**: Always use `limit` and `offset` for large datasets
3. **Leverage Field Resolvers**: Let the server fetch related data efficiently
4. **Batch Requests**: Use aliases to batch multiple queries in one request

### Example: Efficient Query

```graphql
# ✅ GOOD: Request only needed fields
query GetTasks {
  tasks(limit: 20) {
    taskId
    name
    status
    assignedToUsers {
      name
    }
  }
}

# ❌ BAD: Request all fields
query GetTasks {
  tasks {
    id
    taskId
    selectType
    recursiveType
    name
    description
    # ... all 30+ fields
  }
}
```

### Mutation Best Practices

1. **Validate Input**: Validate on client before sending
2. **Handle Errors**: Always check for errors in response
3. **Optimistic Updates**: Update UI optimistically, rollback on error
4. **Refetch Queries**: Refetch affected queries after mutation

### Authentication Best Practices

1. **Secure Storage**: Store JWT in secure storage (not localStorage for sensitive apps)
2. **Token Refresh**: Implement token refresh before expiration
3. **Logout**: Clear token on logout
4. **HTTPS Only**: Always use HTTPS in production

---

**For system requirements, see SRS.md**
**For architecture details, see ARCHITECTURE.md**
**For development guide, see DEVELOPER_GUIDE.md**
**For quick reference, see QUICK_REFERENCE.md**


