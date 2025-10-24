'use client'

import { User, Task, LeaveApplication, WFHApplication } from './types'

// Cache configuration
const CACHE_DURATION = {
  users: 5 * 60 * 1000, // 5 minutes
  tasks: 2 * 60 * 1000, // 2 minutes
  applications: 2 * 60 * 1000, // 2 minutes
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  loading?: boolean
}

// Global cache store
class DataCache {
  private cache = new Map<string, CacheEntry<any>>()
  private loadingPromises = new Map<string, Promise<any>>()

  get<T>(key: string, maxAge: number): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    const isExpired = Date.now() - entry.timestamp > maxAge
    if (isExpired) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  isLoading(key: string): boolean {
    return this.loadingPromises.has(key)
  }

  setLoadingPromise(key: string, promise: Promise<any>): void {
    this.loadingPromises.set(key, promise)
    promise.finally(() => {
      this.loadingPromises.delete(key)
    })
  }

  getLoadingPromise(key: string): Promise<any> | null {
    return this.loadingPromises.get(key) || null
  }

  clear(): void {
    this.cache.clear()
    this.loadingPromises.clear()
  }

  clearByPattern(pattern: string): void {
    const keys = Array.from(this.cache.keys())
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

const cache = new DataCache()

// Optimized data service with caching and deduplication
export const optimizedDataService = {
  // Users
  async getAllUsers(forceRefresh = false): Promise<User[]> {
    const cacheKey = 'users:all'
    
    if (!forceRefresh) {
      const cached = cache.get<User[]>(cacheKey, CACHE_DURATION.users)
      if (cached) return cached
      
      // Check if already loading
      const loadingPromise = cache.getLoadingPromise(cacheKey)
      if (loadingPromise) return loadingPromise
    }

    const promise = this.fetchAllUsers()
    cache.setLoadingPromise(cacheKey, promise)

    try {
      const data = await promise
      cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error('Failed to fetch users:', error)
      throw error
    }
  },

  async getUserById(employeeId: string, forceRefresh = false): Promise<User | null> {
    const cacheKey = `user:${employeeId}`

    if (!forceRefresh) {
      const cached = cache.get<User>(cacheKey, CACHE_DURATION.users)
      if (cached) return cached

      const loadingPromise = cache.getLoadingPromise(cacheKey)
      if (loadingPromise) return loadingPromise
    }

    const promise = this.fetchUserById(employeeId)
    cache.setLoadingPromise(cacheKey, promise)

    try {
      const data = await promise
      if (data) cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error(`Failed to fetch user ${employeeId}:`, error)
      throw error
    }
  },

  // Tasks
  async getTasksByUser(employeeId: string, forceRefresh = false): Promise<Task[]> {
    const cacheKey = `tasks:user:${employeeId}`
    
    if (!forceRefresh) {
      const cached = cache.get<Task[]>(cacheKey, CACHE_DURATION.tasks)
      if (cached) return cached
      
      const loadingPromise = cache.getLoadingPromise(cacheKey)
      if (loadingPromise) return loadingPromise
    }

    const promise = this.fetchTasksByUser(employeeId)
    cache.setLoadingPromise(cacheKey, promise)
    
    try {
      const data = await promise
      cache.set(cacheKey, data)
      return data
    } catch (error) {
      // Handle network errors gracefully
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn(`Network error loading tasks for user ${employeeId}, returning empty array`)
        return []
      }
      console.error(`Failed to fetch tasks for user ${employeeId}:`, error)
      throw error
    }
  },

  // Applications
  async getLeaveApplicationsByUser(employeeId: string, forceRefresh = false): Promise<LeaveApplication[]> {
    const cacheKey = `leaves:user:${employeeId}`
    
    if (!forceRefresh) {
      const cached = cache.get<LeaveApplication[]>(cacheKey, CACHE_DURATION.applications)
      if (cached) return cached
      
      const loadingPromise = cache.getLoadingPromise(cacheKey)
      if (loadingPromise) return loadingPromise
    }

    const promise = this.fetchLeaveApplicationsByUser(employeeId)
    cache.setLoadingPromise(cacheKey, promise)
    
    try {
      const data = await promise
      cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error(`Failed to fetch leave applications for user ${employeeId}:`, error)
      throw error
    }
  },

  async getWFHApplicationsByUser(employeeId: string, forceRefresh = false): Promise<WFHApplication[]> {
    const cacheKey = `wfh:user:${employeeId}`
    
    if (!forceRefresh) {
      const cached = cache.get<WFHApplication[]>(cacheKey, CACHE_DURATION.applications)
      if (cached) return cached
      
      const loadingPromise = cache.getLoadingPromise(cacheKey)
      if (loadingPromise) return loadingPromise
    }

    const promise = this.fetchWFHApplicationsByUser(employeeId)
    cache.setLoadingPromise(cacheKey, promise)
    
    try {
      const data = await promise
      cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error(`Failed to fetch WFH applications for user ${employeeId}:`, error)
      throw error
    }
  },

  // Team data
  async getTeamMembers(managerId: string, forceRefresh = false): Promise<User[]> {
    const cacheKey = `team:${managerId}`
    
    if (!forceRefresh) {
      const cached = cache.get<User[]>(cacheKey, CACHE_DURATION.users)
      if (cached) return cached
      
      const loadingPromise = cache.getLoadingPromise(cacheKey)
      if (loadingPromise) return loadingPromise
    }

    const promise = this.fetchTeamMembers(managerId)
    cache.setLoadingPromise(cacheKey, promise)
    
    try {
      const data = await promise
      cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error(`Failed to fetch team members for manager ${managerId}:`, error)
      throw error
    }
  },

  // Cache management
  clearCache(): void {
    cache.clear()
  },

  clearUserCache(): void {
    cache.clearByPattern('user')
  },

  clearTaskCache(): void {
    cache.clearByPattern('task')
  },

  clearApplicationCache(): void {
    cache.clearByPattern('leaves')
    cache.clearByPattern('wfh')
  },

  // Preload data for better performance
  async preloadUserData(employeeId: string): Promise<void> {
    try {
      await Promise.allSettled([
        this.getUserById(employeeId),
        this.getTasksByUser(employeeId),
        this.getLeaveApplicationsByUser(employeeId),
        this.getWFHApplicationsByUser(employeeId)
      ])
    } catch (error) {
      console.error('Failed to preload user data:', error)
    }
  },

  // API fetch methods
  async fetchAllUsers(): Promise<User[]> {
    const response = await fetch('/api/users')
    if (!response.ok) {
      throw new Error('Failed to fetch users')
    }
    const result = await response.json()
    return result.data || []
  },

  async fetchUserById(employeeId: string): Promise<User | null> {
    const response = await fetch(`/api/users/${employeeId}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch user')
    }
    const result = await response.json()
    return result.data || null
  },

  async fetchTasksByUser(employeeId: string): Promise<Task[]> {
    const response = await fetch(`/api/tasks/user/${employeeId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch tasks')
    }
    const result = await response.json()
    return result.data || []
  },

  async fetchLeaveApplicationsByUser(employeeId: string): Promise<LeaveApplication[]> {
    const response = await fetch(`/api/leaves/user/${employeeId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch leave applications')
    }
    const result = await response.json()
    return result.data || []
  },

  async fetchWFHApplicationsByUser(employeeId: string): Promise<WFHApplication[]> {
    const response = await fetch(`/api/wfh/user/${employeeId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch WFH applications')
    }
    const result = await response.json()
    return result.data || []
  },

  async fetchTeamMembers(managerId: string): Promise<User[]> {
    const response = await fetch(`/api/users?managerId=${managerId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch team members')
    }
    const result = await response.json()
    return result.data || []
  }
}
