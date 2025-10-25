/**
 * HTML Email Templates Service
 * Uses the designed HTML template files and replaces placeholders with actual data
 */

import fs from 'fs'
import path from 'path'

// Template file paths
const TEMPLATES = {
  USER_CREDENTIALS: 'email-preview.html',
  TASK_CREATION: 'task-creation-email-preview.html',
  LEAVE_APPROVAL: 'leave-approval-email-preview.html',
  LEAVE_REJECTION: 'leave-rejection-email-preview.html',
  SUPPORT_ASSIGNMENT: 'support-assignment-email.html',
  BUG_ASSIGNMENT: 'bug-assignment-email.html',
  BUG_CREATION: 'bug-creation-email.html'
}

// Read template file from public directory
function readTemplate(templateName: string): string {
  try {
    // Templates are now in the public directory
    const templatePath = path.join(process.cwd(), 'public', TEMPLATES[templateName as keyof typeof TEMPLATES])
    console.log(`Reading template from: ${templatePath}`)

    // Check if file exists
    if (!fs.existsSync(templatePath)) {
      console.error(`Template file not found at: ${templatePath}`)
      throw new Error(`Template ${templateName} not found at ${templatePath}`)
    }

    return fs.readFileSync(templatePath, 'utf-8')
  } catch (error) {
    console.error(`Failed to read template ${templateName}:`, error)
    throw new Error(`Template ${templateName} not found: ${error}`)
  }
}

// Replace placeholders in template
function replacePlaceholders(template: string, data: Record<string, any>): string {
  let result = template
  
  // Replace all placeholders with actual data
  Object.keys(data).forEach(key => {
    const placeholder = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(placeholder, data[key] || '')
  })
  
  return result
}

// User Credentials Email Template
export function getUserCredentialsHtmlTemplate(data: {
  userName: string
  userEmail: string
  employeeId: string
  temporaryPassword: string
  department?: string
  role?: string
  manager?: string
  baseUrl?: string
}) {
  const template = readTemplate('USER_CREDENTIALS')
  
  const templateData = {
    userName: data.userName,
    userEmail: data.userEmail,
    employeeId: data.employeeId,
    temporaryPassword: data.temporaryPassword,
    department: data.department || 'Not specified',
    role: data.role || 'Employee',
    manager: data.manager || 'Not assigned',
    baseUrl: data.baseUrl || 'http://localhost:3000',
    currentYear: new Date().getFullYear()
  }
  
  return replacePlaceholders(template, templateData)
}

// Task Creation Email Template
export function getTaskCreationHtmlTemplate(data: {
  userName: string
  taskTitle: string
  taskDescription?: string
  priority: string
  dueDate?: string
  assignedTo?: string
  taskId?: string
  createdBy?: string
  baseUrl?: string
}) {
  const template = readTemplate('TASK_CREATION')
  
  const templateData = {
    userName: data.userName,
    taskTitle: data.taskTitle,
    taskDescription: data.taskDescription || 'No description provided',
    priority: data.priority,
    dueDate: data.dueDate || 'Not specified',
    assignedTo: data.assignedTo || 'Not assigned',
    taskId: data.taskId || 'N/A',
    createdBy: data.createdBy || 'System',
    baseUrl: data.baseUrl || 'http://localhost:3000',
    currentYear: new Date().getFullYear()
  }
  
  return replacePlaceholders(template, templateData)
}

// Leave Status Email Template
export function getLeaveStatusHtmlTemplate(data: {
  userName: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  status: 'approved' | 'rejected'
  reason?: string
  approvedBy: string
  comments?: string
  baseUrl?: string
}) {
  const templateName = data.status === 'approved' ? 'LEAVE_APPROVAL' : 'LEAVE_REJECTION'
  const template = readTemplate(templateName)
  
  const templateData = {
    userName: data.userName,
    leaveType: data.leaveType,
    startDate: data.startDate,
    endDate: data.endDate,
    days: data.days.toString(),
    status: data.status,
    reason: data.reason || 'Not specified',
    approvedBy: data.approvedBy,
    comments: data.comments || 'No additional comments',
    baseUrl: data.baseUrl || 'http://localhost:3000',
    currentYear: new Date().getFullYear()
  }
  
  return replacePlaceholders(template, templateData)
}

/**
 * Support Assignment Email Template
 *
 * Sends email to support team members when they are assigned to help with a task.
 *
 * @param data - Support assignment details
 * @returns HTML email template with support assignment information
 */
export function getSupportAssignmentHtmlTemplate(data: {
  supportMemberName: string
  mainTaskId: string
  mainTaskDescription: string
  priority: string
  dueDate: string
  assignedBy: string
  supportTaskId: string
  baseUrl?: string
}) {
  const template = readTemplate('SUPPORT_ASSIGNMENT')

  // Determine priority class for styling
  const priorityClass = data.priority.toLowerCase().includes('high') || data.priority.includes('U&I')
    ? 'high'
    : data.priority.toLowerCase().includes('low') || data.priority.includes('NU&NI')
    ? 'low'
    : 'medium'

  const templateData = {
    supportMemberName: data.supportMemberName,
    mainTaskId: data.mainTaskId,
    mainTaskDescription: data.mainTaskDescription,
    priority: data.priority,
    priorityClass: priorityClass,
    dueDate: data.dueDate,
    assignedBy: data.assignedBy,
    supportTaskId: data.supportTaskId,
    baseUrl: data.baseUrl || 'http://localhost:3000',
    currentYear: new Date().getFullYear()
  }

  return replacePlaceholders(template, templateData)
}

/**
 * Bug Assignment Email Template
 *
 * Sends email to developer when a bug is assigned to them.
 *
 * @param data - Bug assignment details
 * @returns HTML email template with bug assignment information
 */
export function getBugAssignmentHtmlTemplate(data: {
  assigneeName: string
  assignedByName: string
  bugId: string
  bugTitle: string
  bugDescription: string
  severity: string
  priority: string
  category: string
  platform: string
  environment: string
  baseUrl?: string
}) {
  const template = readTemplate('BUG_ASSIGNMENT')

  // Determine severity class for styling
  const severityClass = data.severity.toLowerCase()

  // Determine priority class for styling
  const priorityClass = data.priority.toLowerCase()

  const templateData = {
    assigneeName: data.assigneeName,
    assignedByName: data.assignedByName,
    bugId: data.bugId,
    bugTitle: data.bugTitle,
    bugDescription: data.bugDescription,
    severity: data.severity,
    severityClass: severityClass,
    priority: data.priority,
    priorityClass: priorityClass,
    category: data.category,
    platform: data.platform,
    environment: data.environment,
    baseUrl: data.baseUrl || 'http://localhost:3000',
    currentYear: new Date().getFullYear()
  }

  return replacePlaceholders(template, templateData)
}

/**
 * Bug Creation Email Template
 *
 * Sends confirmation email to bug reporter when a new bug is created.
 *
 * @param data - Bug creation details
 * @returns HTML email template with bug creation confirmation
 */
export function getBugCreationHtmlTemplate(data: {
  reporterName: string
  bugId: string
  bugTitle: string
  bugDescription: string
  status: string
  severity: string
  priority: string
  category: string
  platform: string
  environment: string
  baseUrl?: string
}) {
  const template = readTemplate('BUG_CREATION')

  // Determine severity class for styling
  const severityClass = data.severity.toLowerCase()

  // Determine priority class for styling
  const priorityClass = data.priority.toLowerCase()

  const templateData = {
    reporterName: data.reporterName,
    bugId: data.bugId,
    bugTitle: data.bugTitle,
    bugDescription: data.bugDescription,
    status: data.status,
    severity: data.severity,
    severityClass: severityClass,
    priority: data.priority,
    priorityClass: priorityClass,
    category: data.category,
    platform: data.platform,
    environment: data.environment,
    baseUrl: data.baseUrl || 'http://localhost:3000',
    currentYear: new Date().getFullYear()
  }

  return replacePlaceholders(template, templateData)
}
