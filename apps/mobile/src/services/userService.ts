/**
 * User Service
 * API calls for user management
 */

import { get, ApiResponse } from './apiClient'
import { API_ENDPOINTS } from '../config/api'

export interface User {
  employeeId: string
  name: string
  email: string
  role: string
  department?: string
  designation?: string
  reportingManager?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Get all users
 */
export const getAllUsers = async (): Promise<ApiResponse<User[]>> => {
  return get<User[]>(API_ENDPOINTS.USERS)
}

/**
 * Get user by employee ID
 */
export const getUserById = async (
  employeeId: string
): Promise<ApiResponse<User>> => {
  return get<User>(API_ENDPOINTS.USER_BY_ID(employeeId))
}

/**
 * Get current user from AsyncStorage
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
    const userJson = await AsyncStorage.getItem('user')
    if (userJson) {
      return JSON.parse(userJson)
    }
    return null
  } catch (error) {
    console.error('Failed to get current user:', error)
    return null
  }
}

