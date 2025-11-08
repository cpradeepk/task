'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface GroupedSettings {
  task_status: string[]
  bug_status: string[]
  task_priority: string[]  // Singular (from getSettingsByType mapping)
  bug_priority: string[]
  bug_severity: string[]
  bug_category: string[]
  leave_type: string[]
  project_status: string[]
  department: string[]     // ✅ ADDED - Singular (from getSettingsByType mapping)
  [key: string]: string[]
}

interface SettingsContextType {
  settings: GroupedSettings | null
  isLoading: boolean
  error: string | null
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

// Global in-memory cache to prevent duplicate API calls across components
let settingsCache: GroupedSettings | null = null
let settingsCachePromise: Promise<GroupedSettings> | null = null

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GroupedSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadSettings = async () => {
    // Return cached data if available
    if (settingsCache) {
      setSettings(settingsCache)
      setHasLoaded(true)
      setIsLoading(false)
      return
    }

    // If a request is already in progress, wait for it
    if (settingsCachePromise) {
      try {
        const data = await settingsCachePromise
        setSettings(data)
        setHasLoaded(true)
        setIsLoading(false)
        return
      } catch (err) {
        // Fall through to make a new request
      }
    }

    // Prevent duplicate loads
    if (hasLoaded && settings) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Create a promise for this request
      settingsCachePromise = fetch('/api/settings?grouped=true&activeOnly=true')
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            settingsCache = data.data
            return data.data
          } else {
            throw new Error(data.error || 'Failed to load settings')
          }
        })

      const data = await settingsCachePromise
      setSettings(data)
      setHasLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
      settingsCachePromise = null // Clear failed promise
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSettings = async () => {
    // Clear cache to force a fresh fetch
    settingsCache = null
    settingsCachePromise = null
    setHasLoaded(false)
    await loadSettings()
  }

  useEffect(() => {
    loadSettings()
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, isLoading, error, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

/**
 * Helper function to fetch settings with caching
 * Use this in components that can't use the useSettings hook (e.g., in useEffect)
 * This prevents duplicate API calls by using the same cache as SettingsProvider
 */
export async function fetchSettingsWithCache(): Promise<GroupedSettings> {
  // Return cached data if available
  if (settingsCache) {
    return settingsCache
  }

  // If a request is already in progress, wait for it
  if (settingsCachePromise) {
    return settingsCachePromise
  }

  // Create a new request
  settingsCachePromise = fetch('/api/settings?grouped=true&activeOnly=true')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        settingsCache = data.data
        return data.data
      } else {
        throw new Error(data.error || 'Failed to load settings')
      }
    })
    .catch(err => {
      settingsCachePromise = null // Clear failed promise
      throw err
    })

  return settingsCachePromise
}
