'use client'

import { User } from './types'

const CURRENT_USER_KEY = 'jsr_current_user'

// Only admin user is hardcoded - all other users come from Google Sheets
const ADMIN_USER: User = {
  employeeId: 'admin-001',
  name: 'System Admin',
  email: 'admin@eassy.life',
  phone: '+91-9999999999',
  department: 'Technology',
  isTodayTask: false,
  warningCount: 0,
  role: 'admin',
  password: '1234', // Static password as per requirements
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
}

export async function initializeUsers(): Promise<void> {
  try {
    // Initialize user system by checking if users can be loaded
    await getAllUsers()
    console.log('User authentication system initialized with Google Sheets')
  } catch (error) {
    console.error('Failed to initialize users from Google Sheets:', error)
    console.log('Falling back to admin-only authentication')
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    // Get users from API
    const response = await fetch('/api/users')
    if (!response.ok) {
      throw new Error('Failed to fetch users')
    }

    const result = await response.json()
    const users = result.data || []

    // Always ensure admin user is included
    const hasAdmin = users.some((user: User) => user.employeeId === 'admin-001')
    if (!hasAdmin) {
      users.unshift(ADMIN_USER)
    }

    return users
  } catch (error) {
    console.error('Failed to get all users from API:', error)
    // Return only admin user as fallback
    return [ADMIN_USER]
  }
}

export async function getUserByEmployeeId(employeeId: string): Promise<User | null> {
  try {
    // Check if it's admin user first
    if (employeeId.toLowerCase() === 'admin-001') {
      return ADMIN_USER
    }

    // Get user from API
    const response = await fetch(`/api/users/${employeeId}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch user')
    }

    const result = await response.json()
    return result.data || null
  } catch (error) {
    console.error('Failed to get user by employee ID:', error)
    return null
  }
}

export async function authenticateUser(employeeId: string, password: string): Promise<User | null> {
  try {
    // Special case for admin-001 with static password (case-insensitive)
    if (employeeId.toLowerCase() === 'admin-001' && password === '1234') {
      return ADMIN_USER
    }

    // Get user from API and validate password
    const user = await getUserByEmployeeId(employeeId)
    if (!user) return null

    // Regular password check for users from Google Sheets
    if (user.password === password) {
      return user
    }

    return null
  } catch (error) {
    console.error('Failed to authenticate user:', error)
    return null
  }
}

export async function login(employeeId: string, password: string): Promise<boolean> {
  try {
    const user = await authenticateUser(employeeId, password)

    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
      return true
    }

    return false
  } catch (error) {
    console.error('Failed to login:', error)
    return false
  }
}

export function logout(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  
  const userStr = localStorage.getItem(CURRENT_USER_KEY)
  return userStr ? JSON.parse(userStr) : null
}

export async function updateUser(updatedUser: User): Promise<boolean> {
  try {
    // Cannot update admin user
    if (updatedUser.employeeId === 'admin-001') {
      return false
    }

    // Update user via API
    const response = await fetch(`/api/users/${updatedUser.employeeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedUser)
    })

    const success = response.ok

    if (success) {
      // Update current user if it's the same user
      const currentUser = getCurrentUser()
      if (currentUser && currentUser.employeeId === updatedUser.employeeId) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser))
      }
    }

    return success
  } catch (error) {
    console.error('Failed to update user:', error)
    return false
  }
}

export async function addUser(newUser: Omit<User, 'createdAt' | 'updatedAt'>): Promise<boolean> {
  try {
    // Add user via API
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser)
    })

    return response.ok
  } catch (error) {
    console.error('Failed to add user:', error)
    return false
  }
}

export function getRoleDisplayName(role: string): string {
  const roleNames = {
    'employee': 'Employee',
    'management': 'Management',
    'top_management': 'Top Management',
    'admin': 'Administrator'
  }
  return roleNames[role as keyof typeof roleNames] || 'User'
}

export async function getUserNameByEmployeeId(employeeId: string): Promise<string> {
  try {
    const user = await getUserByEmployeeId(employeeId)
    return user ? user.name : employeeId
  } catch (error) {
    console.error('Failed to get user name by employee ID:', error)
    return employeeId
  }
}

// Get manager of a user
export async function getUserManager(employeeId: string): Promise<User | null> {
  try {
    const user = await getUserByEmployeeId(employeeId)
    if (!user || !user.managerId) return null

    return await getUserByEmployeeId(user.managerId)
  } catch (error) {
    console.error('Failed to get user manager:', error)
    return null
  }
}

// Get all team members for a manager (users who report to this manager)
export async function getTeamMembers(managerId: string): Promise<User[]> {
  try {
    const users = await getAllUsers()
    return users.filter(user => user.managerId === managerId && user.status === 'active')
  } catch (error) {
    console.error('Failed to get team members:', error)
    return []
  }
}

// Check if user can approve for another user (is their manager)
export async function canApproveFor(approverId: string, employeeId: string): Promise<boolean> {
  try {
    const employee = await getUserByEmployeeId(employeeId)
    if (!employee) return false

    // Admin can approve for anyone
    const approver = await getUserByEmployeeId(approverId)
    if (approver?.role === 'admin') return true

    // Manager can approve for their direct reports
    return employee.managerId === approverId
  } catch (error) {
    console.error('Failed to check approval permissions:', error)
    return false
  }
}
