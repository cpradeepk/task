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

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GroupedSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadSettings = async () => {
    // Prevent duplicate loads
    if (hasLoaded && settings) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/settings?grouped=true&activeOnly=true')
      const data = await response.json()

      if (data.success) {
        setSettings(data.data)
        setHasLoaded(true)
      } else {
        setError(data.error || 'Failed to load settings')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSettings = async () => {
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

