/**
 * Icon Mappings Utility
 * 
 * This module provides utilities to retrieve icons for dropdown values
 * from the settings table metadata. Icons are stored in the metadata field
 * as JSON: { "icons": { "value": "emoji" } }
 */

// Cache for settings metadata to avoid repeated API calls
let settingsCache: Map<string, any> | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Load settings metadata from API
 */
async function loadSettingsMetadata(): Promise<Map<string, any>> {
  try {
    const response = await fetch('/api/settings', {
      credentials: 'include'
    })
    const data = await response.json()

    if (data.success && data.data) {
      const metadataMap = new Map<string, any>()
      
      data.data.forEach((setting: any) => {
        if (setting.metadata && setting.metadata.icons) {
          metadataMap.set(setting.key, setting.metadata.icons)
        }
      })

      return metadataMap
    }
  } catch (error) {
    console.error('Failed to load settings metadata:', error)
  }

  return new Map()
}

/**
 * Get cached settings metadata or load fresh if cache is expired
 */
async function getSettingsMetadata(): Promise<Map<string, any>> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (settingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return settingsCache
  }

  // Load fresh data
  settingsCache = await loadSettingsMetadata()
  cacheTimestamp = now

  return settingsCache
}

/**
 * Clear the settings metadata cache
 * Call this when settings are updated in the admin UI
 */
export function clearIconCache(): void {
  settingsCache = null
  cacheTimestamp = 0
}

/**
 * Get icon for a specific setting value
 * 
 * @param settingKey - The setting key (e.g., 'severities', 'categories')
 * @param value - The value to get icon for (e.g., 'Critical', 'UI')
 * @param fallback - Fallback icon if not found (default: '')
 * @returns The icon emoji or fallback
 * 
 * @example
 * const icon = await getIconForSettingValue('severities', 'Critical')
 * // Returns: '🔴'
 */
export async function getIconForSettingValue(
  settingKey: string,
  value: string,
  fallback: string = ''
): Promise<string> {
  const metadata = await getSettingsMetadata()
  const icons = metadata.get(settingKey)

  if (icons && icons[value]) {
    return icons[value]
  }

  return fallback
}

/**
 * Get all icons for a specific setting
 * 
 * @param settingKey - The setting key (e.g., 'severities', 'categories')
 * @returns Object mapping values to icons, or empty object if not found
 * 
 * @example
 * const icons = await getIconsForSetting('severities')
 * // Returns: { 'Critical': '🔴', 'Major': '🟠', 'Minor': '🟡' }
 */
export async function getIconsForSetting(settingKey: string): Promise<Record<string, string>> {
  const metadata = await getSettingsMetadata()
  const icons = metadata.get(settingKey)

  return icons || {}
}

/**
 * Synchronous version using fallback icon mappings
 * Use this for initial render before async data is loaded
 */
export function getIconForSettingValueSync(
  settingKey: string,
  value: string,
  fallback: string = ''
): string {
  // Fallback icon mappings for common settings
  const fallbackMappings: Record<string, Record<string, string>> = {
    severities: {
      'Critical': '🔴',
      'Major': '🟠',
      'Minor': '🟡'
    },
    categories: {
      'UI': '🎨',
      'API': '🔌',
      'Backend': '⚙️',
      'Performance': '⚡',
      'Security': '🔒',
      'Database': '🗄️',
      'Integration': '🔗',
      'Other': '📋'
    },
    platforms: {
      'Web': '🌐',
      'iOS': '📱',
      'Android': '🤖',
      'All': '🔄'
    },
    environments: {
      'Production': '🚀',
      'Staging': '🧪',
      'UAT': '🔍',
      'Development': '💻'
    },
    bug_types: {
      'testcase': '🧪',
      'feature': '✨',
      'bug': '🐛',
      'other': '📋'
    },
    task_statuses: {
      'Not Started': '⚪',
      'In Progress': '🔵',
      'On Hold': '🟡',
      'Done': '🟢',
      'Cancelled': '🔴',
      'Blocked': '🚫',
      'Review': '👀',
      'Testing': '🧪'
    },
    bug_statuses: {
      'New': '🆕',
      'In Progress': '🔵',
      'Resolved': '✅',
      'Closed': '🔒',
      'Reopened': '🔄'
    },
    task_priorities: {
      'U&I (Urgent & Important)': '🔴',
      'NU&I (Not Urgent & Important)': '🟠',
      'NI&U (Not Important & Urgent)': '🟡',
      'NU&NI (Not Urgent & Not Important)': '⚪'
    }
  }

  const icons = fallbackMappings[settingKey]
  if (icons && icons[value]) {
    return icons[value]
  }

  return fallback
}

/**
 * Get all icons for a setting (synchronous version)
 */
export function getIconsForSettingSync(settingKey: string): Record<string, string> {
  const fallbackMappings: Record<string, Record<string, string>> = {
    severities: {
      'Critical': '🔴',
      'Major': '🟠',
      'Minor': '🟡'
    },
    categories: {
      'UI': '🎨',
      'API': '🔌',
      'Backend': '⚙️',
      'Performance': '⚡',
      'Security': '🔒',
      'Database': '🗄️',
      'Integration': '🔗',
      'Other': '📋'
    },
    platforms: {
      'Web': '🌐',
      'iOS': '📱',
      'Android': '🤖',
      'All': '🔄'
    },
    environments: {
      'Production': '🚀',
      'Staging': '🧪',
      'UAT': '🔍',
      'Development': '💻'
    },
    bug_types: {
      'testcase': '🧪',
      'feature': '✨',
      'bug': '🐛',
      'other': '📋'
    },
    task_statuses: {
      'Not Started': '⚪',
      'In Progress': '🔵',
      'On Hold': '🟡',
      'Done': '🟢',
      'Cancelled': '🔴',
      'Blocked': '🚫',
      'Review': '👀',
      'Testing': '🧪'
    },
    bug_statuses: {
      'New': '🆕',
      'In Progress': '🔵',
      'Resolved': '✅',
      'Closed': '🔒',
      'Reopened': '🔄'
    },
    task_priorities: {
      'U&I (Urgent & Important)': '🔴',
      'NU&I (Not Urgent & Important)': '🟠',
      'NI&U (Not Important & Urgent)': '🟡',
      'NU&NI (Not Urgent & Not Important)': '⚪'
    }
  }

  return fallbackMappings[settingKey] || {}
}

