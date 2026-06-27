'use client'

import { useState, useEffect } from 'react'
import { Project, ReleaseChecklistTemplate } from '@/lib/types'
import { X } from 'lucide-react'
import ProjectSelector from '@/components/ProjectSelector'
import ReleaseChecklistEditor from '@/components/projects/ReleaseChecklistEditor'
import { DEFAULT_RELEASE_CHECKLIST } from '@/lib/releaseChecklistDefault'

const EMPTY_CHECKLIST: ReleaseChecklistTemplate = { sections: [] }

interface ProjectModalProps {
  project: Project | null
  employeeId: string
  parentProjectId?: string | null  // Optional: pre-select parent project for subproject creation
  onClose: () => void
  onSuccess: () => void
}

export default function ProjectModal({ project, employeeId, parentProjectId, onClose, onSuccess }: ProjectModalProps) {
  const [formData, setFormData] = useState({
    projectName: '',
    parentProjectId: null as string | null,
    description: '',
    status: 'Active' as 'Active' | 'Inactive',
    releaseEnabled: false,
    releaseChecklist: EMPTY_CHECKLIST as ReleaseChecklistTemplate
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (project) {
      // Edit mode - populate form with existing data
      setFormData({
        projectName: project.projectName,
        // Fall back to the parentProjectId prop so the Release toggle (gated on
        // parentProjectId) shows when editing an existing sub-project whose
        // object may not carry parentProjectId.
        parentProjectId: project.parentProjectId ?? parentProjectId ?? null,
        description: project.description || '',
        status: (project.status === 'Deleted' ? 'Inactive' : project.status) as 'Active' | 'Inactive',
        releaseEnabled: project.releaseEnabled ?? false,
        releaseChecklist: project.releaseChecklist ?? EMPTY_CHECKLIST
      })
    } else {
      // Create mode - reset form (with optional pre-selected parent)
      setFormData({
        projectName: '',
        parentProjectId: parentProjectId || null,
        description: '',
        status: 'Active',
        releaseEnabled: false,
        releaseChecklist: EMPTY_CHECKLIST
      })
    }
  }, [project, parentProjectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = project 
        ? `/api/projects/${project.projectId}` 
        : '/api/projects'
      
      const method = project ? 'PUT' : 'POST'
      
      const isSubproject = formData.parentProjectId != null
      const { releaseEnabled, releaseChecklist, ...baseFields } = formData
      const releaseFields = isSubproject
        ? { releaseEnabled, releaseChecklist }
        : { releaseEnabled: false, releaseChecklist: EMPTY_CHECKLIST }

      const body = project
        ? { ...baseFields, ...releaseFields, updatedBy: employeeId }
        : { ...baseFields, ...releaseFields, createdBy: employeeId }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${project ? 'update' : 'create'} project`)
      }

      onSuccess()
    } catch (err) {
      console.error('Error saving project:', err)
      setError(err instanceof Error ? err.message : 'Failed to save project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {project ? 'Edit Project' : 'Add New Project'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="projectName"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter project name"
              required
            />
          </div>

          {/* Parent Project */}
          <div>
            <label htmlFor="parentProject" className="block text-sm font-medium text-gray-700 mb-2">
              Parent Project (Optional)
            </label>
            <ProjectSelector
              value={formData.parentProjectId}
              onChange={(value) => setFormData({ ...formData, parentProjectId: value })}
              includeNone={true}
              required={false}
              label="Parent Project"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to create a main project, or select a parent to create a sub-project
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter project description"
              rows={4}
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Release configuration (sub-projects only) */}
          {formData.parentProjectId != null && (
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.releaseEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, releaseEnabled: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Release enabled
                </span>
              </label>
              <p className="text-sm text-gray-500 -mt-2">
                Enable to allow creating release work-items for this sub-project and to define its release checklist.
              </p>

              {formData.releaseEnabled && (
                <ReleaseChecklistEditor
                  value={formData.releaseChecklist}
                  onChange={(releaseChecklist) =>
                    setFormData({ ...formData, releaseChecklist })
                  }
                  onLoadDefault={() =>
                    setFormData({
                      ...formData,
                      releaseChecklist: DEFAULT_RELEASE_CHECKLIST
                    })
                  }
                />
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

