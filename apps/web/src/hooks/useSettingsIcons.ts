'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to load and cache icons from settings metadata
 * Returns a function to get icons for a specific setting key and value
 */
export function useSettingsIcons() {
  const [iconsMap, setIconsMap] = useState<Map<string, Record<string, string>>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadIcons() {
      try {
        const response = await fetch('/api/settings')
        const data = await response.json()

        if (data.success && data.data) {
          const newIconsMap = new Map<string, Record<string, string>>()

          data.data.forEach((setting: any) => {
            if (setting.metadata && setting.metadata.icons) {
              newIconsMap.set(setting.key, setting.metadata.icons)
            }
          })

          setIconsMap(newIconsMap)
        }
      } catch (error) {
        console.error('Failed to load settings icons:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadIcons()
  }, [])

  /**
   * Get icon for a specific setting value
   * @param settingKey - The setting key (e.g., 'severities', 'categories')
   * @param value - The value to get icon for (e.g., 'Critical', 'UI')
   * @returns The icon emoji or empty string if not found
   */
  const getIcon = (settingKey: string, value: string): string => {
    const icons = iconsMap.get(settingKey)
    return icons?.[value] || ''
  }

  /**
   * Get all icons for a specific setting
   * @param settingKey - The setting key (e.g., 'severities', 'categories')
   * @returns Object mapping values to icons, or empty object if not found
   */
  const getIcons = (settingKey: string): Record<string, string> => {
    return iconsMap.get(settingKey) || {}
  }

  return {
    getIcon,
    getIcons,
    isLoading,
    iconsMap
  }
}

