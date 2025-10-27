/**
 * Notification Preferences Page
 * Allows users to configure their notification preferences
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { getCurrentUser } from '@/lib/auth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  Bell,
  Mail,
  MessageSquare,
  Monitor,
  CheckSquare,
  Bug as BugIcon,
  Calendar,
  Users,
  Briefcase,
  Clock,
  Save,
  RotateCcw,
  CheckCircle,
  Moon
} from 'lucide-react'

interface NotificationPreferences {
  id: number
  employeeId: string
  
  // Channels
  emailEnabled: boolean
  telegramEnabled: boolean
  inAppEnabled: boolean
  
  // Task Notifications
  taskAssigned: boolean
  taskUpdated: boolean
  taskCommented: boolean
  taskDueSoon: boolean
  taskOverdue: boolean
  taskCompleted: boolean
  taskSupportAssigned: boolean
  
  // Bug Notifications
  bugAssigned: boolean
  bugUpdated: boolean
  bugCommented: boolean
  bugStatusChanged: boolean
  bugSeverityChanged: boolean
  
  // Leave & WFH
  leaveApproved: boolean
  leaveRejected: boolean
  leavePendingApproval: boolean
  wfhApproved: boolean
  wfhRejected: boolean
  wfhPendingApproval: boolean
  
  // Project
  projectAssigned: boolean
  projectUpdated: boolean
  
  // Team
  teamMemberAdded: boolean
  teamTaskCreated: boolean
  
  // System
  systemAnnouncements: boolean
  dailySummary: boolean
  weeklySummary: boolean
  
  // Quiet Hours
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
}

export default function NotificationPreferencesPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string>('')

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push('/login')
      return
    }

    setCurrentUser(user)
    loadPreferences(user.employeeId)
  }, [router])

  const loadPreferences = async (employeeId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notification-preferences?employeeId=${employeeId}`)
      const data = await response.json()

      if (data.success) {
        setPreferences(data.data)
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePreference = (key: keyof NotificationPreferences) => {
    if (!preferences) return

    setPreferences({
      ...preferences,
      [key]: !preferences[key]
    })
    setHasChanges(true)
  }

  const updateTimePreference = (key: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    if (!preferences) return

    setPreferences({
      ...preferences,
      [key]: value
    })
    setHasChanges(true)
  }

  const saveChanges = async () => {
    if (!currentUser || !preferences) return

    try {
      setSaving(true)
      setSaveMessage('')

      const response = await fetch('/api/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          employeeId: currentUser.employeeId,
          preferences
        })
      })

      const data = await response.json()

      if (data.success) {
        setSaveMessage('Preferences saved successfully!')
        setHasChanges(false)
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage('Failed to save preferences')
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
      setSaveMessage('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = async () => {
    if (!currentUser) return
    if (!confirm('Are you sure you want to reset all notification preferences to defaults?')) return

    try {
      setSaving(true)
      const response = await fetch('/api/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          employeeId: currentUser.employeeId
        })
      })

      const data = await response.json()

      if (data.success) {
        setPreferences(data.data)
        setHasChanges(false)
        setSaveMessage('Preferences reset to defaults!')
        setTimeout(() => setSaveMessage(''), 3000)
      }
    } catch (error) {
      console.error('Failed to reset preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (!currentUser || !preferences) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Bell className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
              </div>
              <p className="text-gray-600">
                Manage how and when you receive notifications
              </p>
            </div>

            {hasChanges && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadPreferences(currentUser.employeeId)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </div>

          {saveMessage && (
            <div className={`mt-4 p-3 rounded-lg ${saveMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {saveMessage}
            </div>
          )}
        </div>

        {/* Notification Channels */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Monitor className="h-6 w-6 text-primary" />
            <span>Notification Channels</span>
          </h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-medium text-gray-900">Email Notifications</div>
                  <div className="text-sm text-gray-600">Receive notifications via email</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.emailEnabled}
                onChange={() => togglePreference('emailEnabled')}
                className="h-5 w-5 text-primary rounded focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-medium text-gray-900">Telegram Notifications</div>
                  <div className="text-sm text-gray-600">Receive notifications via Telegram</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.telegramEnabled}
                onChange={() => togglePreference('telegramEnabled')}
                className="h-5 w-5 text-primary rounded focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <Monitor className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="font-medium text-gray-900">In-App Notifications</div>
                  <div className="text-sm text-gray-600">Receive notifications in the application</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.inAppEnabled}
                onChange={() => togglePreference('inAppEnabled')}
                className="h-5 w-5 text-primary rounded focus:ring-primary"
              />
            </label>
          </div>
        </div>

        {/* Task Notifications */}
        <NotificationSection
          title="Task Notifications"
          icon={<CheckSquare className="h-6 w-6 text-green-500" />}
          preferences={preferences}
          togglePreference={togglePreference}
          items={[
            { key: 'taskAssigned', label: 'Task Assigned to Me', description: 'When a task is assigned to you' },
            { key: 'taskUpdated', label: 'Task Updated', description: 'When your task is updated' },
            { key: 'taskCommented', label: 'Task Commented', description: 'When someone comments on your task' },
            { key: 'taskDueSoon', label: 'Task Due Soon', description: 'When task due date is approaching' },
            { key: 'taskOverdue', label: 'Task Overdue', description: 'When task becomes overdue' },
            { key: 'taskCompleted', label: 'Task Completed', description: 'When task is marked complete' },
            { key: 'taskSupportAssigned', label: 'Support Team Assignment', description: 'When added to task support team' }
          ]}
        />

        {/* Bug Notifications */}
        <NotificationSection
          title="Bug Notifications"
          icon={<BugIcon className="h-6 w-6 text-red-500" />}
          preferences={preferences}
          togglePreference={togglePreference}
          items={[
            { key: 'bugAssigned', label: 'Bug Assigned to Me', description: 'When a bug is assigned to you' },
            { key: 'bugUpdated', label: 'Bug Updated', description: 'When your bug is updated' },
            { key: 'bugCommented', label: 'Bug Commented', description: 'When someone comments on your bug' },
            { key: 'bugStatusChanged', label: 'Bug Status Changed', description: 'When bug status changes' },
            { key: 'bugSeverityChanged', label: 'Bug Severity Changed', description: 'When bug severity changes' }
          ]}
        />

        {/* Leave & WFH Notifications */}
        <NotificationSection
          title="Leave & WFH Notifications"
          icon={<Calendar className="h-6 w-6 text-blue-500" />}
          preferences={preferences}
          togglePreference={togglePreference}
          items={[
            { key: 'leaveApproved', label: 'Leave Approved', description: 'When your leave is approved' },
            { key: 'leaveRejected', label: 'Leave Rejected', description: 'When your leave is rejected' },
            { key: 'leavePendingApproval', label: 'Leave Pending Approval', description: 'When leave needs your approval (managers)' },
            { key: 'wfhApproved', label: 'WFH Approved', description: 'When your WFH is approved' },
            { key: 'wfhRejected', label: 'WFH Rejected', description: 'When your WFH is rejected' },
            { key: 'wfhPendingApproval', label: 'WFH Pending Approval', description: 'When WFH needs your approval (managers)' }
          ]}
        />

        {/* Project & Team Notifications */}
        <NotificationSection
          title="Project & Team Notifications"
          icon={<Briefcase className="h-6 w-6 text-purple-500" />}
          preferences={preferences}
          togglePreference={togglePreference}
          items={[
            { key: 'projectAssigned', label: 'Project Assigned', description: 'When assigned to a project' },
            { key: 'projectUpdated', label: 'Project Updated', description: 'When project is updated' },
            { key: 'teamMemberAdded', label: 'Team Member Added', description: 'When added to a team' },
            { key: 'teamTaskCreated', label: 'Team Task Created', description: 'When task is created for your team' }
          ]}
        />

        {/* System Notifications */}
        <NotificationSection
          title="System Notifications"
          icon={<Bell className="h-6 w-6 text-yellow-500" />}
          preferences={preferences}
          togglePreference={togglePreference}
          items={[
            { key: 'systemAnnouncements', label: 'System Announcements', description: 'Receive system announcements' },
            { key: 'dailySummary', label: 'Daily Summary', description: 'Receive daily summary email' },
            { key: 'weeklySummary', label: 'Weekly Summary', description: 'Receive weekly summary email' }
          ]}
        />

        {/* Quiet Hours */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Moon className="h-6 w-6 text-indigo-500" />
            <span>Quiet Hours</span>
          </h2>

          <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer mb-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-indigo-500" />
              <div>
                <div className="font-medium text-gray-900">Enable Quiet Hours</div>
                <div className="text-sm text-gray-600">Don't send notifications during quiet hours</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.quietHoursEnabled}
              onChange={() => togglePreference('quietHoursEnabled')}
              className="h-5 w-5 text-primary rounded focus:ring-primary"
            />
          </label>

          {preferences.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4 pl-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={preferences.quietHoursStart}
                  onChange={(e) => updateTimePreference('quietHoursStart', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={preferences.quietHoursEnd}
                  onChange={(e) => updateTimePreference('quietHoursEnd', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          )}
        </div>

        {/* Reset Button */}
        <div className="flex justify-center">
          <button
            onClick={resetToDefaults}
            disabled={saving}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <RotateCcw className="h-5 w-5" />
            <span>Reset to Defaults</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper component for notification sections
function NotificationSection({
  title,
  icon,
  preferences,
  togglePreference,
  items
}: {
  title: string
  icon: React.ReactNode
  preferences: NotificationPreferences
  togglePreference: (key: keyof NotificationPreferences) => void
  items: Array<{ key: string; label: string; description: string }>
}) {
  return (
    <div className="bg-white rounded-lg shadow mb-6 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
        {icon}
        <span>{title}</span>
      </h2>

      <div className="space-y-3">
        {items.map(item => (
          <label
            key={item.key}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <div>
              <div className="font-medium text-gray-900">{item.label}</div>
              <div className="text-sm text-gray-600">{item.description}</div>
            </div>
            <input
              type="checkbox"
              checked={preferences[item.key as keyof NotificationPreferences] as boolean}
              onChange={() => togglePreference(item.key as keyof NotificationPreferences)}
              className="h-5 w-5 text-primary rounded focus:ring-primary"
            />
          </label>
        ))}
      </div>
    </div>
  )
}

