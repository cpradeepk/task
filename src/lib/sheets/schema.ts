// Server-side only - do not use 'use client'

import { User, Task, LeaveApplication, WFHApplication, Bug, BugComment } from '../types'
import { BaseSheetsService } from './base'

/**
 * Data transformation utilities for Google Sheets
 */

// User data transformations
export function userToSheetRow(user: User): any {
  return {
    Employee_ID: user.employeeId,
    Name: user.name,
    Email: user.email,
    Phone: user.phone,
    Telegram_Token: user.telegramToken || '',
    Department: user.department,
    Manager_Email: user.managerEmail || '',
    Manager_ID: user.managerId || '',
    Is_Today_Task: user.isTodayTask ? 'TRUE' : 'FALSE',
    Warning_Count: user.warningCount.toString(),
    Role: user.role,
    Password: user.password,
    Status: user.status,
    Hours_Log: user.hoursLog || '',
    Created_At: user.createdAt,
    Updated_At: user.updatedAt
  }
}

export function sheetRowToUser(row: any): User {
  return {
    employeeId: row.Employee_ID || '',
    name: row.Name || '',
    email: row.Email || '',
    phone: row.Phone || '',
    telegramToken: row.Telegram_Token || undefined,
    department: row.Department || '',
    managerEmail: row.Manager_Email || undefined,
    managerId: row.Manager_ID || undefined,
    isTodayTask: row.Is_Today_Task === 'TRUE',
    warningCount: parseInt(row.Warning_Count || '0'),
    role: row.Role || 'employee',
    password: row.Password || '',
    status: row.Status || 'active',
    hoursLog: row.Hours_Log || undefined,
    createdAt: row.Created_At || new Date().toISOString(),
    updatedAt: row.Updated_At || new Date().toISOString()
  }
}

// Task data transformations
export function taskToSheetRow(task: Task): any {
  return {
    ID: task.id,
    Task_ID: task.taskId,
    Select_Type: task.selectType,
    Recursive_Type: task.recursiveType || '',
    Description: task.description,
    Assigned_To: task.assignedTo,
    Assigned_By: task.assignedBy,
    Support: JSON.stringify(task.support || []),
    Start_Date: task.startDate,
    End_Date: task.endDate,
    Priority: task.priority,
    Estimated_Hours: (task.estimatedHours || 0).toString(),
    Actual_Hours: (task.actualHours || 0).toString(),
    Daily_Hours: task.dailyHours || '{}',
    Status: task.status,
    Remarks: task.remarks || '',
    Difficulties: task.difficulties || '',
    Sub_Task: task.subTask || '',
    Created_At: task.createdAt,
    Updated_At: task.updatedAt
  }
}

export function sheetRowToTask(row: any): Task {
  return {
    id: row.ID || '',
    taskId: row.Task_ID || '',
    selectType: row.Select_Type || 'Normal',
    recursiveType: row.Recursive_Type || undefined,
    description: row.Description || '',
    assignedTo: row.Assigned_To || '',
    assignedBy: row.Assigned_By || '',
    support: (() => {
      try {
        return JSON.parse(row.Support || '[]')
      } catch (error) {
        console.warn('Invalid Support JSON:', row.Support, 'Error:', error)
        return []
      }
    })(),
    startDate: row.Start_Date || '',
    endDate: row.End_Date || '',
    priority: row.Priority || 'NU&NI',
    estimatedHours: parseInt(row.Estimated_Hours || '0'),
    actualHours: parseInt(row.Actual_Hours || '0') || undefined,
    dailyHours: row.Daily_Hours || '{}',
    status: row.Status || 'Yet to Start',
    remarks: row.Remarks || undefined,
    difficulties: row.Difficulties || undefined,
    subTask: row.Sub_Task || undefined,

    createdAt: row.Created_At || new Date().toISOString(),
    updatedAt: row.Updated_At || new Date().toISOString()
  }
}

// Leave Application data transformations
export function leaveToSheetRow(leave: LeaveApplication): any {
  return {
    ID: leave.id,
    Employee_ID: leave.employeeId,
    Employee_Name: leave.employeeName,
    Leave_Type: leave.leaveType,
    Reason: leave.reason,
    From_Date: leave.fromDate,
    To_Date: leave.toDate,
    Is_Half_Day: leave.isHalfDay ? 'TRUE' : 'FALSE',
    Emergency_Contact: leave.emergencyContact || '',
    Status: leave.status,
    Manager_ID: leave.managerId || '',
    Approved_By: leave.approvedBy || '',
    Approval_Date: leave.approvalDate || '',
    Approval_Remarks: leave.approvalRemarks || '',
    Created_At: leave.createdAt,
    Updated_At: leave.updatedAt
  }
}

export function sheetRowToLeave(row: any): LeaveApplication {
  return {
    id: row.ID || '',
    employeeId: row.Employee_ID || '',
    employeeName: row.Employee_Name || '',
    leaveType: row.Leave_Type || 'Casual Leave',
    reason: row.Reason || '',
    fromDate: row.From_Date || '',
    toDate: row.To_Date || '',
    isHalfDay: row.Is_Half_Day === 'TRUE',
    emergencyContact: row.Emergency_Contact || undefined,
    status: row.Status || 'Pending',
    managerId: row.Manager_ID || undefined,
    approvedBy: row.Approved_By || undefined,
    approvalDate: row.Approval_Date || undefined,
    approvalRemarks: row.Approval_Remarks || undefined,
    createdAt: row.Created_At || new Date().toISOString(),
    updatedAt: row.Updated_At || new Date().toISOString()
  }
}

// WFH Application data transformations
export function wfhToSheetRow(wfh: WFHApplication): any {
  return {
    ID: wfh.id,
    Employee_ID: wfh.employeeId,
    Employee_Name: wfh.employeeName,
    WFH_Type: wfh.wfhType,
    Reason: wfh.reason,
    From_Date: wfh.fromDate,
    To_Date: wfh.toDate,
    Work_Location: wfh.workLocation,
    Available_From: wfh.availableFrom || '',
    Available_To: wfh.availableTo || '',
    Contact_Number: wfh.contactNumber,
    Status: wfh.status,
    Manager_ID: wfh.managerId || '',
    Approved_By: wfh.approvedBy || '',
    Approval_Date: wfh.approvalDate || '',
    Approval_Remarks: wfh.approvalRemarks || '',
    Created_At: wfh.createdAt,
    Updated_At: wfh.updatedAt
  }
}

export function sheetRowToWfh(row: any): WFHApplication {
  return {
    id: row.ID || '',
    employeeId: row.Employee_ID || '',
    employeeName: row.Employee_Name || '',
    wfhType: row.WFH_Type || 'Full Day',
    reason: row.Reason || '',
    fromDate: row.From_Date || '',
    toDate: row.To_Date || '',
    workLocation: row.Work_Location || '',
    availableFrom: row.Available_From || undefined,
    availableTo: row.Available_To || undefined,
    contactNumber: row.Contact_Number || '',
    status: row.Status || 'Pending',
    managerId: row.Manager_ID || undefined,
    approvedBy: row.Approved_By || undefined,
    approvalDate: row.Approval_Date || undefined,
    approvalRemarks: row.Approval_Remarks || undefined,
    createdAt: row.Created_At || new Date().toISOString(),
    updatedAt: row.Updated_At || new Date().toISOString()
  }
}

/**
 * Schema initialization service
 */
export class SchemaInitializer {
  private services: BaseSheetsService[]

  constructor() {
    this.services = [
      new BaseSheetsService('USER_DETAILS'),
      new BaseSheetsService('JSR'),
      new BaseSheetsService('LEAVE_APPLICATIONS'),
      new BaseSheetsService('WFH_APPLICATIONS'),
      new BaseSheetsService('BUG_TRACKING'),
      new BaseSheetsService('BUG_COMMENTS')
    ]
  }

  /**
   * Initialize all sheets with proper headers
   */
  async initializeAllSheets(): Promise<boolean> {
    try {
      console.log('Initializing Google Sheets schema...')
      
      for (const service of this.services) {
        const success = await service.initializeSheet()
        if (!success) {
          console.error(`Failed to initialize sheet: ${service['sheetName']}`)
          return false
        }
      }
      
      console.log('All sheets initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize sheets schema:', error)
      return false
    }
  }

  /**
   * Validate sheet structure
   */
  async validateSchema(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    
    try {
      for (const service of this.services) {
        // This would check if headers match expected structure
        // Implementation depends on specific validation requirements
      }
      
      return { valid: errors.length === 0, errors }
    } catch (error) {
      errors.push(`Schema validation failed: ${error}`)
      return { valid: false, errors }
    }
  }
}

// Bug data transformations
export function bugToSheetRow(bug: Bug): any {
  return {
    Bug_ID: bug.bugId,
    Title: bug.title,
    Description: bug.description,
    Severity: bug.severity,
    Priority: bug.priority,
    Status: bug.status,
    Category: bug.category,
    Platform: bug.platform,
    Assigned_To: bug.assignedTo || '',
    Assigned_By: bug.assignedBy || '',
    Reported_By: bug.reportedBy,
    Environment: bug.environment,
    Browser_Info: bug.browserInfo || '',
    Device_Info: bug.deviceInfo || '',
    Steps_To_Reproduce: bug.stepsToReproduce || '',
    Expected_Behavior: bug.expectedBehavior || '',
    Actual_Behavior: bug.actualBehavior || '',
    Attachments: bug.attachments || '',
    Estimated_Hours: bug.estimatedHours?.toString() || '',
    Actual_Hours: bug.actualHours?.toString() || '',
    Resolved_Date: bug.resolvedDate || '',
    Closed_Date: bug.closedDate || '',
    Reopened_Count: bug.reopenedCount.toString(),
    Tags: bug.tags || '',
    Related_Bugs: bug.relatedBugs || '',
    Created_At: bug.createdAt,
    Updated_At: bug.updatedAt
  }
}

export function sheetRowToBug(row: any): Bug {
  return {
    bugId: row.Bug_ID || '',
    title: row.Title || '',
    description: row.Description || '',
    severity: row.Severity || 'Minor',
    priority: row.Priority || 'Low',
    status: row.Status || 'New',
    category: row.Category || 'Other',
    platform: row.Platform || 'Web',
    assignedTo: row.Assigned_To || undefined,
    assignedBy: row.Assigned_By || undefined,
    reportedBy: row.Reported_By || '',
    environment: row.Environment || 'Production',
    browserInfo: row.Browser_Info || undefined,
    deviceInfo: row.Device_Info || undefined,
    stepsToReproduce: row.Steps_To_Reproduce || undefined,
    expectedBehavior: row.Expected_Behavior || undefined,
    actualBehavior: row.Actual_Behavior || undefined,
    attachments: row.Attachments || undefined,
    estimatedHours: row.Estimated_Hours ? parseFloat(row.Estimated_Hours) : undefined,
    actualHours: row.Actual_Hours ? parseFloat(row.Actual_Hours) : undefined,
    resolvedDate: row.Resolved_Date || undefined,
    closedDate: row.Closed_Date || undefined,
    reopenedCount: parseInt(row.Reopened_Count || '0'),
    tags: row.Tags || undefined,
    relatedBugs: row.Related_Bugs || undefined,
    createdAt: row.Created_At || new Date().toISOString(),
    updatedAt: row.Updated_At || new Date().toISOString()
  }
}

// Bug comment data transformations
export function bugCommentToSheetRow(comment: BugComment): any {
  return {
    Bug_ID: comment.bugId,
    Commented_By: comment.commentedBy,
    Comment_Text: comment.commentText,
    Timestamp: comment.timestamp
  }
}

export function sheetRowToBugComment(row: any): BugComment {
  return {
    bugId: row.Bug_ID || '',
    commentedBy: row.Commented_By || '',
    commentText: row.Comment_Text || '',
    timestamp: row.Timestamp || new Date().toISOString()
  }
}
