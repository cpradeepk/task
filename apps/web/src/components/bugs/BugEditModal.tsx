'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bug } from '@/lib/types'
import { X, Save, FileText, AlertTriangle, Tag, Monitor, Globe, Clock, FolderTree } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { useSettingsIcons } from '@/hooks/useSettingsIcons'
import { getBugDisplayId } from '@/lib/data'
import { getCurrentDateTime } from '@/lib/datetime-utils'

interface BugEditModalProps {
  bug: Bug | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function BugEditModal({ bug, isOpen, onClose, onUpdate }: BugEditModalProps) {
  const [formData, setFormData] = useState<Partial<Bug>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [subprojects, setSubprojects] = useState<any[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingSubprojects, setIsLoadingSubprojects] = useState(false)
  const [projectsLoaded, setProjectsLoaded] = useState(false)

  const { settings, isLoading: isLoadingSettings } = useSettings()
  const { getIcon } = useSettingsIcons()

  // Ref for the modal content to detect clicks outside
  const modalContentRef = useRef<HTMLDivElement>(null)

  // Get options from settings (dynamic from database)
  const bugStatusOptions = settings?.bug_status || []
  const severityOptions = settings?.severity || ['Critical', 'Major', 'Minor']
  const categoryOptions = settings?.category || ['UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other']
  const platformOptions = settings?.platform || ['Web', 'iOS', 'Android', 'All']
  const environmentOptions = settings?.environment || ['Development', 'Staging', 'UAT', 'Production']
  const bugTypeOptions = settings?.bug_type || ['feature', 'bug', 'other', 'release']

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/users')
        const data = await response.json()
        if (data.success) {
          setUsers(data.data.filter((u: any) => u.status === 'active'))
        }
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    loadUsers()
  }, [])

  // Load projects (main projects only, no subprojects)
  const loadProjects = useCallback(async () => {
    if (projectsLoaded) return

    try {
      setIsLoadingProjects(true)
      const response = await fetch('/api/projects?type=main')
      const data = await response.json()

      // API returns array directly, not wrapped in {success, data}
      if (Array.isArray(data)) {
        // Filter to only main projects (no parent) and sort by projectId
        const mainProjects = data.filter((p: any) => !p.parentProjectId)
        const sorted = mainProjects.sort((a: any, b: any) => {
          const idA = a.projectId || ''
          const idB = b.projectId || ''
          return idA.localeCompare(idB)
        })
        setProjects(sorted)
        setProjectsLoaded(true)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [projectsLoaded])

  // Load subprojects when project changes
  const loadSubprojects = useCallback(async (projectId: string) => {
    if (!projectId) {
      setSubprojects([])
      return
    }

    try {
      setIsLoadingSubprojects(true)
      const response = await fetch(`/api/projects?parentId=${projectId}`)
      const data = await response.json()

      // API returns array directly, not wrapped in {success, data}
      if (Array.isArray(data)) {
        // Filter to only subprojects of the selected project and sort by projectId
        const projectSubprojects = data.filter((p: any) => p.parentProjectId === projectId)
        const sorted = projectSubprojects.sort((a: any, b: any) => {
          const idA = a.projectId || ''
          const idB = b.projectId || ''
          return idA.localeCompare(idB)
        })
        setSubprojects(sorted)
      }
    } catch (error) {
      console.error('Failed to load subprojects:', error)
    } finally {
      setIsLoadingSubprojects(false)
    }
  }, [])

  // Load projects on mount
  useEffect(() => {
    if (isOpen) {
      loadProjects()
    }
  }, [isOpen, loadProjects])

  // Load subprojects when project changes
  useEffect(() => {
    if (formData.projectId) {
      loadSubprojects(formData.projectId)
    }
  }, [formData.projectId, loadSubprojects])

  // Initialize form data when bug changes
  useEffect(() => {
    if (bug && isOpen) {
      setFormData({
        bugId: bug.bugId,
        title: bug.title,
        description: bug.description,
        severity: bug.severity,
        status: bug.status,
        category: bug.category,
        platform: bug.platform,
        assignedTo: bug.assignedTo || '',
        environment: bug.environment,
        browserInfo: bug.browserInfo || '',
        deviceInfo: bug.deviceInfo || '',
        expectedBehavior: bug.expectedBehavior || '',
        actualBehavior: bug.actualBehavior || '',
        serverLogs: bug.serverLogs || '',
        frontendLogs: bug.frontendLogs || '',
        estimatedHours: bug.estimatedHours,
        actualHours: bug.actualHours,
        tags: bug.tags || '',
        relatedBugs: bug.relatedBugs || '',
        projectId: bug.projectId || '',
        subprojectId: bug.subprojectId || '',
        feature: bug.feature || '',
        type: bug.type || null,
        developmentPrompt: bug.developmentPrompt || '',
        startDate: bug.startDate,
        endDate: bug.endDate,
      })

      // Load subprojects for the bug's project when modal opens
      if (bug.projectId) {
        loadSubprojects(bug.projectId)
      }
    }
  }, [bug, isOpen, loadSubprojects])

  // Reset loaded flags when modal closes
  useEffect(() => {
    if (!isOpen) {
      setProjectsLoaded(false)
    }
  }, [isOpen])

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      // Add event listener with a slight delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bug) return

    setIsLoading(true)
    setError('')

    try {
      const updates = {
        ...formData,
        updatedAt: getCurrentDateTime()
      }

      const response = await fetch(`/api/bugs/${bug.bugId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update bug')
      }

      onUpdate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bug')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !bug) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div ref={modalContentRef} className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Bug</h2>
            <p className="text-sm text-gray-500 mt-1">{getBugDisplayId(bug.bugId, bug.type)}</p>
          </div>
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Project and Subproject - MOVED TO TOP */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <FolderTree className="h-4 w-4 inline mr-2" />
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.projectId || ''}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, projectId: value || '', subprojectId: '' })
                }}
                required
                disabled={isLoadingProjects}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select project...</option>
                {projects.map(project => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.projectName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Subproject <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.subprojectId || ''}
                onChange={(e) => setFormData({ ...formData, subprojectId: e.target.value || '' })}
                required
                disabled={!formData.projectId || isLoadingSubprojects}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select subproject...</option>
                {subprojects.map(subproject => (
                  <option key={subproject.projectId} value={subproject.projectId}>
                    {subproject.projectName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Feature (Title) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4 inline mr-2" />
              Feature <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., User Login, Payment Gateway, Dashboard"
            />
            <p className="text-xs text-gray-500">Specify which feature this bug is related to</p>
          </div>

          {/* Steps to Reproduce / Feature Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {formData.type === 'feature' ? 'Feature Description' : 'Steps to Reproduce'} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={formData.type === 'feature'
                ? "Describe the feature in detail..."
                : "Please provide step-by-step instructions:&#10;1. Go to...&#10;2. Click on...&#10;3. Observe the error..."}
            />
          </div>

          {/* Criticality, Category, Platform - 3 columns (removed Priority) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Criticality <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.severity || ''}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as Bug['severity'] })}
                required
                disabled={isLoadingSettings}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {severityOptions.map((severity) => {
                  const icon = getIcon('severities', severity)
                  return (
                    <option key={severity} value={severity}>
                      {icon && `${icon} `}{severity}
                    </option>
                  )
                })}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Tag className="h-4 w-4 inline mr-2" />
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Bug['category'] })}
                required
                disabled={isLoadingSettings}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {categoryOptions.map((category) => {
                  const icon = getIcon('categories', category)
                  return (
                    <option key={category} value={category}>
                      {icon && `${icon} `}{category}
                    </option>
                  )
                })}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Monitor className="h-4 w-4 inline mr-2" />
                Platform <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.platform || ''}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value as Bug['platform'] })}
                required
                disabled={isLoadingSettings}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {platformOptions.map((platform) => {
                  const icon = getIcon('platforms', platform)
                  return (
                    <option key={platform} value={platform}>
                      {icon && `${icon} `}{platform}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status || ''}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Bug['status'] })}
              required
              disabled={isLoadingSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {bugStatusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Environment */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Globe className="h-4 w-4 inline mr-2" />
              Environment <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.environment || ''}
              onChange={(e) => setFormData({ ...formData, environment: e.target.value as Bug['environment'] })}
              required
              disabled={isLoadingSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {environmentOptions.map((env) => {
                const icon = getIcon('environments', env)
                return (
                  <option key={env} value={env}>
                    {icon && `${icon} `}{env}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Browser and Device Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Monitor className="h-4 w-4 inline mr-2" />
                Browser Information
              </label>
              <select
                value={formData.browserInfo?.includes('Chrome') ? 'Chrome' :
                  formData.browserInfo?.includes('Firefox') ? 'Firefox' :
                    formData.browserInfo?.includes('Safari') ? 'Safari' :
                      formData.browserInfo?.includes('Edge') ? 'Edge' :
                        formData.browserInfo ? 'Other' : ''}
                onChange={(e) => {
                  if (e.target.value === 'Other' || e.target.value === '') {
                    setFormData({ ...formData, browserInfo: '' })
                  } else {
                    setFormData({ ...formData, browserInfo: e.target.value })
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select browser...</option>
                <option value="Chrome">Chrome</option>
                <option value="Firefox">Firefox</option>
                <option value="Safari">Safari</option>
                <option value="Edge">Edge</option>
                <option value="Other">Other</option>
              </select>
              {(formData.browserInfo && !['Chrome', 'Firefox', 'Safari', 'Edge'].some(b => formData.browserInfo === b)) && (
                <input
                  type="text"
                  value={formData.browserInfo || ''}
                  onChange={(e) => setFormData({ ...formData, browserInfo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Chrome 120.0.0, Firefox 115.0"
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Monitor className="h-4 w-4 inline mr-2" />
                Device Information
              </label>
              <select
                value={formData.deviceInfo?.includes('Desktop') ? 'Desktop' :
                  formData.deviceInfo?.includes('iPhone') ? 'iPhone' :
                    formData.deviceInfo?.includes('iPad') ? 'iPad' :
                      formData.deviceInfo?.includes('Android') ? 'Android' :
                        formData.deviceInfo ? 'Other' : ''}
                onChange={(e) => {
                  if (e.target.value === 'Other' || e.target.value === '') {
                    setFormData({ ...formData, deviceInfo: '' })
                  } else {
                    setFormData({ ...formData, deviceInfo: e.target.value })
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select device...</option>
                <option value="Desktop">Desktop</option>
                <option value="iPhone">iPhone</option>
                <option value="iPad">iPad</option>
                <option value="Android">Android</option>
                <option value="Other">Other</option>
              </select>
              {(formData.deviceInfo && !['Desktop', 'iPhone', 'iPad', 'Android'].some(d => formData.deviceInfo === d)) && (
                <input
                  type="text"
                  value={formData.deviceInfo || ''}
                  onChange={(e) => setFormData({ ...formData, deviceInfo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., iPhone 15 Pro, Samsung Galaxy S23"
                />
              )}
            </div>
          </div>

          {/* Assigned To and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Assigned To
              </label>
              <select
                value={formData.assignedTo || ''}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.employeeId} value={user.employeeId}>
                    {user.name} ({user.employeeId})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                value={formData.type || ''}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Bug['type'] })}
                disabled={isLoadingSettings}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select type...</option>
                {bugTypeOptions.map((type) => {
                  const icon = getIcon('bug_types', type)
                  return (
                    <option key={type} value={type}>
                      {icon && `${icon} `}{type}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {/* Hide these fields for feature-type bugs */}
          {formData.type !== 'feature' && (
            <>
              {/* Expected vs Actual Behavior */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Expected Behavior
                  </label>
                  <textarea
                    value={formData.expectedBehavior || ''}
                    onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="What should happen..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Actual Behavior
                  </label>
                  <textarea
                    value={formData.actualBehavior || ''}
                    onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="What actually happens..."
                  />
                </div>
              </div>

              {/* Server Logs and Frontend Logs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Server Logs
                  </label>
                  <textarea
                    value={formData.serverLogs || ''}
                    onChange={(e) => setFormData({ ...formData, serverLogs: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                    placeholder="Server-side logs, stack traces, or error messages..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Frontend Logs
                  </label>
                  <textarea
                    value={formData.frontendLogs || ''}
                    onChange={(e) => setFormData({ ...formData, frontendLogs: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                    placeholder="Browser console logs, JavaScript errors, or network errors..."
                  />
                </div>
              </div>
            </>
          )}

          {/* Development Prompt */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4 inline mr-2" />
              Development Prompt
            </label>
            <textarea
              value={formData.developmentPrompt || ''}
              onChange={(e) => setFormData({ ...formData, developmentPrompt: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Optional: Add development instructions or prompts for fixing this bug..."
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Tag className="h-4 w-4 inline mr-2" />
              Tags
            </label>
            <input
              type="text"
              value={formData.tags || ''}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="login, authentication, security"
            />
            <p className="text-xs text-gray-500">Comma-separated tags</p>
          </div>

          {/* Start Date and End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4 inline mr-2" />
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4 inline mr-2" />
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Related Items (Tasks/Bugs) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Related Items
            </label>
            <input
              type="text"
              value={formData.relatedBugs || ''}
              onChange={(e) => setFormData({ ...formData, relatedBugs: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., JSR-0001, JSR-0002, BUG-0001 (comma-separated)"
            />
            <p className="text-xs text-gray-500">Enter comma-separated task or bug IDs to link related work items</p>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 -mb-6 px-6 py-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

