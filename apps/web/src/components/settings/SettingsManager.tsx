'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, AlertCircle, CheckCircle } from 'lucide-react'
import type { Setting, SettingType } from '@/lib/db/settings'
import { getCurrentUser } from '@/lib/auth'

interface SettingsManagerProps {
  settingType: SettingType
  title: string
  description: string
}

export default function SettingsManager({ settingType, title, description }: SettingsManagerProps) {
  const [settings, setSettings] = useState<Setting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newValue, setNewValue] = useState('')
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    loadSettings()
  }, [settingType])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await fetch(`/api/settings?type=${settingType}&activeOnly=false`)
      const data = await response.json()

      if (data.success) {
        setSettings(data.data)
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

  const handleAdd = async () => {
    if (!newValue.trim()) {
      setError('Please enter a value')
      return
    }

    try {
      setError('')
      const currentUser = getCurrentUser()
      
      if (!currentUser) {
        setError('You must be logged in to add settings')
        return
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingType,
          settingValue: newValue.trim(),
          createdBy: currentUser.employeeId
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Setting added successfully')
        setNewValue('')
        setIsAdding(false)
        await loadSettings()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to add setting')
      }
    } catch (err) {
      setError('Failed to add setting')
      console.error('Error adding setting:', err)
    }
  }

  const handleEdit = async (id: number) => {
    if (!editValue.trim()) {
      setError('Please enter a value')
      return
    }

    try {
      setError('')
      
      const response = await fetch(`/api/settings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingValue: editValue.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Setting updated successfully')
        setEditingId(null)
        setEditValue('')
        await loadSettings()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to update setting')
      }
    } catch (err) {
      setError('Failed to update setting')
      console.error('Error updating setting:', err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this setting?')) {
      return
    }

    try {
      setError('')
      
      const response = await fetch(`/api/settings/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Setting deleted successfully')
        await loadSettings()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to delete setting')
      }
    } catch (err) {
      setError('Failed to delete setting')
      console.error('Error deleting setting:', err)
    }
  }

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      setError('')
      
      const response = await fetch(`/api/settings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !currentStatus
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Setting ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
        await loadSettings()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to update setting')
      }
    } catch (err) {
      setError('Failed to update setting')
      console.error('Error updating setting:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center space-x-2"
          disabled={isAdding}
        >
          <Plus className="h-4 w-4" />
          <span>Add New</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Add New Form */}
      {isAdding && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter new value..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <button
              onClick={handleAdd}
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Save"
            >
              <Save className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                setIsAdding(false)
                setNewValue('')
                setError('')
              }}
              className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              title="Cancel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Settings List */}
      <div className="space-y-2">
        {settings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No settings found. Click "Add New" to create one.</p>
          </div>
        ) : (
          settings.map((setting) => (
            <div
              key={setting.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                setting.isActive
                  ? 'bg-white border-gray-200'
                  : 'bg-gray-50 border-gray-300 opacity-60'
              }`}
            >
              {editingId === setting.id ? (
                <div className="flex-1 flex items-center space-x-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    onKeyPress={(e) => e.key === 'Enter' && handleEdit(setting.id)}
                    autoFocus
                  />
                  <button
                    onClick={() => handleEdit(setting.id)}
                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    title="Save"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setEditValue('')
                      setError('')
                    }}
                    className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <span className={`font-medium ${!setting.isActive ? 'text-gray-500' : 'text-gray-900'}`}>
                      {setting.settingValue}
                    </span>
                    {!setting.isActive && (
                      <span className="ml-2 text-xs text-gray-500">(Inactive)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleActive(setting.id, setting.isActive)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        setting.isActive
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {setting.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(setting.id)
                        setEditValue(setting.settingValue)
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(setting.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Total: {settings.length} settings ({settings.filter(s => s.isActive).length} active)
        </p>
      </div>
    </div>
  )
}

