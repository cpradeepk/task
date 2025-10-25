// Utility functions for Amtariksha Task Management System
// All data operations use Google Sheets via the dataService

// Task ID generation with guaranteed uniqueness
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

// Task utility functions
export function isTaskOwner(task: any, employeeId: string): boolean {
  return task.assignedTo === employeeId
}

export function isTaskSupporter(task: any, employeeId: string): boolean {
  return task.support && task.support.includes(employeeId) && task.assignedTo !== employeeId
}

// Task Update Modal Component Data
export function getTaskUpdateOptions() {
  return {
    statuses: [
      'Yet to Start',
      'In Progress',
      'Delayed',
      'Done',
      'Cancel',
      'Hold',
      'ReOpened',
      'Stop'
    ],
    priorities: [
      { value: 'U&I', label: 'Urgent & Important' },
      { value: 'NU&I', label: 'Not Urgent but Important' },
      { value: 'U&NI', label: 'Urgent but Not Important' },
      { value: 'NU&NI', label: 'Not Urgent & Not Important' }
    ]
  }
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
    'Done': 'bg-primary text-black border border-primary-600',
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

// All data operations now use Google Sheets via dataService from @/lib/sheets
import { dataService } from '@/lib/sheets'
import type { LeaveApplication, WFHApplication } from '@/lib/types'

// Leave application functions
export async function addLeaveApplication(application: Omit<LeaveApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  return dataService.addLeaveApplication(application)
}

// WFH application functions
export async function addWFHApplication(application: Omit<WFHApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  return dataService.addWFHApplication(application)
}
