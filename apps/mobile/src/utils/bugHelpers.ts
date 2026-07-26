/**
 * Bug Helper Utilities
 * 
 * Provides utility functions for bug-related operations:
 * - Bug ID display formatting (FT- prefix for features)
 * - Bug type helpers
 * - Bug status helpers
 */

/**
 * Get display ID for a bug
 * 
 * Adds FT- prefix for feature-type bugs
 * 
 * @param bugId - The actual bug ID (e.g., "DEV-0001")
 * @param bugType - The bug type ("feature" or "testcase")
 * @returns Display ID with FT- prefix for features (e.g., "FT-DEV-0001")
 * 
 * @example
 * getBugDisplayId("DEV-0001", "feature") // Returns "FT-DEV-0001"
 * getBugDisplayId("DEV-0001", "testcase") // Returns "DEV-0001"
 * getBugDisplayId("DEV-0001", null) // Returns "DEV-0001"
 */
export function getBugDisplayId(bugId: string, bugType?: string | null): string {
  if (!bugId) return ''

  // Add FT- prefix for feature-type bugs
  if (bugType === 'feature' || bugType === 'Feature') {
    return `FT-${bugId}`
  }

  return bugId
}

/**
 * Check if a bug is a feature
 */
export function isFeatureBug(bugType?: string | null): boolean {
  return bugType === 'feature' || bugType === 'Feature'
}

/**
 * Check if a bug is a testcase
 */
export function isTestcaseBug(bugType?: string | null): boolean {
  return bugType === 'testcase' || bugType === 'Testcase' || !bugType
}

/**
 * Get bug type display name.
 *
 * Mirrors workItemNoun() in apps/web/src/lib/workItemType.ts so both apps name a
 * work item the same way. Migration 056 dropped 'testcase' and added 'release';
 * 'testcase' is still recognised here for any client holding stale cached rows.
 */
export function getBugTypeDisplayName(bugType?: string | null): string {
  const normalized = (bugType || '').toLowerCase()
  if (normalized === 'feature') return 'Feature Request'
  if (normalized === 'release') return 'Release'
  if (normalized === 'bug') return 'Bug Report'
  if (normalized === 'other') return 'Work Item'
  if (normalized === 'testcase') return 'Test Case'
  return bugType || 'Bug Report'
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: string, colors: any): string {
  switch (severity) {
    case 'Critical':
      return colors.errorLight
    case 'Major':
      return colors.warningLight
    case 'Minor':
      return colors.infoLight
    default:
      return colors.surfaceVariant
  }
}

/**
 * Get status color
 */
export function getStatusColor(status: string, colors: any): string {
  switch (status) {
    case 'New':
    case 'Open':
      return colors.infoLight
    case 'In Progress':
      return colors.primaryLight
    case 'Resolved':
    case 'Completed':
    case 'Done':
      return colors.successLight
    case 'Closed':
    case 'Cancel':
    case 'Cancelled':
      return colors.surfaceVariant
    case 'Reopened':
    case 'ReOpened':
    case 'Delayed':
    case 'Stop':
      return colors.errorLight
    case 'Hold':
    case 'On Hold':
      return colors.warningLight
    default:
      return colors.surfaceVariant
  }
}

/**
 * Get status text color
 */
export function getStatusTextColor(status: string, colors: any): string {
  switch (status) {
    case 'New':
    case 'Open':
      return colors.info
    case 'In Progress':
      return colors.primary
    case 'Resolved':
    case 'Completed':
    case 'Done':
      return colors.success
    case 'Closed':
    case 'Cancel':
    case 'Cancelled':
      return colors.textSecondary
    case 'Reopened':
    case 'ReOpened':
    case 'Delayed':
    case 'Stop':
      return colors.error
    case 'Hold':
    case 'On Hold':
      return colors.warning
    default:
      return colors.textSecondary
  }
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: string, colors: any): string {
  const p = priority ? priority.toUpperCase() : ''
  if (p.includes('U&I') || p.includes('HIGH') || p.includes('URGENT')) return colors.errorLight
  if (p.includes('NU&I') || p.includes('MEDIUM') || p.includes('IMPORTANT')) return colors.warningLight
  if (p.includes('U&NI') || p.includes('LOW')) return colors.infoLight
  return colors.surfaceVariant
}

/**
 * Get priority text color
 */
export function getPriorityTextColor(priority: string, colors: any): string {
  const p = priority ? priority.toUpperCase() : ''
  if (p.includes('U&I') || p.includes('HIGH') || p.includes('URGENT')) return colors.error
  if (p.includes('NU&I') || p.includes('MEDIUM') || p.includes('IMPORTANT')) return colors.warning
  if (p.includes('U&NI') || p.includes('LOW')) return colors.info
  return colors.textSecondary
}

/**
 * Get severity text color
 */
export function getSeverityTextColor(severity: string, colors: any): string {
  switch (severity) {
    case 'Critical':
      return colors.error
    case 'Major':
      return colors.warning
    case 'Minor':
      return colors.info
    default:
      return colors.textSecondary
  }
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'UI':
      return '🎨'
    case 'API':
      return '🔌'
    case 'Backend':
      return '⚙️'
    case 'Performance':
      return '⚡'
    case 'Security':
      return '🔒'
    case 'Database':
      return '💾'
    case 'Integration':
      return '🔗'
    default:
      return '🐛'
  }
}

/**
 * Get platform icon
 */
export function getPlatformIcon(platform: string): string {
  switch (platform) {
    case 'iOS':
      return '🍎'
    case 'Android':
      return '🤖'
    case 'Web':
      return '🌐'
    case 'All':
      return '📱'
    default:
      return '📱'
  }
}

/**
 * Check if bug should show timer
 * Timers should NOT show for Closed or Resolved status
 */
export function shouldShowTimer(status: string): boolean {
  return status !== 'Closed' && status !== 'Resolved'
}

/**
 * Format timer duration (seconds to HH:MM:SS)
 */
export function formatTimerDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

