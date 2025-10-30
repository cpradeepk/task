/**
 * Settings Service
 * API calls for settings (dropdowns, configurations)
 */

import { get, ApiResponse } from './apiClient'
import { API_ENDPOINTS } from '../config/api'

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
 * Get all settings
 */
export const getAllSettings = async (
  grouped: boolean = false,
  activeOnly: boolean = true
): Promise<ApiResponse<Setting[] | GroupedSettings>> => {
  const params = new URLSearchParams()
  if (grouped) params.append('grouped', 'true')
  if (activeOnly) params.append('activeOnly', 'true')
  
  const queryString = params.toString()
  const endpoint = queryString
    ? `${API_ENDPOINTS.SETTINGS}?${queryString}`
    : API_ENDPOINTS.SETTINGS
  
  return get(endpoint)
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

