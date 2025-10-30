'use client'

/**
 * Create Project Page
 * 
 * Form for creating new projects and sub-projects
 * Only accessible to admin and top_management
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProjectSelector from '@/components/ProjectSelector'

export default function CreateProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [employeeId, setEmployeeId] = useState<string>('')

  const [formData, setFormData] = useState({
    projectName: '',
    parentProjectId: null as string | null,
    description: '',
    status: 'Active' as 'Active' | 'Inactive'
  })

  useEffect(() => {
    // Get user info from localStorage
    const role = localStorage.getItem('userRole') || ''
    const empId = localStorage.getItem('employeeId') || ''

    setUserRole(role)
    setEmployeeId(empId)

    // Check permissions: admin, top_management, or AM-0001
    const hasPermission = role === 'admin' || role === 'top_management' || empId === 'AM-0001'
    if (!hasPermission) {
      router.push('/projects')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.projectName.trim()) {
      setError('Project name is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          createdBy: employeeId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create project')
      }

      const newProject = await response.json()
      
      // Redirect to project details page
      router.push(`/projects/${newProject.projectId}`)
    } catch (err) {
      console.error('Error creating project:', err)
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/projects')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
          <p className="mt-2 text-gray-600">
            Add a new project or sub-project to your organization
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter project name"
                required
                disabled={loading}
              />
              <p className="mt-1 text-sm text-gray-500">
                Choose a clear, descriptive name for your project
              </p>
            </div>

            {/* Parent Project */}
            <ProjectSelector
              value={formData.parentProjectId}
              onChange={(projectId) => setFormData({ ...formData, parentProjectId: projectId })}
              disabled={loading}
              required={false}
              includeNone={true}
              label="Parent Project (Optional)"
            />
            <p className="mt-1 text-sm text-gray-500">
              Select a parent project to create a sub-project. Leave empty for a main project.
            </p>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter project description (optional)"
                disabled={loading}
              />
              <p className="mt-1 text-sm text-gray-500">
                Provide additional details about the project's purpose and scope
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Active projects are available for task/bug assignment
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Project Hierarchy Rules</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Main projects have no parent project</li>
                <li>• Sub-projects must have a parent project</li>
                <li>• Sub-projects cannot have their own sub-projects (2-level maximum)</li>
                <li>• Project IDs are auto-generated (PRJ-001, PRJ-002, etc.)</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

