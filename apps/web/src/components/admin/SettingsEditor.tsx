'use client'

import { useState, useEffect } from 'react'
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  AlertCircle,
  CheckCircle,
  List,
  Type,
  Hash,
  ToggleLeft
} from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Setting {
  id: number
  key: string
  value: any
  description: string | null
  metadata: any | null
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

type SettingType = 'array' | 'string' | 'number' | 'boolean'

export default function SettingsEditor() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)

  // Form state for editing/adding
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
    metadata: '',
    isActive: true,
    type: 'array' as SettingType
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await fetch('/api/settings', {
        credentials: 'include'
      })
      const data = await response.json()

      if (data.success) {
        setSettings(data.data || [])
      } else {
        setError(data.error || 'Failed to load settings')
      }
    } catch (err) {
      setError('Failed to load settings')
      console.error('Error loading settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const detectSettingType = (value: any): SettingType => {
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'number') return 'number'
    return 'string'
  }

  const startEdit = (setting: Setting) => {
    setEditingId(setting.id)
    setIsAddingNew(false)
    
    const type = detectSettingType(setting.value)
    
    setFormData({
      key: setting.key,
      value: type === 'array' ? setting.value.join(', ') : String(setting.value),
      description: setting.description || '',
      metadata: setting.metadata ? JSON.stringify(setting.metadata, null, 2) : '',
      isActive: setting.isActive,
      type
    })
  }

  const startAddNew = () => {
    setIsAddingNew(true)
    setEditingId(null)
    setFormData({
      key: '',
      value: '',
      description: '',
      metadata: '',
      isActive: true,
      type: 'array'
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAddingNew(false)
    setFormData({
      key: '',
      value: '',
      description: '',
      metadata: '',
      isActive: true,
      type: 'array'
    })
  }

  const parseValue = (valueStr: string, type: SettingType): any => {
    switch (type) {
      case 'array':
        return valueStr.split(',').map(v => v.trim()).filter(v => v)
      case 'boolean':
        return valueStr.toLowerCase() === 'true'
      case 'number':
        return parseFloat(valueStr)
      default:
        return valueStr
    }
  }

  const saveSetting = async () => {
    try {
      setError('')
      setSuccess('')

      if (!formData.key.trim()) {
        setError('Key is required')
        return
      }

      if (!formData.value.trim()) {
        setError('Value is required')
        return
      }

      const parsedValue = parseValue(formData.value, formData.type)
      const parsedMetadata = formData.metadata.trim() 
        ? JSON.parse(formData.metadata) 
        : null

      const payload = {
        key: formData.key,
        value: parsedValue,
        description: formData.description || null,
        metadata: parsedMetadata,
        isActive: formData.isActive
      }

      let response
      if (isAddingNew) {
        // Create new setting
        response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        })
      } else if (editingId) {
        // Update existing setting
        response = await fetch(`/api/settings/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        })
      }

      if (!response) return

      const data = await response.json()

      if (data.success) {
        setSuccess(isAddingNew ? 'Setting created successfully' : 'Setting updated successfully')
        cancelEdit()
        loadSettings()
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to save setting')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save setting')
      console.error('Error saving setting:', err)
    }
  }

  const deleteSetting = async (id: number, key: string) => {
    if (!confirm(`Are you sure you want to delete the setting "${key}"? This action cannot be undone.`)) {
      return
    }

    try {
      setError('')
      setSuccess('')

      const response = await fetch(`/api/settings/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Setting deleted successfully')
        loadSettings()
        
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to delete setting')
      }
    } catch (err) {
      setError('Failed to delete setting')
      console.error('Error deleting setting:', err)
    }
  }

  const toggleActive = async (setting: Setting) => {
    try {
      setError('')
      
      const response = await fetch(`/api/settings/${setting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !setting.isActive })
      })

      const data = await response.json()

      if (data.success) {
        loadSettings()
      } else {
        setError(data.error || 'Failed to toggle setting status')
      }
    } catch (err) {
      setError('Failed to toggle setting status')
      console.error('Error toggling setting:', err)
    }
  }

  const getTypeIcon = (type: SettingType) => {
    switch (type) {
      case 'array': return <List className="h-4 w-4" />
      case 'string': return <Type className="h-4 w-4" />
      case 'number': return <Hash className="h-4 w-4" />
      case 'boolean': return <ToggleLeft className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" message="Loading settings..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add New Button */}
      <div className="flex justify-end">
        <button
          onClick={startAddNew}
          disabled={isAddingNew || editingId !== null}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Setting</span>
        </button>
      </div>

      {/* Settings List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Add New Form Row */}
              {isAddingNew && (
                <tr className="bg-blue-50">
                  <td colSpan={6} className="px-6 py-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <Plus className="h-5 w-5" />
                        <span>Add New Setting</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Key <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.key}
                            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., departments, severities"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as SettingType })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="array">Array (comma-separated)</option>
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Value <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={
                              formData.type === 'array'
                                ? 'e.g., Critical, Major, Minor'
                                : formData.type === 'boolean'
                                ? 'true or false'
                                : 'Enter value'
                            }
                          />
                          {formData.type === 'array' && (
                            <p className="text-xs text-gray-500 mt-1">Separate items with commas</p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Brief description of this setting"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Metadata (JSON)
                          </label>
                          <textarea
                            value={formData.metadata}
                            onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                            placeholder='{"icons": {"Critical": "🔴", "Major": "🟠"}}'
                          />
                          <p className="text-xs text-gray-500 mt-1">Optional: Add icon mappings or other metadata as JSON</p>
                        </div>

                        <div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.isActive}
                              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Active</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <X className="h-4 w-4" />
                          <span>Cancel</span>
                        </button>
                        <button
                          onClick={saveSetting}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                        >
                          <Save className="h-4 w-4" />
                          <span>Save Setting</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {/* Settings Rows */}
              {settings.map(setting => (
                editingId === setting.id ? (
                  <tr key={setting.id} className="bg-yellow-50">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                          <Edit2 className="h-5 w-5" />
                          <span>Edit Setting: {setting.key}</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Key <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.key}
                              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                              disabled
                            />
                            <p className="text-xs text-gray-500 mt-1">Key cannot be changed</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={formData.type}
                              onChange={(e) => setFormData({ ...formData, type: e.target.value as SettingType })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="array">Array (comma-separated)</option>
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Value <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={formData.value}
                              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder={
                                formData.type === 'array'
                                  ? 'e.g., Critical, Major, Minor'
                                  : formData.type === 'boolean'
                                  ? 'true or false'
                                  : 'Enter value'
                              }
                            />
                            {formData.type === 'array' && (
                              <p className="text-xs text-gray-500 mt-1">Separate items with commas</p>
                            )}
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Brief description of this setting"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Metadata (JSON)
                            </label>
                            <textarea
                              value={formData.metadata}
                              onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                              placeholder='{"icons": {"Critical": "🔴", "Major": "🟠"}}'
                            />
                            <p className="text-xs text-gray-500 mt-1">Optional: Add icon mappings or other metadata as JSON</p>
                          </div>

                          <div>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-700">Active</span>
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <X className="h-4 w-4" />
                            <span>Cancel</span>
                          </button>
                          <button
                            onClick={saveSetting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={setting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{setting.key}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        {getTypeIcon(detectSettingType(setting.value))}
                        <span>{detectSettingType(setting.value)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md truncate">
                        {Array.isArray(setting.value) 
                          ? setting.value.join(', ') 
                          : String(setting.value)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {setting.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(setting)}
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          setting.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {setting.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => startEdit(setting)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteSetting(setting.id, setting.key)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}

              {settings.length === 0 && !isAddingNew && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No settings found. Click "Add New Setting" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

