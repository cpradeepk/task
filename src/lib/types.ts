// User and Authentication Types
export interface User {
  employeeId: string
  name: string
  email: string
  phone: string
  telegramToken?: string
  department: string
  managerEmail?: string
  managerId?: string // Manager's employee ID
  isTodayTask: boolean
  warningCount: number
  role: 'employee' | 'management' | 'top_management' | 'admin'
  password: string
  status: 'active' | 'inactive'
  hoursLog?: string // Hours worked log in format: 'DD/MM/YYYY - X Hours worked today'
  createdAt: string
  updatedAt: string
}

// Task Types
export interface Task {
  id: string
  taskId: string
  selectType: 'Normal' | 'Recursive'
  recursiveType?: 'Daily' | 'Weekly' | 'Monthly' | 'Annually'
  description: string
  assignedTo: string // The logged-in user who created/owns the task
  assignedBy: string
  support: string[] // Array of employee IDs who can support this task
  startDate: string
  endDate: string
  priority: 'U&I' | 'NU&I' | 'U&NI' | 'NU&NI'
  estimatedHours: number
  actualHours?: number
  dailyHours?: string // JSON string storing date-specific hours: {"2025-06-27": 3.5, "2025-06-28": 2.0}
  status: 'Yet to Start' | 'In Progress' | 'Delayed' | 'Done' | 'Cancel' | 'Hold' | 'ReOpened' | 'Stop'
  remarks?: string
  difficulties?: string
  subTask?: string
  createdAt: string
  updatedAt: string

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

// Bug Tracking Types
export interface Bug {
  bugId: string
  title: string
  description: string
  severity: 'Critical' | 'Major' | 'Minor'
  priority: 'High' | 'Medium' | 'Low'
  status: 'New' | 'In Progress' | 'Resolved' | 'Closed' | 'Reopened'
  category: 'UI' | 'API' | 'Backend' | 'Performance' | 'Security' | 'Database' | 'Integration' | 'Other'
  platform: 'iOS' | 'Android' | 'Web' | 'All'
  assignedTo?: string // Employee ID
  assignedBy?: string // Employee ID
  reportedBy: string // Employee ID
  environment: 'Development' | 'Staging' | 'Production'
  browserInfo?: string
  deviceInfo?: string
  stepsToReproduce?: string
  expectedBehavior?: string
  actualBehavior?: string
  attachments?: string // URL or file path
  estimatedHours?: number
  actualHours?: number
  resolvedDate?: string
  closedDate?: string
  reopenedCount: number
  tags?: string // Comma-separated tags
  relatedBugs?: string // Comma-separated Bug IDs
  createdAt: string
  updatedAt: string
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
