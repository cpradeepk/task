'use client'

import { useState, useEffect } from 'react'
import {
    Plus,
    Trash2,
    Save,
    X,
    AlertCircle,
    CheckCircle,
    LayoutList,
    Bug,
    Users,
    AlertTriangle
} from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Setting {
    id: number
    key: string
    value: any
}

interface DropdownConfig {
    label: string
    key: string
    description: string
    defaultValues: string[]
}

const TASK_DROPDOWNS: DropdownConfig[] = [
    {
        label: 'Task Statuses',
        key: 'task_statuses',
        description: 'Statuses available for tasks workflow (e.g., Open, In Progress)',
        defaultValues: ['Open', 'In Progress', 'Done', 'On Hold']
    },
    {
        label: 'Task Priorities',
        key: 'task_priorities',
        description: 'Priority levels for tasks',
        defaultValues: ['Low', 'Medium', 'High', 'Critical']
    }
]

const DEV_DROPDOWNS: DropdownConfig[] = [
    {
        label: 'Bug Types',
        key: 'bug_types',
        description: 'Types of development items',
        defaultValues: ['Bug', 'Feature', 'Testcase', 'Other']
    },
    {
        label: 'Bug Statuses',
        key: 'bug_statuses',
        description: 'Workflow statuses for bugs',
        defaultValues: ['Open', 'In Progress', 'Resolved', 'Closed']
    },
    {
        label: 'Bug Severities',
        key: 'bug_severities',
        description: 'Severity levels for bugs',
        defaultValues: ['Minor', 'Major', 'Critical', 'Blocker']
    },
    {
        label: 'Bug Priorities',
        key: 'bug_priorities',
        description: 'Priority levels for bugs',
        defaultValues: ['Low', 'Medium', 'High', 'Critical']
    },
    {
        label: 'Bug Categories',
        key: 'bug_categories',
        description: 'Categories for bug classification',
        defaultValues: ['Frontend', 'Backend', 'UI/UX', 'Database']
    },
    {
        label: 'Platforms',
        key: 'platforms',
        description: 'Target platforms for development (e.g., iOS, Android, Web)',
        defaultValues: ['Web', 'iOS', 'Android', 'Desktop', 'API']
    }
]

const USER_DROPDOWNS: DropdownConfig[] = [
    {
        label: 'Departments',
        key: 'departments',
        description: 'Internal departments for user assignment',
        defaultValues: ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'HR', 'Finance']
    },
    {
        label: 'Designations',
        key: 'designations',
        description: 'Job titles/Designations',
        defaultValues: ['Software Engineer', 'Senior Engineer', 'Product Manager', 'Designer', 'QA Engineer']
    }
]

export default function DropdownManager() {
    const [activeTab, setActiveTab] = useState<'tasks' | 'dev' | 'users'>('tasks')
    const [settings, setSettings] = useState<Record<string, Setting>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Edit State
    const [editingKey, setEditingKey] = useState<string | null>(null)
    const [newValue, setNewValue] = useState('')

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/settings', { credentials: 'include' })
            const data = await response.json()

            if (data.success) {
                const settingsMap: Record<string, Setting> = {}
                data.data.forEach((s: Setting) => {
                    settingsMap[s.key] = s
                })
                setSettings(settingsMap)
            }
        } catch (err) {
            setError('Failed to load settings')
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const getSettingValues = (key: string, defaults: string[]): string[] => {
        const setting = settings[key]
        if (setting && Array.isArray(setting.value)) {
            return setting.value
        }
        // If setting doesn't exist yet, we'll return defaults but NOT auto-create yet? 
        // Or we will auto-create on first Add?
        // For now return defaults to show what WILL be there.
        return []
    }

    const handleAdd = async (key: string, valueToAdd: string) => {
        if (!valueToAdd.trim()) return

        const currentValues = getSettingValues(key, [])
        if (currentValues.includes(valueToAdd.trim())) {
            setError(`"${valueToAdd}" already exists in this list.`)
            return
        }

        const newValues = [...currentValues, valueToAdd.trim()]
        await saveSetting(key, newValues)
        setNewValue('')
        setEditingKey(null)
    }

    const handleDelete = async (key: string, valueToDelete: string) => {
        try {
            // 1. Check Usage via API
            const response = await fetch('/api/settings/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value: valueToDelete })
            })
            const data = await response.json()

            if (data.success && data.inUse) {
                alert(`Cannot delete "${valueToDelete}": It is currently used by ${data.count} items. Please reassign them first.`)
                return
            }

            // 2. Confirm Deletion
            if (!confirm(`Are you sure you want to delete "${valueToDelete}"?`)) return

            // 3. Delete
            const currentValues = getSettingValues(key, [])
            const newValues = currentValues.filter(v => v !== valueToDelete)
            await saveSetting(key, newValues)

        } catch (err) {
            console.error('Delete failed:', err)
            setError('Failed to validate deletion')
        }
    }

    const saveSetting = async (key: string, values: string[]) => {
        try {
            setError('')
            const setting = settings[key]

            let response
            if (setting) {
                // Update exists
                response = await fetch(`/api/settings/${setting.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: values })
                })
            } else {
                // Create new
                response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        key,
                        value: values,
                        description: 'Created via Dropdown Manager',
                        isActive: true,
                        type: 'array'
                    })
                })
            }

            const data = await response.json()
            if (data.success) {
                setSuccess('Saved successfully')
                loadSettings() // Reload to get fresh IDs etc
                setTimeout(() => setSuccess(''), 2000)
            } else {
                setError(data.error || 'Failed to save')
            }
        } catch (err) {
            setError('Failed to save')
        }
    }

    const renderSection = (config: DropdownConfig) => {
        const values = getSettingValues(config.key, config.defaultValues)
        // If empty (and not in settings), maybe show "Click to initialize with defaults"?
        // Or just show empty list.
        const isInitialized = !!settings[config.key]

        return (
            <div key={config.key} className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{config.label}</h3>
                        <p className="text-sm text-gray-500">{config.description}</p>
                    </div>
                    {!isInitialized && (
                        <button
                            onClick={() => saveSetting(config.key, config.defaultValues)}
                            className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100"
                        >
                            Initialize Defaults
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {values.length === 0 && (
                        <div className="text-gray-400 text-sm italic py-2">No options configured.</div>
                    )}
                    {values.map((val) => (
                        <div key={val} className="group flex items-center bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-sm text-gray-700">
                            <span>{val}</span>
                            <button
                                onClick={() => handleDelete(config.key, val)}
                                className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => setEditingKey(editingKey === config.key ? null : config.key)}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded-full border border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                        <Plus className="h-4 w-4 mr-1" /> Add
                    </button>
                </div>

                {editingKey === config.key && (
                    <div className="flex items-center space-x-2 mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100 animate-in fade-in slide-in-from-top-2">
                        <input
                            type="text"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            placeholder={`Add new ${config.label.slice(0, -1)}...`}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAdd(config.key, newValue)
                                if (e.key === 'Escape') setEditingKey(null)
                            }}
                            autoFocus
                        />
                        <button
                            onClick={() => handleAdd(config.key, newValue)}
                            disabled={!newValue.trim()}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add
                        </button>
                        <button
                            onClick={() => {
                                setEditingKey(null)
                                setNewValue('')
                            }}
                            className="text-gray-500 hover:text-gray-700 px-2"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        )
    }

    if (isLoading) {
        return <LoadingSpinner size="lg" message="Loading settings..." />
    }

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors
              ${activeTab === 'tasks'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
                    >
                        <LayoutList className="h-4 w-4" />
                        <span>Task Attributes</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('dev')}
                        className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors
              ${activeTab === 'dev'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
                    >
                        <Bug className="h-4 w-4" />
                        <span>Development Attributes</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors
              ${activeTab === 'users'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
                    >
                        <Users className="h-4 w-4" />
                        <span>User Roles</span>
                    </button>
                </nav>
            </div>

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

            {/* Content */}
            <div className="py-4">
                {activeTab === 'tasks' && (
                    <div className="space-y-2">
                        {TASK_DROPDOWNS.map(renderSection)}
                    </div>
                )}

                {activeTab === 'dev' && (
                    <div className="space-y-2">
                        {DEV_DROPDOWNS.map(renderSection)}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-2">
                        {USER_DROPDOWNS.map(renderSection)}
                    </div>
                )}
            </div>
        </div>
    )
}
