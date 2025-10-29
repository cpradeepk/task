'use client'

import { useState, useEffect } from 'react'
import { Bug } from '@/lib/types'
import { X, Save, FileText, AlertTriangle, Tag, Monitor, Globe, Clock } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

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

  const { settings, isLoading: isLoadingSettings } = useSettings()

  // Get options from settings
  const bugStatusOptions = settings?.bug_status || []
  const severityOptions = ['Critical', 'Major', 'Minor']
  const priorityOptions = ['High', 'Medium', 'Low']
  const categoryOptions = ['UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other']
  const platformOptions = ['iOS', 'Android', 'Web', 'All']
  const environmentOptions = ['Development', 'Staging', 'Production']
  const typeOptions = ['testcase', 'feature', 'other']

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/users')
        const data = await response.json()
        if (data.success) {
          setUsers(data.data)
        }
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    loadUsers()
  }, [])

  // Initialize form data when bug changes
  useEffect(() => {
    if (bug) {
      setFormData({
        bugId: bug.bugId,
        title: bug.title,
        description: bug.description,
        severity: bug.severity,
        priority: bug.priority,
        status: bug.status,
        category: bug.category,
        platform: bug.platform,
        assignedTo: bug.assignedTo || '',
        environment: bug.environment,
        browserInfo: bug.browserInfo || '',
        deviceInfo: bug.deviceInfo || '',
        stepsToReproduce: bug.stepsToReproduce || '',
        expectedBehavior: bug.expectedBehavior || '',
        actualBehavior: bug.actualBehavior || '',
        estimatedHours: bug.estimatedHours,
        actualHours: bug.actualHours,
        tags: bug.tags || '',
        relatedBugs: bug.relatedBugs || '',
        projectId: bug.projectId || '',
        feature: bug.feature || '',
        type: bug.type || null,
      })
    }
  }, [bug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bug) return

    setIsLoading(true)
    setError('')

    try {
      const updates = {
        ...formData,
        updatedAt: new Date().toISOString()
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
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Bug</h2>
            <p className="text-sm text-gray-500 mt-1">{bug.bugId}</p>
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

          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4 inline mr-2" />
              Title *
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Brief summary of the bug..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Description *
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Detailed description of the bug..."
            />
          </div>

          {/* Severity, Priority, Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Severity *
              </label>
              <select
                value={formData.severity || ''}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as Bug['severity'] })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {severityOptions.map((severity) => (
                  <option key={severity} value={severity}>{severity}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Priority *
              </label>
              <select
                value={formData.priority || ''}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Bug['priority'] })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Status *
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
          </div>

          {/* Category, Platform, Environment */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Tag className="h-4 w-4 inline mr-2" />
                Category *
              </label>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Bug['category'] })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Monitor className="h-4 w-4 inline mr-2" />
                Platform *
              </label>
              <select
                value={formData.platform || ''}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value as Bug['platform'] })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {platformOptions.map((platform) => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Globe className="h-4 w-4 inline mr-2" />
                Environment *
              </label>
              <select
                value={formData.environment || ''}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value as Bug['environment'] })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {environmentOptions.map((env) => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned To */}
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

          {/* Browser and Device Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Browser Info
              </label>
              <input
                type="text"
                value={formData.browserInfo || ''}
                onChange={(e) => setFormData({ ...formData, browserInfo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., Chrome 120.0.0"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Device Info
              </label>
              <input
                type="text"
                value={formData.deviceInfo || ''}
                onChange={(e) => setFormData({ ...formData, deviceInfo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., iPhone 15 Pro, iOS 17.2"
              />
            </div>
          </div>

          {/* Steps to Reproduce */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Steps to Reproduce
            </label>
            <textarea
              value={formData.stepsToReproduce || ''}
              onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="1. Go to...\n2. Click on...\n3. See error..."
            />
          </div>

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

          {/* Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4 inline mr-2" />
                Estimated Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimatedHours || ''}
                onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., 4"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4 inline mr-2" />
                Actual Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.actualHours || ''}
                onChange={(e) => setFormData({ ...formData, actualHours: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., 3.5"
              />
            </div>
          </div>

          {/* Tags and Related Bugs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Tags
              </label>
              <input
                type="text"
                value={formData.tags || ''}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="login, authentication, security"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Related Bugs
              </label>
              <input
                type="text"
                value={formData.relatedBugs || ''}
                onChange={(e) => setFormData({ ...formData, relatedBugs: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="BUG-001, BUG-002"
              />
            </div>
          </div>

          {/* Project, Feature, Type */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Project ID
              </label>
              <input
                type="text"
                value={formData.projectId || ''}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., PRJ-001"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Feature
              </label>
              <input
                type="text"
                value={formData.feature || ''}
                onChange={(e) => setFormData({ ...formData, feature: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., Login System"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                value={formData.type || ''}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Bug['type'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select type...</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
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

