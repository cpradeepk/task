'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

interface Project {
  id: string
  projectId: string
  projectName: string
  description?: string
  parentProjectId?: string
}

interface ProjectFilterContextType {
  selectedProjectIds: string[]
  setSelectedProjectIds: (ids: string[]) => void
  projects: Project[]
  isLoading: boolean
  error: string | null
  refreshProjects: () => Promise<void>
}

const ProjectFilterContext = createContext<ProjectFilterContextType | undefined>(undefined)

export function ProjectFilterProvider({ children }: { children: ReactNode }) {
  const [selectedProjectIds, setSelectedProjectIdsState] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Fetch active projects
  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      // Send the localStorage token: the auth cookie expires independently of
      // the web session, so cookie-only requests can 401 while the app looks
      // signed in.
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch('/api/projects', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      })
      if (response.status === 401) {
        // App may be mid-auth (stale cookie, token not yet in localStorage).
        // Don't surface a red error — just show no projects.
        setProjects([])
        return
      }
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      const data = await response.json()
      if (Array.isArray(data)) {
        // Only show main projects (no parentProjectId) in the filter dropdown
        const mainProjects = data.filter((p: any) => !p.parentProjectId)
        setProjects(mainProjects)
      } else {
        setProjects([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load selected projects from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('selectedProjectIds')
      if (saved) {
        setSelectedProjectIdsState(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Failed to load selected projects from localStorage', e)
    }
    setIsHydrated(true)
    fetchProjects()
  }, [fetchProjects])

  // Update selected projects and persist to localStorage
  const setSelectedProjectIds = useCallback((ids: string[]) => {
    setSelectedProjectIdsState(ids)
    try {
      localStorage.setItem('selectedProjectIds', JSON.stringify(ids))
    } catch (e) {
      console.error('Failed to save selected projects to localStorage', e)
    }
  }, [])

  return (
    <ProjectFilterContext.Provider
      value={{
        selectedProjectIds,
        setSelectedProjectIds,
        projects,
        isLoading: isLoading || !isHydrated,
        error,
        refreshProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectFilterContext.Provider>
  )
}

export function useProjectFilter() {
  const context = useContext(ProjectFilterContext)
  if (context === undefined) {
    throw new Error('useProjectFilter must be used within a ProjectFilterProvider')
  }
  return context
}
