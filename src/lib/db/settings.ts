/**
 * Settings Database Service
 * Handles CRUD operations for configurable dropdown settings
 */

import { query } from './index'

export type SettingType = 'department' | 'severity' | 'priority' | 'category' | 'platform' | 'task_priority' | 'task_status' | 'bug_status' | 'bug_type'

export interface Setting {
  id: number
  settingType: SettingType
  settingValue: string
  displayOrder: number
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CreateSettingData {
  settingType: SettingType
  settingValue: string
  displayOrder?: number
  createdBy: string
}

export interface UpdateSettingData {
  settingValue?: string
  displayOrder?: number
  isActive?: boolean
}

/**
 * Get a single setting by ID
 */
export async function getSettingById(id: number): Promise<Setting | null> {
  try {
    const sql = `
      SELECT
        id,
        setting_type as settingType,
        setting_value as settingValue,
        display_order as displayOrder,
        is_active as isActive,
        created_by as createdBy,
        created_at as createdAt,
        updated_at as updatedAt
      FROM settings
      WHERE id = ?
    `

    const results = await query<Setting[]>(sql, [id])
    return results.length > 0 ? results[0] : null
  } catch (error) {
    console.error('Error fetching setting by ID:', error)
    throw new Error('Failed to fetch setting')
  }
}

/**
 * Get all settings, optionally filtered by type and active status
 */
export async function getSettings(
  settingType?: SettingType,
  activeOnly: boolean = true
): Promise<Setting[]> {
  try {
    let sql = `
      SELECT
        id,
        setting_type as settingType,
        setting_value as settingValue,
        display_order as displayOrder,
        is_active as isActive,
        created_by as createdBy,
        created_at as createdAt,
        updated_at as updatedAt
      FROM settings
      WHERE 1=1
    `
    const params: any[] = []

    if (settingType) {
      sql += ' AND setting_type = ?'
      params.push(settingType)
    }

    if (activeOnly) {
      sql += ' AND is_active = TRUE'
    }

    sql += ' ORDER BY setting_type, display_order, setting_value'

    const results = await query(sql, params)
    return results as Setting[]
  } catch (error) {
    console.error('Error fetching settings:', error)
    throw new Error('Failed to fetch settings')
  }
}

/**
 * Get settings grouped by type (for dropdown population)
 */
export async function getSettingsByType(): Promise<Record<SettingType, string[]>> {
  try {
    const settings = await getSettings(undefined, true)
    
    const grouped: Record<string, string[]> = {}
    
    settings.forEach(setting => {
      if (!grouped[setting.settingType]) {
        grouped[setting.settingType] = []
      }
      grouped[setting.settingType].push(setting.settingValue)
    })
    
    return grouped as Record<SettingType, string[]>
  } catch (error) {
    console.error('Error fetching settings by type:', error)
    throw new Error('Failed to fetch settings by type')
  }
}

/**
 * Create a new setting
 */
export async function createSetting(data: CreateSettingData): Promise<Setting> {
  try {
    const sql = `
      INSERT INTO settings (
        setting_type,
        setting_value,
        display_order,
        created_by
      ) VALUES (?, ?, ?, ?)
    `
    
    const displayOrder = data.displayOrder ?? 0
    
    const result = await query(sql, [
      data.settingType,
      data.settingValue,
      displayOrder,
      data.createdBy
    ])
    
    const insertId = (result as any).insertId
    const newSetting = await getSettingById(insertId)
    
    if (!newSetting) {
      throw new Error('Failed to retrieve created setting')
    }
    
    return newSetting
  } catch (error: any) {
    console.error('Error creating setting:', error)
    
    // Check for duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('A setting with this type and value already exists')
    }
    
    throw new Error('Failed to create setting')
  }
}

/**
 * Update an existing setting
 */
export async function updateSetting(id: number, data: UpdateSettingData): Promise<Setting> {
  try {
    const updates: string[] = []
    const params: any[] = []
    
    if (data.settingValue !== undefined) {
      updates.push('setting_value = ?')
      params.push(data.settingValue)
    }
    
    if (data.displayOrder !== undefined) {
      updates.push('display_order = ?')
      params.push(data.displayOrder)
    }
    
    if (data.isActive !== undefined) {
      updates.push('is_active = ?')
      params.push(data.isActive)
    }
    
    if (updates.length === 0) {
      throw new Error('No fields to update')
    }
    
    params.push(id)
    
    const sql = `
      UPDATE settings
      SET ${updates.join(', ')}
      WHERE id = ?
    `
    
    await query(sql, params)
    
    const updatedSetting = await getSettingById(id)
    
    if (!updatedSetting) {
      throw new Error('Failed to retrieve updated setting')
    }
    
    return updatedSetting
  } catch (error: any) {
    console.error('Error updating setting:', error)
    
    // Check for duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('A setting with this type and value already exists')
    }
    
    throw new Error('Failed to update setting')
  }
}

/**
 * Delete a setting (soft delete by setting isActive to false)
 */
export async function deleteSetting(id: number): Promise<boolean> {
  try {
    const sql = `
      UPDATE settings
      SET is_active = FALSE
      WHERE id = ?
    `
    
    await query(sql, [id])
    return true
  } catch (error) {
    console.error('Error deleting setting:', error)
    throw new Error('Failed to delete setting')
  }
}

/**
 * Permanently delete a setting (hard delete)
 */
export async function permanentlyDeleteSetting(id: number): Promise<boolean> {
  try {
    const sql = 'DELETE FROM settings WHERE id = ?'
    await query(sql, [id])
    return true
  } catch (error) {
    console.error('Error permanently deleting setting:', error)
    throw new Error('Failed to permanently delete setting')
  }
}

/**
 * Reorder settings within a type
 */
export async function reorderSettings(
  settingType: SettingType,
  orderedIds: number[]
): Promise<boolean> {
  try {
    // Update display_order for each setting
    for (let i = 0; i < orderedIds.length; i++) {
      const sql = `
        UPDATE settings
        SET display_order = ?
        WHERE id = ? AND setting_type = ?
      `
      await query(sql, [i, orderedIds[i], settingType])
    }
    
    return true
  } catch (error) {
    console.error('Error reordering settings:', error)
    throw new Error('Failed to reorder settings')
  }
}

