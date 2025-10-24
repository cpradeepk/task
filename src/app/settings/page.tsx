'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

import {
  Download,
  Upload,
  Database,
  Shield,
  AlertTriangle,
  CheckCircle,
  Settings as SettingsIcon,
  FileText,
  Trash2,
  RefreshCw
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import UserImport from '@/components/admin/UserImport'
import DelayedTasksManager from '@/components/tasks/DelayedTasksManager'

export default function Settings() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [lastLoadTime, setLastLoadTime] = useState(0)
  const [stats, setStats] = useState({
    users: 0,
    tasks: 0,
    leaveApplications: 0,
    wfhApplications: 0
  })
  const router = useRouter()
  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }

    if (currentUser.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    // Load stats only once when component mounts
    loadStats()
  }, [currentUser, router])

  const loadStats = async () => {
    // Prevent excessive API calls - minimum 30 seconds between loads
    const now = Date.now()
    if (now - lastLoadTime < 30000) {
      console.log('Skipping stats load - too soon since last load')
      return
    }
    setLastLoadTime(now)

    setIsLoading(true)
    try {
      // Load each stat individually with better error handling
      let usersCount = 0
      let tasksCount = 0
      let leavesCount = 0
      let wfhsCount = 0

      // Load users with error handling
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const result = await response.json()
          const users = result.data || []
          usersCount = users.length
          console.log(`Successfully loaded ${usersCount} users`)
        } else {
          usersCount = 0
        }
      } catch (error: any) {
        console.warn('Failed to load users:', error.message)
        usersCount = 0
      }

      // Load tasks with error handling
      try {
        const response = await fetch('/api/tasks')
        if (response.ok) {
          const result = await response.json()
          const tasks = result.data || []
          tasksCount = tasks.length
          console.log(`Successfully loaded ${tasksCount} tasks`)
        } else {
          tasksCount = 0
        }
      } catch (error: any) {
        console.warn('Failed to load tasks:', error.message)
        tasksCount = 0
      }

      // Load leave applications with error handling
      try {
        const response = await fetch('/api/leaves')
        if (response.ok) {
          const result = await response.json()
          const leaves = result.data || []
          leavesCount = leaves.length
          console.log(`Successfully loaded ${leavesCount} leave applications`)
        } else {
          leavesCount = 0
        }
      } catch (error: any) {
        console.warn('Failed to load leave applications:', error.message)
        if (error.message && (
          error.message.includes('quota exceeded') ||
          error.message.includes('429') ||
          error.message.includes('API request failed: 500') ||
          error.message.includes('Failed to get leave applications')
        )) {
          console.warn('Google Sheets API quota issue for leave applications')
        }
        leavesCount = 0
      }

      // Load WFH applications with error handling
      try {
        const response = await fetch('/api/wfh')
        if (response.ok) {
          const result = await response.json()
          const wfhs = result.data || []
          wfhsCount = wfhs.length
          console.log(`Successfully loaded ${wfhsCount} WFH applications`)
        } else {
          wfhsCount = 0
        }
      } catch (error: any) {
        console.warn('Failed to load WFH applications:', error.message)
        if (error.message && (
          error.message.includes('quota exceeded') ||
          error.message.includes('429') ||
          error.message.includes('API request failed: 500') ||
          error.message.includes('Failed to get WFH applications')
        )) {
          console.warn('Google Sheets API quota issue for WFH applications')
        }
        wfhsCount = 0
      }

      setStats({
        users: usersCount,
        tasks: tasksCount,
        leaveApplications: leavesCount,
        wfhApplications: wfhsCount
      })

    } catch (error: any) {
      console.error('Failed to load stats from Google Sheets:', error)
      // Set stats to 0 if everything fails
      setStats({
        users: 0,
        tasks: 0,
        leaveApplications: 0,
        wfhApplications: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  const forceRefreshStats = async () => {
    setLastLoadTime(0) // Reset debounce
    await loadStats()
  }

  const handleBackup = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      // Get all data from API
      const [usersResponse, tasksResponse, leavesResponse, wfhsResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/tasks'),
        fetch('/api/leaves'),
        fetch('/api/wfh')
      ])

      const users = usersResponse.ok ? (await usersResponse.json()).data || [] : []
      const tasks = tasksResponse.ok ? (await tasksResponse.json()).data || [] : []
      const leaves = leavesResponse.ok ? (await leavesResponse.json()).data || [] : []
      const wfhs = wfhsResponse.ok ? (await wfhsResponse.json()).data || [] : []

      const backupData = {
        users,
        tasks,
        leaveApplications: leaves,
        wfhApplications: wfhs,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }

      // Create and download backup file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jsr-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      window.URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: 'Backup created and downloaded successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create backup from Google Sheets. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Restore functionality removed - Google Sheets is the single source of truth

  // Clear data functionality removed - Google Sheets is the single source of truth

  if (!currentUser) return null

  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">System Settings</h1>
          <p className="text-secondary-600 mt-1">Manage system configuration and data</p>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Data Statistics */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900 flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Data Overview</span>
          </h3>
          <button
            onClick={forceRefreshStats}
            disabled={isLoading}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-primary-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600">{stats.users}</div>
            <div className="text-sm text-secondary-600">Users</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.tasks}</div>
            <div className="text-sm text-secondary-600">Tasks</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.leaveApplications}</div>
            <div className="text-sm text-secondary-600">Leave Applications</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.wfhApplications}</div>
            <div className="text-sm text-secondary-600">WFH Applications</div>
          </div>
        </div>
      </div>

      {/* User Import */}
      <UserImport />

      {/* Delayed Tasks Management */}
      <DelayedTasksManager />

      {/* Data Management */}
      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Data Management</span>
        </h3>
        
        <div className="space-y-4">
          {/* Backup */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-secondary-200 rounded-lg">
            <div>
              <h4 className="font-medium text-secondary-900">Backup Data</h4>
              <p className="text-sm text-secondary-600 mt-1">
                Download a complete backup of all system data
              </p>
            </div>
            <button
              onClick={handleBackup}
              disabled={isLoading}
              className="btn-primary flex items-center space-x-2 mt-3 sm:mt-0 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isLoading ? 'Creating...' : 'Download Backup'}</span>
            </button>
          </div>

          {/* Google Sheets Management */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-blue-200 rounded-lg bg-blue-50">
            <div>
              <h4 className="font-medium text-blue-900">Google Sheets Management</h4>
              <p className="text-sm text-blue-600 mt-1">
                Use Google Sheets interface to directly manage, import, or export data
              </p>
            </div>
            <div className="flex items-center space-x-2 mt-3 sm:mt-0">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="text-blue-700 font-medium">Cloud-based</span>
            </div>
          </div>

          {/* Google Sheets Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-green-200 rounded-lg bg-green-50">
            <div>
              <h4 className="font-medium text-green-900">Google Sheets Database</h4>
              <p className="text-sm text-green-600 mt-1">
                All data is stored in Google Sheets. Use Google Sheets interface to manage data directly.
              </p>
            </div>
            <div className="flex items-center space-x-2 mt-3 sm:mt-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700 font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Sheets Integration Status */}
      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Google Sheets Integration</span>
        </h3>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">Active & Operational</h4>
              <p className="text-sm text-green-700 mt-1">
                Google Sheets integration is fully operational. Current features:
              </p>
              <ul className="text-sm text-green-700 mt-2 space-y-1 list-disc list-inside">
                <li>Real-time data sync with Google Sheets</li>
                <li>Dynamic user authentication from sheets</li>
                <li>Automatic data backup to Google Drive</li>
                <li>Admin-only hardcoded access for system management</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">System Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-secondary-700">Version:</span>
            <span className="ml-2 text-secondary-600">1.0.0</span>
          </div>
          <div>
            <span className="font-medium text-secondary-700">Storage:</span>
            <span className="ml-2 text-secondary-600">Google Sheets</span>
          </div>
          <div>
            <span className="font-medium text-secondary-700">Last Backup:</span>
            <span className="ml-2 text-secondary-600">Real-time (Google Drive)</span>
          </div>
          <div>
            <span className="font-medium text-secondary-700">Data Format:</span>
            <span className="ml-2 text-secondary-600">Google Sheets</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
