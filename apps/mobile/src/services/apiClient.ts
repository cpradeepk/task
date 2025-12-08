/**
 * API Client
 * Centralized HTTP client with authentication
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { buildApiUrl } from '../config/api'
import { getUserToken } from '../utils/secureStorage'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Make authenticated API request
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    // Get auth token
    const token = await getUserToken()

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    // If body is FormData, let the browser/native fetch set Content-Type
    if (options.body instanceof FormData) {
      delete headers['Content-Type']
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Make request
    const response = await fetch(buildApiUrl(endpoint), {
      ...options,
      headers,
    })

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.warn('Unauthorized access, clearing token...')
      await AsyncStorage.removeItem('userToken')
      // You might want to trigger a global event or use a navigation service here
      // to redirect to login, but clearing the token is the first step.
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    // Parse response
    const data = await response.json()

    return data
  } catch (error) {
    console.error('API Request Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * GET request
 */
export const get = <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, { method: 'GET' })
}

/**
 * POST request
 */
export const post = <T = any>(
  endpoint: string,
  body: any
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
}

/**
 * PATCH request
 */
export const patch = <T = any>(
  endpoint: string,
  body: any
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
}

/**
 * DELETE request
 */
export const del = <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, { method: 'DELETE' })
}

/**
 * PUT request
 */
export const put = <T = any>(
  endpoint: string,
  body: any
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
}

// Default export object for convenience
export default {
  get,
  post,
  put,
  patch,
  del,
  apiRequest
}

