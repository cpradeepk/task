'use client'

/**
 * Projects List Page
 * 
 * Displays all projects in a hierarchical tree view
 * Allows admin/top_management to create, edit, and delete projects
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Project } from '@/lib/types'

interface ProjectNode extends Project {
  children?: ProjectNode[]
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem('userRole') || ''
    setUserRole(role)
    
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

  const handleCreateProject = () => {
    router.push('/projects/create')
  }

  const handleViewProject = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const canManageProjects = userRole === 'admin' || userRole === 'top_management'

  // Render project tree recursively
  const renderProjectTree = (nodes: ProjectNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.projectId} className={`${level > 0 ? 'ml-8' : ''}`}>
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {level > 0 && (
                  <span className="text-gray-400">└─</span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {node.projectName}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  node.status === 'Active' 
                    ? 'bg-green-100 text-green-800'
                    : node.status === 'Inactive'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {node.status}
                </span>
                {!node.parentProjectId && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    Main Project
                  </span>
                )}
              </div>
              
              {node.description && (
                <p className="mt-2 text-sm text-gray-600">
                  {node.description}
                </p>
              )}
              
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span>ID: {node.projectId}</span>
                <span>Created: {new Date(node.createdAt).toLocaleDateString()}</span>
                {node.children && node.children.length > 0 && (
                  <span className="font-medium text-blue-600">
                    {node.children.length} sub-project{node.children.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            
            <button
              onClick={() => handleViewProject(node.projectId)}
              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
        
        {/* Render sub-projects */}
        {node.children && node.children.length > 0 && (
          <div className="mt-2">
            {renderProjectTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading projects...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
              <p className="mt-2 text-gray-600">
                Manage your project hierarchy and organization
              </p>
            </div>
            
            {canManageProjects && (
              <button
                onClick={handleCreateProject}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                + Create Project
              </button>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchProjects}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Projects List */}
        {!error && projects.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first project</p>
            {canManageProjects && (
              <button
                onClick={handleCreateProject}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Project
              </button>
            )}
          </div>
        )}

        {!error && projects.length > 0 && (
          <div>
            {renderProjectTree(projects)}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Project Hierarchy</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Main projects can have sub-projects</li>
            <li>• Sub-projects cannot have further sub-projects (2-level maximum)</li>
            <li>• Only admin and top management can create/delete projects</li>
            <li>• Projects can be marked as Active, Inactive, or Deleted</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

