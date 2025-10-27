// Shared utility functions for web and mobile apps

// ============ Date Utilities ============
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getDaysDifference(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function isOverdue(endDate: string): boolean {
  return new Date(endDate) < new Date()
}

export function isToday(date: string): boolean {
  const today = new Date()
  const d = new Date(date)
  return d.toDateString() === today.toDateString()
}

// ============ Validation Utilities ============
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateEmployeeId(employeeId: string): boolean {
  // Employee ID format: AM-0001, etc.
  return /^[A-Z]{2}-\d{4,}$/.test(employeeId)
}

export function validatePhoneNumber(phone: string): boolean {
  // Indian phone number format
  return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''))
}

export function validatePassword(password: string): boolean {
  // At least 6 characters
  return password.length >= 6
}

// ============ String Utilities ============
export function truncateString(str: string, length: number): string {
  if (str.length <= length) return str
  return str.substring(0, length) + '...'
}

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalizeFirstLetter(word))
    .join(' ')
}

// ============ Array Utilities ============
export function removeDuplicates<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((result, item) => {
    const groupKey = String(item[key])
    if (!result[groupKey]) {
      result[groupKey] = []
    }
    result[groupKey].push(item)
    return result
  }, {} as Record<string, T[]>)
}

export function sortBy<T>(arr: T[], key: keyof T, ascending = true): T[] {
  return [...arr].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return ascending ? -1 : 1
    if (aVal > bVal) return ascending ? 1 : -1
    return 0
  })
}

// ============ Number Utilities ============
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)
}

export function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100
}

// ============ Status Utilities ============
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Yet to Start': '#gray',
    'In Progress': '#blue',
    'Done': '#green',
    'Delayed': '#red',
    'Hold': '#yellow',
    'Cancel': '#gray',
    'New': '#blue',
    'Resolved': '#green',
    'Closed': '#gray',
    'Reopened': '#red'
  }
  return colors[status] || '#gray'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'U&I': '#red',
    'NU&I': '#orange',
    'U&NI': '#yellow',
    'NU&NI': '#green',
    'Critical': '#red',
    'Major': '#orange',
    'Minor': '#yellow'
  }
  return colors[priority] || '#gray'
}

// ============ ID Generation ============
export function generateId(prefix: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `${prefix}-${timestamp}${random}`
}

// ============ Local Storage Utilities ============
export function setLocalStorage(key: string, value: any): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

export function getLocalStorage(key: string): any {
  if (typeof window !== 'undefined') {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  }
  return null
}

export function removeLocalStorage(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key)
  }
}

export function clearLocalStorage(): void {
  if (typeof window !== 'undefined') {
    localStorage.clear()
  }
}
