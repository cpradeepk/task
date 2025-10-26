'use client'

/**
 * ProjectSelector Component
 * 
 * A hierarchical dropdown for selecting projects and sub-projects
 * Displays projects in a tree structure with proper indentation
 * 
 * Features:
 * - Hierarchical display (Main Project → Sub-Project)
 * - Optional "None" option for clearing selection
 * - Disabled state support
 * - Automatic project fetching
 * - Loading state
 */

import { useState, useEffect } from 'react'
import { Project } from '@/lib/types'

interface ProjectSelectorProps {
  value?: string | null
  onChange: (projectId: string | null) => void
  disabled?: boolean
  required?: boolean
  includeNone?: boolean
  className?: string
  label?: string
}

interface ProjectNode extends Project {
  children?: ProjectNode[]
}

export default function ProjectSelector({
  value,
  onChange,
  disabled = false,
  required = false,
  includeNone = true,
  className = '',
  label = 'Project'
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/projects/hierarchy')
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      
      const data = await response.json()
      setProjects(data)
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value
    onChange(selectedValue === '' ? null : selectedValue)
  }

  // Flatten hierarchy for dropdown display
  const flattenProjects = (nodes: ProjectNode[], level = 0): Array<{ project: Project; level: number }> => {
    const result: Array<{ project: Project; level: number }> = []
    
    for (const node of nodes) {
      result.push({ project: node, level })
      
      if (node.children && node.children.length > 0) {
        result.push(...flattenProjects(node.children, level + 1))
      }
    }
    
    return result
  }

  const flatProjects = flattenProjects(projects)

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || loading}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {loading && (
          <option value="">Loading projects...</option>
        )}
        
        {error && (
          <option value="">Error loading projects</option>
        )}
        
        {!loading && !error && (
          <>
            {includeNone && (
              <option value="">-- None --</option>
            )}
            
            {flatProjects.map(({ project, level }) => (
              <option 
                key={project.projectId} 
                value={project.projectId}
                disabled={project.status !== 'Active'}
              >
                {'\u00A0'.repeat(level * 4)}
                {level > 0 && '└─ '}
                {project.projectName}
                {project.status !== 'Active' && ` (${project.status})`}
              </option>
            ))}
            
            {flatProjects.length === 0 && (
              <option value="">No projects available</option>
            )}
          </>
        )}
      </select>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

