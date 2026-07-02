/**
 * User Service
 * API calls for user management
 * Updated: GraphQL with REST fallback
 */

import { get, ApiResponse } from './apiClient'
import { API_ENDPOINTS } from '../config/api'
import { executeGraphQLWithFallback } from './graphqlClient'
import { QUERIES } from './graphqlQueries'
import { getUserData } from '../utils/secureStorage'

export interface User {
  employeeId: string
  name: string
  email: string
  role: string
  department?: string
  designation?: string
  reportingManager?: string
  isActive: boolean
  tabPermissions?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Get all users (GraphQL with REST fallback)
 */
export const getAllUsers = async (): Promise<ApiResponse<User[]>> => {
  return executeGraphQLWithFallback<User[]>(
    QUERIES.GET_USERS,
    {},
    () => get<User[]>(API_ENDPOINTS.USERS),
    'UserService.getAllUsers'
  ).then(response => {
    if (response.success && response.data) {
      // GraphQL returns users directly, REST returns { data: users }
      const users = Array.isArray(response.data) ? response.data : (response.data as any).users || []
      return { success: true, data: users }
    }
    return response
  })
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
 * Get current user from SecureStore
 */
export const getCurrentUser = async (): Promise<User | null> => {
  return getUserData<User>()
}

