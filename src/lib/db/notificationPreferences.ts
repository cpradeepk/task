/**
 * Database operations for user notification preferences
 */

import { query } from './config'

export interface NotificationPreferences {
  id: number
  employeeId: string
  
  // Notification Channels
  emailEnabled: boolean
  telegramEnabled: boolean
  inAppEnabled: boolean
  
  // Task Notifications
  taskAssigned: boolean
  taskUpdated: boolean
  taskCommented: boolean
  taskDueSoon: boolean
  taskOverdue: boolean
  taskCompleted: boolean
  taskSupportAssigned: boolean
  
  // Bug Notifications
  bugAssigned: boolean
  bugUpdated: boolean
  bugCommented: boolean
  bugStatusChanged: boolean
  bugSeverityChanged: boolean
  
  // Leave & WFH Notifications
  leaveApproved: boolean
  leaveRejected: boolean
  leavePendingApproval: boolean
  wfhApproved: boolean
  wfhRejected: boolean
  wfhPendingApproval: boolean
  
  // Project Notifications
  projectAssigned: boolean
  projectUpdated: boolean
  
  // Team Notifications
  teamMemberAdded: boolean
  teamTaskCreated: boolean
  
  // System Notifications
  systemAnnouncements: boolean
  dailySummary: boolean
  weeklySummary: boolean
  
  // Quiet Hours
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  
  createdAt: string
  updatedAt: string
}

interface NotificationPreferencesRow {
  id: number
  employee_id: string
  email_enabled: number
  telegram_enabled: number
  in_app_enabled: number
  task_assigned: number
  task_updated: number
  task_commented: number
  task_due_soon: number
  task_overdue: number
  task_completed: number
  task_support_assigned: number
  bug_assigned: number
  bug_updated: number
  bug_commented: number
  bug_status_changed: number
  bug_severity_changed: number
  leave_approved: number
  leave_rejected: number
  leave_pending_approval: number
  wfh_approved: number
  wfh_rejected: number
  wfh_pending_approval: number
  project_assigned: number
  project_updated: number
  team_member_added: number
  team_task_created: number
  system_announcements: number
  daily_summary: number
  weekly_summary: number
  quiet_hours_enabled: number
  quiet_hours_start: string
  quiet_hours_end: string
  created_at: Date
  updated_at: Date
}

/**
 * Convert database row to NotificationPreferences object
 */
function rowToPreferences(row: NotificationPreferencesRow): NotificationPreferences {
  return {
    id: row.id,
    employeeId: row.employee_id,
    emailEnabled: Boolean(row.email_enabled),
    telegramEnabled: Boolean(row.telegram_enabled),
    inAppEnabled: Boolean(row.in_app_enabled),
    taskAssigned: Boolean(row.task_assigned),
    taskUpdated: Boolean(row.task_updated),
    taskCommented: Boolean(row.task_commented),
    taskDueSoon: Boolean(row.task_due_soon),
    taskOverdue: Boolean(row.task_overdue),
    taskCompleted: Boolean(row.task_completed),
    taskSupportAssigned: Boolean(row.task_support_assigned),
    bugAssigned: Boolean(row.bug_assigned),
    bugUpdated: Boolean(row.bug_updated),
    bugCommented: Boolean(row.bug_commented),
    bugStatusChanged: Boolean(row.bug_status_changed),
    bugSeverityChanged: Boolean(row.bug_severity_changed),
    leaveApproved: Boolean(row.leave_approved),
    leaveRejected: Boolean(row.leave_rejected),
    leavePendingApproval: Boolean(row.leave_pending_approval),
    wfhApproved: Boolean(row.wfh_approved),
    wfhRejected: Boolean(row.wfh_rejected),
    wfhPendingApproval: Boolean(row.wfh_pending_approval),
    projectAssigned: Boolean(row.project_assigned),
    projectUpdated: Boolean(row.project_updated),
    teamMemberAdded: Boolean(row.team_member_added),
    teamTaskCreated: Boolean(row.team_task_created),
    systemAnnouncements: Boolean(row.system_announcements),
    dailySummary: Boolean(row.daily_summary),
    weeklySummary: Boolean(row.weekly_summary),
    quietHoursEnabled: Boolean(row.quiet_hours_enabled),
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  }
}

/**
 * Get notification preferences for a user
 * Creates default preferences if they don't exist
 */
export async function getNotificationPreferences(employeeId: string): Promise<NotificationPreferences> {
  const rows = await query<NotificationPreferencesRow[]>(
    `SELECT * FROM user_notification_preferences WHERE employee_id = ? LIMIT 1`,
    [employeeId]
  )

  if (rows.length === 0) {
    // Create default preferences
    await query(
      `INSERT INTO user_notification_preferences (employee_id) VALUES (?)`,
      [employeeId]
    )

    // Fetch the newly created preferences
    const newRows = await query<NotificationPreferencesRow[]>(
      `SELECT * FROM user_notification_preferences WHERE employee_id = ? LIMIT 1`,
      [employeeId]
    )

    return rowToPreferences(newRows[0])
  }

  return rowToPreferences(rows[0])
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
  employeeId: string,
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const updates: string[] = []
  const values: any[] = []

  // Map camelCase to snake_case and build update query
  const fieldMap: { [key: string]: string } = {
    emailEnabled: 'email_enabled',
    telegramEnabled: 'telegram_enabled',
    inAppEnabled: 'in_app_enabled',
    taskAssigned: 'task_assigned',
    taskUpdated: 'task_updated',
    taskCommented: 'task_commented',
    taskDueSoon: 'task_due_soon',
    taskOverdue: 'task_overdue',
    taskCompleted: 'task_completed',
    taskSupportAssigned: 'task_support_assigned',
    bugAssigned: 'bug_assigned',
    bugUpdated: 'bug_updated',
    bugCommented: 'bug_commented',
    bugStatusChanged: 'bug_status_changed',
    bugSeverityChanged: 'bug_severity_changed',
    leaveApproved: 'leave_approved',
    leaveRejected: 'leave_rejected',
    leavePendingApproval: 'leave_pending_approval',
    wfhApproved: 'wfh_approved',
    wfhRejected: 'wfh_rejected',
    wfhPendingApproval: 'wfh_pending_approval',
    projectAssigned: 'project_assigned',
    projectUpdated: 'project_updated',
    teamMemberAdded: 'team_member_added',
    teamTaskCreated: 'team_task_created',
    systemAnnouncements: 'system_announcements',
    dailySummary: 'daily_summary',
    weeklySummary: 'weekly_summary',
    quietHoursEnabled: 'quiet_hours_enabled',
    quietHoursStart: 'quiet_hours_start',
    quietHoursEnd: 'quiet_hours_end'
  }

  Object.keys(preferences).forEach(key => {
    if (key in fieldMap && preferences[key as keyof NotificationPreferences] !== undefined) {
      updates.push(`${fieldMap[key]} = ?`)
      values.push(preferences[key as keyof NotificationPreferences])
    }
  })

  if (updates.length > 0) {
    values.push(employeeId)
    await query(
      `UPDATE user_notification_preferences SET ${updates.join(', ')} WHERE employee_id = ?`,
      values
    )
  }

  return getNotificationPreferences(employeeId)
}

/**
 * Check if user should receive notification based on preferences
 */
export async function shouldNotify(
  employeeId: string,
  notificationType: keyof Omit<NotificationPreferences, 'id' | 'employeeId' | 'createdAt' | 'updatedAt' | 'quietHoursStart' | 'quietHoursEnd'>,
  channel: 'email' | 'telegram' | 'in_app' = 'email'
): Promise<boolean> {
  const prefs = await getNotificationPreferences(employeeId)

  // Check if channel is enabled
  if (channel === 'email' && !prefs.emailEnabled) return false
  if (channel === 'telegram' && !prefs.telegramEnabled) return false
  if (channel === 'in_app' && !prefs.inAppEnabled) return false

  // Check quiet hours
  if (prefs.quietHoursEnabled) {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`
    
    const start = prefs.quietHoursStart
    const end = prefs.quietHoursEnd

    // Handle quiet hours that span midnight
    if (start > end) {
      if (currentTime >= start || currentTime < end) {
        return false // In quiet hours
      }
    } else {
      if (currentTime >= start && currentTime < end) {
        return false // In quiet hours
      }
    }
  }

  // Check specific notification type
  return Boolean(prefs[notificationType])
}

/**
 * Reset preferences to default for a user
 */
export async function resetNotificationPreferences(employeeId: string): Promise<NotificationPreferences> {
  await query(
    `DELETE FROM user_notification_preferences WHERE employee_id = ?`,
    [employeeId]
  )

  return getNotificationPreferences(employeeId)
}

