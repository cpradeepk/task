// Utility functions for Amtariksha Task Management System
// All data operations use Google Sheets via the dataService

// Task ID generation
export function generateTaskId(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `JSR-${timestamp}${random}`
}

// Utility ID generation
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
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
