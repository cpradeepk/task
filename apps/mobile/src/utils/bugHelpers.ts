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
  if (bugType === 'feature') {
    return `FT-${bugId}`
  }
  
  return bugId
}

/**
 * Check if a bug is a feature
 */
export function isFeatureBug(bugType?: string | null): boolean {
  return bugType === 'feature'
}

/**
 * Check if a bug is a testcase
 */
export function isTestcaseBug(bugType?: string | null): boolean {
  return bugType === 'testcase' || !bugType
}

/**
 * Get bug type display name
 */
export function getBugTypeDisplayName(bugType?: string | null): string {
  if (bugType === 'feature') return 'Feature'
  if (bugType === 'testcase') return 'Test Case'
  return 'Test Case' // Default
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'Critical':
      return '#EF4444'
    case 'Major':
      return '#F97316'
    case 'Minor':
      return '#EAB308'
    default:
      return '#6B7280'
  }
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'New':
      return '#3B82F6'
    case 'In Progress':
      return '#EAB308'
    case 'Resolved':
      return '#10B981'
    case 'Closed':
      return '#6B7280'
    case 'Reopened':
      return '#EF4444'
    default:
      return '#6B7280'
  }
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'High':
      return '#EF4444'
    case 'Medium':
      return '#F97316'
    case 'Low':
      return '#10B981'
    default:
      return '#6B7280'
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

