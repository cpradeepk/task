/**
 * Settings Service
 * API calls for settings (dropdowns, configurations)
 * Updated: GraphQL with REST fallback
 */

import { get, ApiResponse } from './apiClient'
import { API_ENDPOINTS } from '../config/api'
import { executeGraphQLWithFallback } from './graphqlClient'
import { QUERIES } from './graphqlQueries'

export interface Setting {
  id: number
  key: string
  value: string
  type: string
  isActive: boolean
  metadata?: string
}

export interface GroupedSettings {
  [key: string]: Setting[]
}

/**
 * Get all settings (GraphQL with REST fallback)
 */
export const getAllSettings = async (
  grouped: boolean = false,
  activeOnly: boolean = true
): Promise<ApiResponse<Setting[] | GroupedSettings>> => {
  // For grouped settings, use REST API (GraphQL doesn't support grouping yet)
  if (grouped) {
    const params = new URLSearchParams()
    params.append('grouped', 'true')
    if (activeOnly) params.append('activeOnly', 'true')

    const queryString = params.toString()
    const endpoint = `${API_ENDPOINTS.SETTINGS}?${queryString}`

    return get(endpoint)
  }

  // For non-grouped settings, use GraphQL with REST fallback
  return executeGraphQLWithFallback<Setting[]>(
    QUERIES.GET_SETTINGS,
    { activeOnly },
    () => {
      const params = new URLSearchParams()
      if (activeOnly) params.append('activeOnly', 'true')
      const queryString = params.toString()
      const endpoint = queryString
        ? `${API_ENDPOINTS.SETTINGS}?${queryString}`
        : API_ENDPOINTS.SETTINGS
      return get(endpoint)
    },
    'SettingsService.getAllSettings'
  ).then(response => {
    if (response.success && response.data) {
      // GraphQL returns settings directly, REST returns { data: settings }
      const settings = Array.isArray(response.data) ? response.data : (response.data as any).settings || []
      return { success: true, data: settings }
    }
    return response
  })
}

/**
 * Get settings by type
 */
export const getSettingsByType = async (
  type: string
): Promise<ApiResponse<Setting[]>> => {
  const response = await getAllSettings(true, true)
  if (response.success && response.data) {
    const grouped = response.data as GroupedSettings
    return {
      success: true,
      data: grouped[type] || [],
    }
  }
  return {
    success: false,
    error: 'Failed to fetch settings',
  }
}

