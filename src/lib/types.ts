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
  role: 'employee' | 'management' | 'top_management' | 'admin'  // User role (determines permissions)
  password: string          // Hashed password (never store plain text!)
  status: 'active' | 'inactive'  // Account status
  hoursLog?: string         // Optional: Hours worked log (format: 'DD/MM/YYYY - X Hours worked today')
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
  taskId: string            // Unique task ID (e.g., "JSR-1735123456789001234")
  selectType: 'Normal' | 'Recursive'  // Normal = one-time, Recursive = repeating
  recursiveType?: 'Daily' | 'Weekly' | 'Monthly' | 'Annually'  // Only for recursive tasks
  description: string       // Task description/details
  assignedTo: string        // Employee ID of task owner (who will do the task)
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
  subTask?: string          // Optional: Sub-task details or breakdown
  createdAt: string         // Timestamp when task was created
  updatedAt: string         // Timestamp when task was last updated
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
  bugId: string             // Unique bug ID (e.g., "BUG-1735123456789001234")
  title: string             // Bug title/summary
  description: string       // Detailed bug description
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
  stepsToReproduce?: string // Optional: How to reproduce the bug
  expectedBehavior?: string // Optional: What should happen
  actualBehavior?: string   // Optional: What actually happens
  attachments?: string      // Optional: URL or file path to screenshots/videos
  estimatedHours?: number   // Optional: Estimated time to fix (in hours)
  actualHours?: number      // Optional: Actual time spent fixing (in hours)
  resolvedDate?: string     // Optional: When bug was resolved
  closedDate?: string       // Optional: When bug was closed
  reopenedCount: number     // Number of times bug was reopened (default: 0)
  tags?: string             // Optional: Comma-separated tags (e.g., "login,authentication")
  relatedBugs?: string      // Optional: Comma-separated related bug IDs
  createdAt: string         // Timestamp when bug was created
  updatedAt: string         // Timestamp when bug was last updated
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
}
