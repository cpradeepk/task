'use client'

/**
 * Requirements entry page (top-level nav).
 *
 * Every authenticated user can open this page; it lists the projects the user
 * is assigned to (/api/projects already filters by project_users for every
 * role) and links into each project's requirements. Editing inside a project
 * is still gated by the per-user can_edit_requirements flag.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Project } from '@/lib/types'
import { FileText, FolderKanban, ChevronRight } from 'lucide-react'

export default function RequirementsProjectPickerPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true)
        setError(null)
        // Same source as the navbar project filter: returns only projects the
        // current user is assigned to (plus their sub-projects), for all roles.
        const response = await fetch('/api/projects')
        if (!response.ok) {
          throw new Error('Failed to fetch projects')
        }
        const data = await response.json()
        setProjects(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error fetching projects:', err)
        setError(err instanceof Error ? err.message : 'Failed to load projects')
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Requirements</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Pick a project to view its requirements document.
        </p>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-900 mb-2">Error</h3>
            <p className="text-red-800">{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600">You are not assigned to any projects yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Ask a project manager to add you to a project to see its requirements.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <button
                key={project.projectId}
                onClick={() => router.push(`/projects/${project.projectId}/requirements`)}
                className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:bg-gray-50 hover:border-indigo-300 transition-colors text-left flex items-center gap-4"
              >
                <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderKanban className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 truncate">{project.projectName}</span>
                    {project.parentProjectId && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full flex-shrink-0">
                        Sub-project of {project.parentProjectId}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {project.projectId}
                    {project.description ? ` · ${project.description}` : ''}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
