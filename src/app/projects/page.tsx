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
import Navbar from '@/components/layout/Navbar'
import { Edit, Trash2, Plus } from 'lucide-react'
import ProjectModal from '@/components/projects/ProjectModal'

interface ProjectNode extends Project {
  children?: ProjectNode[]
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [employeeId, setEmployeeId] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // Get user info from localStorage
    const role = localStorage.getItem('userRole') || ''
    const empId = localStorage.getItem('employeeId') || ''
    setUserRole(role)
    setEmployeeId(empId)

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
    setSelectedProject(null)
    setIsModalOpen(true)
  }

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedProject(project)
    setIsModalOpen(true)
  }

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      // Refresh projects list
      await fetchProjects()
    } catch (err) {
      console.error('Error deleting project:', err)
      alert('Failed to delete project. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleViewProject = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedProject(null)
  }

  const handleModalSuccess = () => {
    setIsModalOpen(false)
    setSelectedProject(null)
    fetchProjects()
  }

  const canManageProjects = userRole === 'admin' || userRole === 'top_management'
  const canDelete = userRole === 'admin'

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
            
            <div className="flex items-center gap-2">
              {canManageProjects && (
                <button
                  onClick={(e) => handleEditProject(node, e)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="Edit project"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}

              {canDelete && (
                <button
                  onClick={(e) => handleDeleteProject(node.projectId, e)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete project"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={() => handleViewProject(node.projectId)}
                className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                View Details
              </button>
            </div>
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
      <div>
        <Navbar />
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading projects...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Projects</h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
                Manage your project hierarchy and organization
              </p>
            </div>

            {canManageProjects && (
              <button
                onClick={handleCreateProject}
                className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Add Project
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

      {/* Project Modal */}
      {isModalOpen && (
        <ProjectModal
          project={selectedProject}
          employeeId={employeeId}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}

