/**
 * TypeScript Type Definitions for JSR Task Management System
 *
 * This file contains all the TypeScript interfaces and types used throughout the application.
 * These types ensure type safety and provide excellent IDE autocomplete support.
 *
 * Key Benefits of TypeScript Types:
 * - Catch errors at compile time instead of runtime
 * - Better IDE autocomplete and IntelliSense
 * - Self-documenting code (types serve as documentation)
 * - Safer refactoring (TypeScript will warn about breaking changes)
 * - Better team collaboration (clear contracts between modules)
 */

// ============================================================================
// USER AND AUTHENTICATION TYPES
// ============================================================================

/**
 * User Interface
 *
 * Represents a user/employee in the system.
 * Users can be employees, managers, top management, or admins.
 *
 * Role Hierarchy:
 * - employee: Regular employee (can manage own tasks)
 * - management: Manager (can manage team tasks)
 * - top_management: Senior management (can view all reports)
 * - admin: System administrator (full access)
 */
export interface User {
  employeeId: string        // Unique employee ID (e.g., "AM-0001")
  name: string              // Full name of the employee
  email: string             // Email address (used for login and notifications)
  phone: string             // Phone number
  telegramToken?: string    // Optional: Telegram bot token for notifications
  department: string        // Department name (e.g., "Engineering", "Sales")
  managerEmail?: string     // Optional: Manager's email address
  managerId?: string        // Optional: Manager's employee ID
  isTodayTask: boolean      // Whether user has tasks for today
  warningCount: number      // Number of warnings received (for performance tracking)
  role: 'amtarikshian' | 'management' | 'top_management' | 'admin'  // User role (determines permissions)
  password: string          // Hashed password (never store plain text!)
  status: 'active' | 'inactive'  // Account status
  isSystemAdmin?: number    // Optional: 1 if user is system admin (cannot be deleted/deactivated), 0 or undefined otherwise
  hoursLog?: string         // Optional: Hours worked log (format: 'DD/MM/YYYY - X Hours worked today')
  idCardPhoto?: string      // Optional: AWS S3 URL for employee ID card photo
  createdAt: string         // Timestamp when user was created
  updatedAt: string         // Timestamp when user was last updated
}

// ============================================================================
// TASK TYPES
// ============================================================================

/**
 * Task Interface
 *
 * Represents a task in the system.
 * Tasks can be normal (one-time) or recursive (repeating).
 *
 * Task Priority System (Eisenhower Matrix):
 * - U&I: Urgent & Important (do first)
 * - NU&I: Not Urgent & Important (schedule)
 * - U&NI: Urgent & Not Important (delegate)
 * - NU&NI: Not Urgent & Not Important (eliminate)
 *
 * Task Status Flow:
 * Yet to Start → In Progress → Done
 *             ↓
 *          Delayed → In Progress → Done
 *             ↓
 *          Hold → In Progress → Done
 *             ↓
 *          Cancel (terminal state)
 */
export interface Task {
  id: string                // Internal database ID (auto-increment)
  taskId: string            // Unique task ID (e.g., "JSR-0016")
  selectType: 'Normal' | 'Recursive'  // Normal = one-time, Recursive = repeating
  recursiveType?: 'Daily' | 'Weekly' | 'Monthly' | 'Annually'  // Only for recursive tasks
  name: string              // Task name/title (short, for list display) - VARCHAR(150)
  description: string       // Task description/details (full details)
  assignedTo: string[]      // Array of employee IDs who are assigned to this task (multiple assignees supported)
  assignedBy: string        // Employee ID of task creator (who assigned the task)
  support: string[]         // Array of employee IDs who can help with this task
  startDate: string         // Task start date (ISO format: YYYY-MM-DD)
  endDate: string           // Task end date (ISO format: YYYY-MM-DD)
  priority: 'U&I' | 'NU&I' | 'U&NI' | 'NU&NI'  // Priority based on Eisenhower Matrix
  estimatedHours: number    // Estimated time to complete (in hours)
  actualHours?: number      // Optional: Actual time spent (in hours)
  dailyHours?: string       // Optional: JSON string of daily hours (e.g., '{"2025-06-27": 3.5}')
  status: 'Yet to Start' | 'In Progress' | 'Delayed' | 'Done' | 'Cancel' | 'Hold' | 'ReOpened' | 'Stop'
  remarks?: string          // Optional: Additional notes/comments
  difficulties?: string     // Optional: Challenges faced during task execution
  relatedTasks?: string | null // Optional: Comma-separated task IDs for multi-user assignments
  projectId?: string | null // Optional: Project ID this task belongs to (e.g., "PRJ-001")
  subprojectId?: string | null // Optional: Subproject ID this task belongs to (e.g., "PRJ-001-SUB-001")
  parentTaskId?: string | null // Optional: Parent task ID for subtasks (e.g., "JSR-0001")
  department?: string | null // Optional: Department this task belongs to (e.g., "Marketing", "Development")
  timerState?: string | null // Optional: Timer state (JSON string)
  deletedAt?: string | null // Optional: Soft delete timestamp
  deletedBy?: string | null // Optional: Employee ID who deleted the task
  createdAt: string         // Timestamp when task was created
  updatedAt: string         // Timestamp when task was last updated
}

/**
 * SubTask Interface
 *
 * Represents a subtask within a parent task.
 * Subtasks are smaller, actionable items that make up a larger task.
 * Each subtask can be assigned to different users and tracked independently.
 *
 * Features:
 * - Checkbox-based completion tracking
 * - Individual assignment (can differ from parent task)
 * - Drag-and-drop reordering via display_order
 * - Soft delete support
 * - Independent status tracking
 */
export interface SubTask {
  id: number                // Database ID (auto-increment)
  parentTaskId: string      // Parent task ID (e.g., "JSR-001")
  description: string       // Subtask description
  assignedTo: string        // Employee ID of subtask owner
  status: 'Not Started' | 'In Progress' | 'Completed'  // Subtask status
  isCompleted: boolean      // Checkbox state (true = checked)
  displayOrder: number      // Order for display (0, 1, 2, ...) - allows drag-and-drop
  createdAt: string         // Timestamp when subtask was created
  updatedAt: string         // Timestamp when subtask was last updated
  createdBy: string         // Employee ID who created the subtask
  deletedAt?: string | null // Optional: Soft delete timestamp
  deletedBy?: string | null // Optional: Employee ID who deleted the subtask
}



// Leave Application Types
export interface LeaveApplication {
  id: string
  employeeId: string
  employeeName: string
  leaveType: 'Sick Leave' | 'Casual Leave' | 'Annual Leave' | 'Emergency Leave' | 'Maternity Leave' | 'Paternity Leave'
  reason: string
  fromDate: string
  toDate: string
  isHalfDay: boolean
  emergencyContact?: string
  status: 'Pending' | 'Approved' | 'Rejected'
  managerId?: string // Manager who needs to approve this
  approvedBy?: string
  approvalDate?: string
  approvalRemarks?: string
  createdAt: string
  updatedAt: string
}

// Work From Home Application Types
export interface WFHApplication {
  id: string
  employeeId: string
  employeeName: string
  wfhType: 'Full Day' | 'Half Day' | 'Flexible Hours'
  reason: string
  fromDate: string
  toDate: string
  workLocation: string
  availableFrom?: string
  availableTo?: string
  contactNumber: string
  status: 'Pending' | 'Approved' | 'Rejected'
  managerId?: string // Manager who needs to approve this
  approvedBy?: string
  approvalDate?: string
  approvalRemarks?: string
  createdAt: string
  updatedAt: string
}

// Report Types
export interface DailyReport {
  date: string
  employeeId: string
  employeeName: string
  totalTasks: number
  tasksInProgress: number
  tasksDelayed: number
  tasksCompleted: number
  hoursWorked: number
  tasksCompletedMTD: number
  hoursMTD: number
}

export interface MonthlyReport {
  month: string
  year: number
  employeeId: string
  employeeName: string
  totalLeaves: number
  totalWFH: number
  totalHoursWorked: number
  warningCount: number
}

export interface TeamTaskReport {
  date: string
  managerId: string
  teamTasks: {
    employeeId: string
    employeeName: string
    tasks: Task[]
  }[]
}

// ============================================================================
// BUG TRACKING TYPES
// ============================================================================

/**
 * Bug Interface
 *
 * Represents a bug/issue in the bug tracking system.
 *
 * Severity Levels:
 * - Critical: System crash, data loss, security breach (fix immediately)
 * - Major: Major functionality broken, workaround exists (fix soon)
 * - Minor: Minor issue, cosmetic problem (fix when possible)
 *
 * Priority Levels:
 * - High: Fix in current sprint
 * - Medium: Fix in next sprint
 * - Low: Fix when time permits
 *
 * Status Flow:
 * New → In Progress → Resolved → Closed
 *    ↓
 * Reopened → In Progress → Resolved → Closed
 */
export interface Bug {
  bugId: string             // Unique bug ID (e.g., "DEV-0001", "FT-DEV-0001" for features)
  title: string             // Bug title/summary
  description: string       // Detailed bug description (or "Feature Description" for feature-type bugs)
  severity: 'Critical' | 'Major' | 'Minor'  // How serious is the bug?
  priority: 'High' | 'Medium' | 'Low'       // How urgent is the fix?
  status: 'New' | 'In Progress' | 'Resolved' | 'Closed' | 'Reopened'  // Current bug status
  category: 'UI' | 'API' | 'Backend' | 'Performance' | 'Security' | 'Database' | 'Integration' | 'Other'
  platform: 'iOS' | 'Android' | 'Web' | 'All'  // Which platform is affected?
  assignedTo?: string       // Optional: Employee ID of person fixing the bug
  assignedBy?: string       // Optional: Employee ID of person who assigned the bug
  reportedBy: string        // Required: Employee ID of person who reported the bug
  environment: 'Development' | 'Staging' | 'Production'  // Where was the bug found?
  browserInfo?: string      // Optional: Browser details (e.g., "Chrome 120.0.0")
  deviceInfo?: string       // Optional: Device details (e.g., "iPhone 15 Pro, iOS 17.2")
  stepsToReproduce?: string // Optional: How to reproduce the bug (or "Feature Description" for feature-type bugs)
  expectedBehavior?: string // Optional: What should happen
  actualBehavior?: string   // Optional: What actually happens (hidden for feature-type bugs)
  serverLogs?: string       // Optional: Server logs (hidden for feature-type bugs)
  frontendLogs?: string     // Optional: Frontend logs (hidden for feature-type bugs)
  attachments?: string      // Optional: URL or file path to screenshots/videos
  estimatedHours?: number   // Optional: Estimated time to fix (in hours)
  actualHours?: number      // Optional: Actual time spent fixing (in hours)
  resolvedDate?: string     // Optional: When bug was resolved
  closedDate?: string       // Optional: When bug was closed
  reopenedCount: number     // Number of times bug was reopened (default: 0)
  tags?: string             // Optional: Comma-separated tags (e.g., "login,authentication")
  relatedBugs?: string      // Optional: Comma-separated related bug IDs
  projectId?: string | null // Optional: Project ID this bug belongs to (e.g., "PRJ-001")
  subprojectId?: string | null // Optional: Subproject ID this bug belongs to
  feature?: string | null   // Optional: Feature name this bug is related to
  type?: 'testcase' | 'feature' | null  // Optional: Bug type categorization (feature shows FT- prefix)
  parentDevId?: string | null // Optional: Parent development ID for sub-bugs
  timerState?: string | null // Optional: Timer state (JSON string)
  timerStartTime?: string | null // Optional: Timer start timestamp
  timerPausedTime?: number | null // Optional: Timer paused time in seconds
  timerTotalTime?: number | null // Optional: Timer total time in seconds
  timerSessions?: string | null // Optional: Timer sessions (JSON string)
  deletedAt?: string | null // Optional: Soft delete timestamp
  deletedBy?: string | null // Optional: Employee ID who deleted the bug
  createdAt: string         // Timestamp when bug was created
  updatedAt: string         // Timestamp when bug was last updated
}

/**
 * BugSubTask Interface
 *
 * Represents a subtask within a parent bug.
 * Similar to task subtasks but for bugs.
 */
export interface BugSubTask {
  id: number                // Database ID (auto-increment)
  subTaskId: string         // Unique subtask ID
  parentBugId: string       // Parent bug ID (e.g., "DEV-001")
  description: string       // Subtask description
  assignedTo?: string | null // Optional: Employee ID of subtask owner
  assignedBy?: string | null // Optional: Employee ID who assigned the subtask
  startDate?: string | null // Optional: Subtask start date
  endDate?: string | null   // Optional: Subtask end date
  priority?: string | null  // Optional: Subtask priority
  estimatedHours?: number | null // Optional: Estimated time (in hours)
  actualHours?: number | null // Optional: Actual time spent (in hours)
  status: 'Not Started' | 'In Progress' | 'Completed'  // Subtask status
  remarks?: string | null   // Optional: Additional notes
  isCompleted: boolean      // Checkbox state (true = checked)
  displayOrder: number      // Order for display (0, 1, 2, ...) - allows drag-and-drop
  createdAt: string         // Timestamp when subtask was created
  updatedAt: string         // Timestamp when subtask was last updated
  createdBy: string         // Employee ID who created the subtask
  deletedAt?: string | null // Optional: Soft delete timestamp
  deletedBy?: string | null // Optional: Employee ID who deleted the subtask
}

export interface BugComment {
  bugId: string
  commentedBy: string // Employee ID
  commentText: string
  timestamp: string
}

// Bug form data interface
export interface BugFormData {
  title: string
  description: string
  severity: Bug['severity']
  priority: Bug['priority']
  category: Bug['category']
  platform: Bug['platform']
  assignedTo?: string
  environment: Bug['environment']
  browserInfo?: string
  deviceInfo?: string
  stepsToReproduce?: string
  expectedBehavior?: string
  actualBehavior?: string
  attachments?: string
  estimatedHours?: number
  tags?: string
  relatedBugs?: string
  projectId?: string | null
  feature?: string | null
  type?: 'testcase' | 'feature' | 'other' | null
}

// ============================================================================
// PROJECT MANAGEMENT TYPES
// ============================================================================

/**
 * Project Interface
 *
 * Represents a project or sub-project in the system.
 * Projects can have a 2-level hierarchy: Main Project → Sub-Project
 *
 * Project Status:
 * - Active: Currently active project
 * - Inactive: Temporarily inactive project
 * - Deleted: Soft-deleted project (visible only to admin)
 *
 * Hierarchy Rules:
 * - Main projects have parent_project_id = NULL
 * - Sub-projects have parent_project_id = parent's project_id
 * - Sub-projects CANNOT have sub-projects (2-level max)
 */
export interface Project {
  projectId: string         // Unique project ID (e.g., "PRJ-001", "PRJ-002")
  projectName: string       // Project name (displayed in UI, e.g., "JSR Task Management System")
  parentProjectId?: string | null  // Parent project ID for sub-projects (NULL for main projects)
  description?: string | null      // Project description
  status: 'Active' | 'Inactive' | 'Deleted'  // Project status
  createdBy: string         // Employee ID of creator
  createdAt: string         // Timestamp when project was created
  updatedAt: string         // Timestamp when project was last updated
  deletedAt?: string | null // Timestamp when project was soft-deleted
  deletedBy?: string | null // Employee ID of who deleted the project
}

// ============================================================================
// UNIFIED WORK ITEMS (for Dashboard)
// ============================================================================

/**
 * WorkItem Interface
 *
 * Unified interface for displaying both tasks and bugs in the dashboard.
 * This allows the dashboard to show a mixed list of work items with
 * consistent structure and easy filtering.
 */
export interface WorkItem {
  id: string                // bugId or taskId
  type: 'task' | 'bug'      // Type of work item
  title: string             // description for tasks, title for bugs
  status: string            // Task status or Bug status
  priority: string          // Task priority or Bug priority
  assignedTo: string        // Employee ID of assignee
  dueDate: string           // endDate for tasks, createdAt for bugs
  projectId?: string | null // Project ID if assigned
  projectName?: string | null  // Project name for display
  severity?: string         // Only for bugs
  createdAt: string         // Creation timestamp
}

// ============================================================================
// FEED SYSTEM TYPES
// ============================================================================

/**
 * FeedTopic Interface
 *
 * Represents a topic/category in the feed system.
 * Topics can be public (visible to all) or personal (visible only to owner).
 *
 * Special Topics:
 * - Personal Notes: isPersonal=true, ownerUserId=user's employeeId
 * - Saved Posts: isSaved=true, ownerUserId=user's employeeId
 */
export interface FeedTopic {
  id: string                // Topic ID (database auto-increment)
  topicName: string         // Topic name (e.g., "Latest Technologies", "AI")
  description?: string | null // Optional: Topic description
  icon?: string | null      // Optional: Emoji or Lucide icon name
  displayOrder: number      // Order for display (0, 1, 2, ...)
  isPersonal: boolean       // true for Personal Notes topics
  isSaved: boolean          // true for Saved Posts topics
  ownerUserId?: string | null // NULL for public topics, employeeId for personal/saved
  createdBy: string         // Employee ID of creator
  createdAt: string         // Timestamp when topic was created
  postCount?: number        // Optional: Number of posts in this topic
}

/**
 * FeedPost Interface
 *
 * Represents a post in the feed system.
 * Posts can contain text, links, PDFs, YouTube videos, images, or videos.
 *
 * Content Types:
 * - text: Plain text post
 * - link: External link with Open Graph preview
 * - pdf: PDF file uploaded to S3
 * - youtube: YouTube video embed
 * - image: Image uploaded to S3
 * - video: Video uploaded to S3
 */
export interface FeedPost {
  postId: string            // Unique post ID (e.g., "POST-1735123456789-abc123")
  contentType: 'text' | 'link' | 'pdf' | 'youtube' | 'image' | 'video'
  content: string           // Post content (text, URL, or S3 URL)
  linkUrl?: string | null   // Optional: External link URL
  linkTitle?: string | null // Optional: Open Graph title
  linkDescription?: string | null // Optional: Open Graph description
  linkImage?: string | null // Optional: Open Graph image URL
  mediaUrls?: string[] | null // Optional: Array of media URLs (for multiple images/videos)
  createdBy: string         // Employee ID of post author
  createdAt: string         // Timestamp when post was created
  updatedAt?: string | null // Optional: Timestamp when post was last updated
  status: 'published' | 'pending' | 'rejected' // Post status
  author?: User             // Optional: Author user object (populated via GraphQL)
  topics?: FeedTopic[]      // Optional: Array of topics this post belongs to
  reactions?: FeedReaction[] // Optional: Array of reactions on this post
  comments?: FeedComment[]  // Optional: Array of comments on this post
  viewCount?: number        // Optional: Number of views
  commentCount?: number     // Optional: Number of comments
  isSaved?: boolean         // Optional: Whether current user has saved this post
  hasUserReacted?: boolean  // Optional: Whether current user has reacted to this post
}

/**
 * FeedComment Interface
 *
 * Represents a comment on a feed post.
 * Comments can be top-level or replies to other comments (max 2 levels).
 */
export interface FeedComment {
  commentId: string         // Unique comment ID (e.g., "COMMENT-1735123456789-abc123")
  postId: string            // Post ID this comment belongs to
  parentCommentId?: string | null // Optional: Parent comment ID for replies
  content: string           // Comment text content
  createdBy: string         // Employee ID of comment author
  createdAt: string         // Timestamp when comment was created
  updatedAt?: string | null // Optional: Timestamp when comment was last updated
  author?: User             // Optional: Author user object (populated via GraphQL)
  replies?: FeedComment[]   // Optional: Array of reply comments
}

/**
 * FeedReaction Interface
 *
 * Represents a reaction (emoji) on a feed post.
 * Multiple users can react with the same emoji.
 */
export interface FeedReaction {
  emoji: string             // Emoji character (e.g., "👍", "❤️", "🎉")
  users?: User[]            // Optional: Array of users who reacted with this emoji
  count: number             // Number of users who reacted with this emoji
  hasUserReacted?: boolean  // Optional: Whether current user has reacted with this emoji
}

/**
 * FeedMention Interface
 *
 * Represents a mention of a user in a post or comment.
 * Mentions trigger notifications to the mentioned user.
 */
export interface FeedMention {
  mentionId: string         // Unique mention ID
  postId?: string | null    // Optional: Post ID where mention occurred
  commentId?: string | null // Optional: Comment ID where mention occurred
  mentionedUserId: string   // Employee ID of mentioned user
  mentionedByUserId: string // Employee ID of user who mentioned
  mentionText: string       // Mention text (e.g., "@john-doe")
  contextText?: string | null // Optional: Surrounding text for context
  isRead: boolean           // Whether mention has been read
  createdAt: string         // Timestamp when mention was created
  mentionedUser?: User      // Optional: Mentioned user object
  mentionedByUser?: User    // Optional: User who mentioned object
  post?: FeedPost           // Optional: Post object
  comment?: FeedComment     // Optional: Comment object
}

/**
 * FeedNotification Interface
 *
 * Represents a notification in the feed system.
 * Notifications are triggered by mentions, comments, reactions, etc.
 *
 * Notification Types:
 * - mention: User was mentioned in a post or comment
 * - comment: Someone commented on user's post
 * - reaction: Someone reacted to user's post
 * - reply: Someone replied to user's comment
 * - post_approved: User's post was approved
 * - post_rejected: User's post was rejected
 */
export interface FeedNotification {
  notificationId: string    // Unique notification ID
  userId: string            // Employee ID of notification recipient
  actorId: string           // Employee ID of user who triggered notification
  notificationType: 'mention' | 'comment' | 'reaction' | 'reply' | 'post_approved' | 'post_rejected'
  postId?: string | null    // Optional: Related post ID
  commentId?: string | null // Optional: Related comment ID
  mentionId?: string | null // Optional: Related mention ID
  title: string             // Notification title
  message?: string | null   // Optional: Notification message
  linkUrl?: string | null   // Optional: Link to related content
  metadata?: string | null  // Optional: JSON metadata
  isRead: boolean           // Whether notification has been read
  readAt?: string | null    // Optional: Timestamp when notification was read
  createdAt: string         // Timestamp when notification was created
  user?: User               // Optional: Recipient user object
  actor?: User              // Optional: Actor user object
  post?: FeedPost           // Optional: Related post object
  comment?: FeedComment     // Optional: Related comment object
  mention?: FeedMention     // Optional: Related mention object
}
