'use client'

/**
 * Project Details Page
 * 
 * Displays project information, sub-projects, and associated tasks/bugs
 * Allows admin/top_management to edit and delete projects
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Project } from '@/lib/types'

interface ProjectWithSubProjects extends Project {
  subProjects?: Project[]
}

export default function ProjectDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const [project, setProject] = useState<ProjectWithSubProjects | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [employeeId, setEmployeeId] = useState<string>('')
  const [deleting, setDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    projectName: '',
    description: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Deleted'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Get user info from localStorage
    const role = localStorage.getItem('userRole') || ''
    const empId = localStorage.getItem('employeeId') || ''
    
    setUserRole(role)
    setEmployeeId(empId)
    
    fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Project not found')
        }
        throw new Error('Failed to fetch project')
      }
      
      const data = await response.json()
      setProject(data)
      setEditData({
        projectName: data.projectName,
        description: data.description || '',
        status: data.status
      })
    } catch (err) {
      console.error('Error fetching project:', err)
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (project) {
      setEditData({
        projectName: project.projectName,
        description: project.description || '',
        status: project.status
      })
    }
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (!editData.projectName.trim()) {
      alert('Project name is required')
      return
    }

    try {
      setSaving(true)

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...editData,
          updatedBy: employeeId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update project')
      }

      // Refresh project data
      await fetchProject()
      setIsEditing(false)
      alert('Project updated successfully')
    } catch (err) {
      console.error('Error updating project:', err)
      alert(err instanceof Error ? err.message : 'Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deletedBy: employeeId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete project')
      }

      // Redirect to projects list
      router.push('/projects')
    } catch (err) {
      console.error('Error deleting project:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete project')
    } finally {
      setDeleting(false)
    }
  }

  const handleBack = () => {
    router.push('/projects')
  }

  const canManageProjects = userRole === 'admin' || userRole === 'top_management'
  const canDelete = userRole === 'admin'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading project...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-900 mb-2">Error</h3>
            <p className="text-red-800">{error || 'Project not found'}</p>
            <button
              onClick={handleBack}
              className="mt-4 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              ← Back to Projects
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>
        </div>

        {/* Project Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {isEditing ? (
            /* Edit Mode */
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Project</h2>

              <div className="space-y-4">
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={editData.projectName}
                    onChange={(e) => setEditData({ ...editData, projectName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter project name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter project description"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as 'Active' | 'Inactive' | 'Deleted' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Deleted">Deleted</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* View Mode */
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{project.projectName}</h1>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      project.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : project.status === 'Inactive'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {project.status}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm">Project ID: {project.projectId}</p>
                </div>

                <div className="flex items-center gap-3">
                  {canManageProjects && (
                    <button
                      onClick={handleEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Edit Project
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {deleting ? 'Deleting...' : 'Delete Project'}
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              {project.description && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
                  <p className="text-gray-600">{project.description}</p>
                </div>
              )}
            </>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500">Created By</p>
              <p className="font-medium text-gray-900">{project.createdBy}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="font-medium text-gray-900">
                {new Date(project.createdAt).toLocaleString()}
              </p>
            </div>
            {project.parentProjectId && (
              <div>
                <p className="text-sm text-gray-500">Parent Project</p>
                <p className="font-medium text-gray-900">{project.parentProjectId}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium text-gray-900">
                {new Date(project.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Projects */}
        {project.subProjects && project.subProjects.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Sub-Projects ({project.subProjects.length})
            </h2>
            <div className="space-y-3">
              {project.subProjects.map(subProject => (
                <div
                  key={subProject.projectId}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/projects/${subProject.projectId}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{subProject.projectName}</h3>
                      <p className="text-sm text-gray-600 mt-1">{subProject.projectId}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      subProject.status === 'Active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {subProject.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Project Management</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Tasks and bugs can be assigned to this project</li>
            <li>• Only admin can delete projects</li>
            <li>• Projects with sub-projects cannot be deleted</li>
            {!project.parentProjectId && (
              <li>• This is a main project and can have sub-projects</li>
            )}
            {project.parentProjectId && (
              <li>• This is a sub-project and cannot have further sub-projects</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

