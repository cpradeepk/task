'use client'

import { User } from './types'

const CURRENT_USER_KEY = 'jsr_current_user'

export async function initializeUsers(): Promise<void> {
  try {
    // Initialize user system by checking if users can be loaded
    await getAllUsers()
    console.log('User authentication system initialized with database')
  } catch (error) {
    console.error('Failed to initialize users from database:', error)
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
    return result.data || []
  } catch (error) {
    console.error('Failed to get all users from API:', error)
    return []
  }
}

export async function getUserByEmployeeId(employeeId: string): Promise<User | null> {
  try {
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
    // Get user from API and validate password
    const user = await getUserByEmployeeId(employeeId)
    if (!user) return null

    // Password check
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
    // Call the login API endpoint to get JWT token and set cookie
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: allows cookies to be set
      body: JSON.stringify({ employeeId, password })
    })

    if (!response.ok) {
      return false
    }

    const result = await response.json()

    if (result.success && result.data) {
      // Store user in localStorage for client-side access
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(result.data))
      // Cookie is automatically set by the API response
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

// Fetch with timeout to prevent hanging
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15000 // 15 second timeout for user operations
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout: ${url} took longer than ${timeoutMs}ms`)
    }
    throw error
  }
}

export async function updateUser(updatedUser: User): Promise<boolean> {
  try {
    // Cannot update admin user
    if (updatedUser.employeeId === 'admin-001') {
      return false
    }

    // Update user via API with timeout
    const response = await fetchWithTimeout(
      `/api/users/${updatedUser.employeeId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedUser)
      },
      15000 // 15 second timeout
    )

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
    // Add user via API with timeout
    const response = await fetchWithTimeout(
      '/api/users',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser)
      },
      15000 // 15 second timeout
    )

    return response.ok
  } catch (error) {
    console.error('Failed to add user:', error)
    return false
  }
}

export function getRoleDisplayName(role: string): string {
  const roleNames = {
    'amtariksian': 'Amtariksian',
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

    // Admin and Top Management can approve for anyone
    const approver = await getUserByEmployeeId(approverId)
    if (approver?.role === 'admin' || approver?.role === 'top_management') return true

    // Manager can approve for their direct reports
    return employee.managerId === approverId
  } catch (error) {
    console.error('Failed to check approval permissions:', error)
    return false
  }
}

// ============ JWT Token Functions (Server-side) ============
// These functions are used for mobile app authentication

export interface TokenPayload {
  employeeId: string
  role: string
  name: string
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    // Import jwt only on server-side
    if (typeof window !== 'undefined') {
      // Client-side - cannot verify JWT
      return null
    }

    // Server-side JWT verification
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret-key-change-in-production'
    )

    return decoded as TokenPayload
  } catch (error) {
    console.error('Failed to verify token:', error)
    return null
  }
}

export function getAuthUser(request: Request): TokenPayload | null {
  try {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.replace('Bearer ', '')
    return verifyToken(token)
  } catch (error) {
    console.error('Failed to get auth user:', error)
    return null
  }
}
