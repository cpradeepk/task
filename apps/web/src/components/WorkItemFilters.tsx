'use client'

/**
 * WorkItemFilters Component
 * 
 * Filter controls for the unified work items dashboard
 * Allows filtering by type (tasks/bugs), project, and status
 * 
 * Features:
 * - Tab-based type selection (All, Tasks, Bugs)
 * - Project dropdown filter
 * - Status dropdown filter
 * - Clear filters button
 * - Active filter count badge
 */

import { useState, useEffect } from 'react'
import { Project } from '@/lib/types'

interface WorkItemFiltersProps {
  onFilterChange: (filters: FilterState) => void
  className?: string
}

export interface FilterState {
  type: 'all' | 'task' | 'bug'
  projectId: string | null
  status: string | null
}

export default function WorkItemFilters({ onFilterChange, className = '' }: WorkItemFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    projectId: null,
    status: null
  })
  
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)
      const response = await fetch('/api/projects?status=active')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      type: 'all',
      projectId: null,
      status: null
    })
  }

  const activeFilterCount = [
    filters.type !== 'all',
    filters.projectId !== null,
    filters.status !== null
  ].filter(Boolean).length

  // Common status options for both tasks and bugs
  const statusOptions = [
    'New',
    'In Progress',
    'Completed',
    'On Hold',
    'Resolved',
    'Closed',
    'Reopened'
  ]

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      {/* Type Tabs */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          View
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => updateFilter('type', 'all')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filters.type === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => updateFilter('type', 'task')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filters.type === 'task'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tasks Only
          </button>
          <button
            onClick={() => updateFilter('type', 'bug')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filters.type === 'bug'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Bugs Only
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          <select
            value={filters.projectId || ''}
            onChange={(e) => updateFilter('projectId', e.target.value || null)}
            disabled={loadingProjects}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.projectId} value={project.projectId}>
                {project.parentProjectId && '\u00A0\u00A0\u00A0\u00A0└─ '}
                {project.projectName}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      {activeFilterCount > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
          </span>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}

