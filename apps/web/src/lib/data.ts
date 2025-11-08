// Utility functions for Amtariksha Task Management System
// All data operations use MySQL database via API routes

/**
 * Generate sequential alphanumeric Task ID
 * Format: JSR-0001, JSR-0002, ..., JSR-9999, JSR-A001, JSR-A002, etc.
 *
 * This function should be called from the API route which will fetch the
 * latest task ID from the database to ensure uniqueness.
 *
 * @param lastTaskId - The last task ID from the database (e.g., "JSR-0001")
 * @returns {string} Next sequential task ID (e.g., "JSR-0002")
 */
export function generateSequentialTaskId(lastTaskId?: string): string {
  if (!lastTaskId) {
    return 'JSR-0001'
  }

  // Extract the numeric/alphanumeric part after "JSR-"
  const idPart = lastTaskId.replace('JSR-', '')

  // Try to parse as number first (for IDs like JSR-0001)
  const numericValue = parseInt(idPart, 10)

  if (!isNaN(numericValue)) {
    // Increment the number
    const nextNumber = numericValue + 1
    // Pad with zeros to 4 digits
    return `JSR-${nextNumber.toString().padStart(4, '0')}`
  }

  // If it's alphanumeric (like JSR-A001), increment accordingly
  // For simplicity, we'll just increment the numeric part
  const match = idPart.match(/^([A-Z]+)(\d+)$/)
  if (match) {
    const prefix = match[1]
    const number = parseInt(match[2], 10)
    const nextNumber = number + 1
    return `JSR-${prefix}${nextNumber.toString().padStart(3, '0')}`
  }

  // Fallback: just increment by 1
  return `JSR-${(parseInt(idPart) + 1).toString().padStart(4, '0')}`
}

// Legacy function - kept for backward compatibility during migration
// Will be removed after migration is complete
let lastTimestamp = 0
let counter = 0

export function generateTaskId(): string {
  const timestamp = Date.now()

  // If same millisecond, increment counter
  if (timestamp === lastTimestamp) {
    counter++
  } else {
    lastTimestamp = timestamp
    counter = 0
  }

  // Use timestamp + counter + random for uniqueness
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const uniqueCounter = counter.toString().padStart(3, '0')
  return `JSR-${timestamp}${uniqueCounter}${random}`
}

// Utility ID generation
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * Generate sequential alphanumeric Bug ID
 * Format: DEV-0001, DEV-0002, ..., DEV-9999, DEV-A001, DEV-A002, etc.
 *
 * ✅ UPDATED: Changed prefix from BUG- to DEV- for new bugs
 * ✅ Continues numbering from existing bugs (BUG-0025 → DEV-0026)
 * ✅ Supports alphanumeric expansion when reaching 9999
 *
 * This function should be called from the API route which will fetch the
 * latest bug ID from the database to ensure uniqueness.
 *
 * @param lastBugId - The last bug ID from the database (e.g., "BUG-0025" or "DEV-0030")
 * @returns {string} Next sequential bug ID with DEV- prefix (e.g., "DEV-0026")
 */
export function generateSequentialBugId(lastBugId?: string): string {
  if (!lastBugId) {
    return 'DEV-0001'
  }

  // Extract the numeric/alphanumeric part after "BUG-" or "DEV-"
  const idPart = lastBugId.replace(/^(BUG-|DEV-)/, '')

  // Try to parse as number first (for IDs like BUG-0001 or DEV-0001)
  const numericValue = parseInt(idPart, 10)

  if (!isNaN(numericValue)) {
    // Increment the number
    const nextNumber = numericValue + 1

    // If we've reached 9999, switch to alphanumeric (DEV-A001)
    if (nextNumber > 9999) {
      return 'DEV-A001'
    }

    // Pad with zeros to 4 digits and use DEV- prefix
    return `DEV-${nextNumber.toString().padStart(4, '0')}`
  }

  // If it's alphanumeric (like DEV-A001), increment accordingly
  const match = idPart.match(/^([A-Z]+)(\d+)$/)
  if (match) {
    const prefix = match[1]
    const number = parseInt(match[2], 10)
    const nextNumber = number + 1

    // If we've reached 999 in current letter, move to next letter
    if (nextNumber > 999) {
      const nextPrefix = incrementAlphaPrefix(prefix)
      return `DEV-${nextPrefix}001`
    }

    return `DEV-${prefix}${nextNumber.toString().padStart(3, '0')}`
  }

  // Fallback: just increment by 1
  return `DEV-${(parseInt(idPart) + 1).toString().padStart(4, '0')}`
}

/**
 * Helper function to increment alphabetic prefix (A → B, Z → AA, AZ → BA, etc.)
 */
function incrementAlphaPrefix(prefix: string): string {
  const chars = prefix.split('')
  let carry = true

  for (let i = chars.length - 1; i >= 0 && carry; i--) {
    if (chars[i] === 'Z') {
      chars[i] = 'A'
    } else {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1)
      carry = false
    }
  }

  if (carry) {
    chars.unshift('A')
  }

  return chars.join('')
}

// Legacy function - kept for backward compatibility during migration
// Will be removed after migration is complete
/**
 * Generate unique Bug ID with format: BUG-{timestamp}{counter}{random}
 * Ensures uniqueness even when called multiple times in the same millisecond
 *
 * @returns {string} Unique bug ID (e.g., "BUG-1735123456789001234")
 *
 * @example
 * const bugId = generateBugId() // "BUG-1735123456789001234"
 */
let lastBugTimestamp = 0
let bugCounter = 0

export function generateBugId(): string {
  const timestamp = Date.now()

  // If same millisecond, increment counter to ensure uniqueness
  if (timestamp === lastBugTimestamp) {
    bugCounter++
  } else {
    lastBugTimestamp = timestamp
    bugCounter = 0
  }

  // Use timestamp + counter + random for guaranteed uniqueness
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const uniqueCounter = bugCounter.toString().padStart(3, '0')
  return `BUG-${timestamp}${uniqueCounter}${random}`
}

/**
 * Get display ID for a bug (adds FT- prefix for feature-type bugs)
 *
 * @param bugId - The database bug ID (e.g., "BUG-0005" or "DEV-0010")
 * @param bugType - The bug type (e.g., "feature", "testcase", null)
 * @returns {string} Display ID (e.g., "FT-BUG-0005" for features, "BUG-0005" for others)
 *
 * Examples:
 * - getBugDisplayId("BUG-0005", "testcase") → "BUG-0005"
 * - getBugDisplayId("BUG-0005", "feature") → "FT-BUG-0005"
 * - getBugDisplayId("DEV-0010", "testcase") → "DEV-0010"
 * - getBugDisplayId("DEV-0010", "feature") → "FT-DEV-0010"
 * - getBugDisplayId("DEV-0010", null) → "DEV-0010"
 */
export function getBugDisplayId(bugId: string, bugType?: string | null): string {
  if (bugType === 'feature') {
    return `FT-${bugId}`
  }
  return bugId
}

// Task utility functions
export function isTaskOwner(task: any, employeeId: string): boolean {
  return task.assignedTo === employeeId
}

export function isTaskSupporter(task: any, employeeId: string): boolean {
  return task.support && task.support.includes(employeeId) && task.assignedTo !== employeeId
}



// Date formatting utilities
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Status and priority color utilities
export function getStatusColor(status: string): string {
  const statusColors = {
    'Yet to Start': 'bg-gray-100 text-black border border-gray-300',
    'In Progress': 'bg-primary-100 text-black border border-primary-300',
    'Delayed': 'bg-red-100 text-red-800 border border-red-300',
    'Done': 'bg-green-100 text-green-800 border border-green-300',
    'Cancel': 'bg-gray-100 text-black border border-gray-300',
    'Hold': 'bg-gray-200 text-black border border-gray-400',
    'ReOpened': 'bg-primary-200 text-black border border-primary-400',
    'Stop': 'bg-gray-200 text-black border border-gray-400',
    'Pending': 'bg-gray-200 text-black border border-gray-400',
    'Approved': 'bg-primary text-black border border-primary-600',
    'Rejected': 'bg-gray-100 text-black border border-gray-300'
  }

  return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-black border border-gray-300'
}

export function getPriorityColor(priority: string): string {
  const priorityColors = {
    'U&I': 'bg-primary text-black border border-primary-600',
    'NU&I': 'bg-primary-200 text-black border border-primary-400',
    'U&NI': 'bg-primary-100 text-black border border-primary-300',
    'NU&NI': 'bg-gray-100 text-black border border-gray-300'
  }

  return priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-100 text-black border border-gray-300'
}

// All data operations now use MySQL database via API routes
import type { LeaveApplication, WFHApplication } from '@/lib/types'

// Leave application functions
export async function addLeaveApplication(application: Omit<LeaveApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const response = await fetch('/api/leaves', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(application)
  })
  const data = await response.json()
  return data.id || ''
}

// WFH application functions
export async function addWFHApplication(application: Omit<WFHApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const response = await fetch('/api/wfh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(application)
  })
  const data = await response.json()
  return data.id || ''
}
