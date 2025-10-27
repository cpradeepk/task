'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/layout/Navbar'
import SettingsManager from '@/components/settings/SettingsManager'
import { Settings, Database, AlertTriangle, Tag, Layers, Flag } from 'lucide-react'
import type { SettingType } from '@/lib/db/settings'

interface SettingSection {
  type: SettingType
  title: string
  description: string
  icon: React.ReactNode
}

const settingSections: SettingSection[] = [
  {
    type: 'department',
    title: 'Departments',
    description: 'Manage department options for user profiles and ID cards',
    icon: <Layers className="h-5 w-5" />
  },
  {
    type: 'severity',
    title: 'Bug Severity Levels',
    description: 'Manage severity levels for bug reports (Critical, Major, Minor)',
    icon: <AlertTriangle className="h-5 w-5" />
  },
  {
    type: 'priority',
    title: 'Bug Priority Levels',
    description: 'Manage priority levels for bug reports (High, Medium, Low)',
    icon: <Flag className="h-5 w-5" />
  },
  {
    type: 'category',
    title: 'Bug Categories',
    description: 'Manage category options for bug reports (UI, API, Backend, etc.)',
    icon: <Tag className="h-5 w-5" />
  },
  {
    type: 'platform',
    title: 'Platforms',
    description: 'Manage platform options for bug reports (Web, iOS, Android, All)',
    icon: <Database className="h-5 w-5" />
  },
  {
    type: 'task_priority',
    title: 'Task Priority Levels',
    description: 'Manage priority levels for task creation',
    icon: <Flag className="h-5 w-5" />
  }
]

export default function DropdownSettingsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<SettingType>('department')

  useEffect(() => {
    const user = getCurrentUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // Only Admin and Top Management can access settings
    if (user.role !== 'admin' && user.role !== 'top_management') {
      router.push('/dashboard')
      return
    }

    setCurrentUser(user)
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  const activeSection = settingSections.find(s => s.type === activeTab)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Dropdown Settings</h1>
          </div>
          <p className="text-gray-600">
            Manage configurable dropdown options for forms across the application
          </p>
        </div>

        {/* Access Control Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Admin Access</h3>
              <p className="text-sm text-blue-700">
                You are viewing this page as <strong>{currentUser.role === 'admin' ? 'Administrator' : 'Top Management'}</strong>.
                Changes made here will affect dropdown options throughout the application.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Setting Categories
              </h2>
              <nav className="space-y-1">
                {settingSections.map((section) => (
                  <button
                    key={section.type}
                    onClick={() => setActiveTab(section.type)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === section.type
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className={activeTab === section.type ? 'text-white' : 'text-gray-500'}>
                      {section.icon}
                    </span>
                    <span className="text-sm font-medium">{section.title}</span>
                  </button>
                ))}
              </nav>

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Quick Info
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Total Categories:</span>
                    <span className="font-semibold">{settingSections.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeSection && (
              <SettingsManager
                key={activeSection.type}
                settingType={activeSection.type}
                title={activeSection.title}
                description={activeSection.description}
              />
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Use Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Adding New Values</h4>
              <p>Click "Add New" button, enter the value, and press Enter or click Save.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Editing Values</h4>
              <p>Click the edit icon, modify the value, and press Enter or click Save.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Deactivating Values</h4>
              <p>Click "Deactivate" to hide a value from dropdowns without deleting it.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Deleting Values</h4>
              <p>Click the delete icon to permanently remove a value. This action cannot be undone.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

