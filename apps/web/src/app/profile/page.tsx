'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, updateUser, getRoleDisplayName } from '@/lib/auth'
import { User, Task } from '@/lib/types'
import { QUERIES } from '@/lib/graphql-queries'
import {
  User as UserIcon,
  Mail,
  Phone,
  Building,
  Shield,
  Calendar,
  Briefcase,
  Clock,
  Save,
  Edit,
  AlertCircle,
  CheckCircle,
  Bell
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import IDCard from '@/components/profile/IDCard'
import IdCardPhotoUpload from '@/components/profile/IdCardPhotoUpload'
import { useSecurity } from '@/contexts/SecurityContext'

// Helper function to execute GraphQL queries
async function executeGraphQLQuery(query: string, variables: any) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })

  const result = await response.json()
  if (result.errors) throw new Error(result.errors[0]?.message || 'GraphQL query failed')
  return result.data
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Security integration from context
  const security = useSecurity()
  const biometricEnabled = security?.biometricEnabled || false
  const registerWebBiometrics = security?.registerWebBiometrics || (async () => false)
  const setBiometricEnabled = security?.setBiometricEnabled || (() => {})

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmNewPin, setConfirmNewPin] = useState('')
  const [securityError, setSecurityError] = useState('')
  const [securitySuccess, setSecuritySuccess] = useState('')
  const [bioSupported, setBioSupported] = useState(false)
  const [isPinEditing, setIsPinEditing] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBioSupported(!!window.PublicKeyCredential)
    }
  }, [])

  const handleToggleBiometricWeb = async () => {
    setSecurityError('')
    setSecuritySuccess('')
    if (biometricEnabled) {
      localStorage.removeItem('jsr_biometric_enabled')
      localStorage.removeItem('jsr_biometric_credential_id')
      setBiometricEnabled(false)
      setSecuritySuccess('Biometric login disabled.')
    } else {
      const success = await registerWebBiometrics()
      if (success) {
        setSecuritySuccess('Biometric login enabled successfully!')
      } else {
        setSecurityError('Failed to setup biometric login.')
      }
    }
  }

  const handleChangePinWeb = async (e: React.FormEvent) => {
    e.preventDefault()
    setSecurityError('')
    setSecuritySuccess('')

    if (currentPin.length !== 4 || newPin.length !== 4 || confirmNewPin.length !== 4) {
      setSecurityError('All PIN inputs must be exactly 4 digits.')
      return
    }

    if (newPin !== confirmNewPin) {
      setSecurityError('New PINs do not match.')
      return
    }

    const hashPin = async (rawPin: string): Promise<string> => {
      const encoder = new TextEncoder()
      const data = encoder.encode(rawPin + 'jsr-salt-secure')
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    const inputHash = await hashPin(currentPin)
    const storedHash = localStorage.getItem('jsr_user_pin')

    if (storedHash !== inputHash) {
      setSecurityError('Incorrect current PIN.')
      return
    }

    const newHash = await hashPin(newPin)
    localStorage.setItem('jsr_user_pin', newHash)
    setSecuritySuccess('Security PIN changed successfully!')
    
    setCurrentPin('')
    setNewPin('')
    setConfirmNewPin('')
    setIsPinEditing(false)
  }
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    telegramToken: '',
    department: '',
    managerEmail: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    totalLeaves: 0,
    totalWFH: 0
  })

  // Settings state
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([])
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  const router = useRouter()
  const currentUser = getCurrentUser()

  // Load departments from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoadingSettings(true)
        const response = await fetch('/api/settings?grouped=true&activeOnly=true')
        const data = await response.json()

        if (data.success) {
          const grouped = data.data
          setDepartmentOptions(grouped.department || [])
        } else {
          console.error('Failed to load settings:', data.error)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setIsLoadingSettings(false)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }

    if (initialized) return // Prevent multiple executions

    setUser(currentUser)
    setFormData({
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone,
      telegramToken: currentUser.telegramToken || '',
      department: currentUser.department,
      managerEmail: currentUser.managerEmail || '',
      password: ''
    })

    // Load user statistics using API endpoints
    const loadStats = async () => {
      if (currentUser) {
        try {
          let tasks: Task[] = []

          // Try GraphQL for tasks first
          try {
            console.log('🔵 [Profile] Attempting GraphQL query for tasks...')
            const data = await executeGraphQLQuery(QUERIES.GET_TASKS, {
              assignedTo: currentUser.employeeId
            })
            tasks = data.tasks || []
            console.log('✅ [Profile] GraphQL query successful:', tasks.length, 'tasks')
          } catch (graphqlError) {
            console.warn('⚠️ [Profile] GraphQL failed, falling back to REST:', graphqlError)

            // Fallback to REST API
            const tasksResponse = await fetch(`/api/tasks/user/${currentUser.employeeId}`)
            const tasksData = tasksResponse.ok ? await tasksResponse.json() : { data: [] }
            tasks = tasksData.data || []
            console.log('✅ [Profile] REST API successful:', tasks.length, 'tasks')
          }

          // Fetch leaves and WFH from REST (not in GraphQL schema yet)
          const [leavesResponse, wfhsResponse] = await Promise.all([
            fetch(`/api/leaves/user/${currentUser.employeeId}`),
            fetch(`/api/wfh/user/${currentUser.employeeId}`)
          ])

          const leavesData = leavesResponse.ok ? await leavesResponse.json() : { data: [] }
          const wfhsData = wfhsResponse.ok ? await wfhsResponse.json() : { data: [] }

          const leaves = leavesData.data || []
          const wfhs = wfhsData.data || []

          setStats({
            totalTasks: tasks.length,
            completedTasks: tasks.filter((task: Task) => task.status === 'Done').length,
            totalLeaves: leaves.length,
            totalWFH: wfhs.length
          })
        } catch (error) {
          console.error('Failed to load user statistics:', error)
          setStats({
            totalTasks: 0,
            completedTasks: 0,
            totalLeaves: 0,
            totalWFH: 0
          })
        }
      }
    }

    loadStats()

    setInitialized(true)
  }, [currentUser, router, initialized])

  const loadUserStats = async () => {
    if (!currentUser) return

    try {
      let tasks: Task[] = []

      // Try GraphQL for tasks first
      try {
        console.log('🔵 [Profile Refresh] Attempting GraphQL query for tasks...')
        const data = await executeGraphQLQuery(QUERIES.GET_TASKS, {
          assignedTo: currentUser.employeeId
        })
        tasks = data.tasks || []
        console.log('✅ [Profile Refresh] GraphQL query successful:', tasks.length, 'tasks')
      } catch (graphqlError) {
        console.warn('⚠️ [Profile Refresh] GraphQL failed, falling back to REST:', graphqlError)

        // Fallback to REST API
        const tasksResponse = await fetch(`/api/tasks/user/${currentUser.employeeId}`)
        const tasksData = tasksResponse.ok ? await tasksResponse.json() : { data: [] }
        tasks = tasksData.data || []
        console.log('✅ [Profile Refresh] REST API successful:', tasks.length, 'tasks')
      }

      // Fetch leaves and WFH from REST (not in GraphQL schema yet)
      const [leavesResponse, wfhsResponse] = await Promise.all([
        fetch(`/api/leaves/user/${currentUser.employeeId}`),
        fetch(`/api/wfh/user/${currentUser.employeeId}`)
      ])

      const leavesData = leavesResponse.ok ? await leavesResponse.json() : { data: [] }
      const wfhsData = wfhsResponse.ok ? await wfhsResponse.json() : { data: [] }

      const leaves = leavesData.data || []
      const wfhs = wfhsData.data || []

      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter((task: Task) => task.status === 'Done').length,
        totalLeaves: leaves.length,
        totalWFH: wfhs.length
      })
    } catch (error) {
      console.error('Failed to load user statistics:', error)
      setStats({
        totalTasks: 0,
        completedTasks: 0,
        totalLeaves: 0,
        totalWFH: 0
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!user) {
        throw new Error('User not found')
      }

      // Validation
      if (!formData.name || !formData.email || !formData.phone || !formData.department) {
        throw new Error('Please fill in all required fields')
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address')
      }

      // Phone validation
      const phoneRegex = /^[\+]?[0-9\-\s\(\)]+$/
      if (!phoneRegex.test(formData.phone)) {
        throw new Error('Please enter a valid phone number')
      }

      // Update user data
      const updatedUser: User = {
        ...user,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        telegramToken: formData.telegramToken || undefined,
        department: formData.department,
        managerEmail: formData.managerEmail || undefined,
        // Only update password if provided
        ...(formData.password && { password: formData.password })
      }

      const success = await updateUser(updatedUser)

      if (success) {
        setUser(updatedUser)
        setIsEditing(false)
        setSuccess('Profile updated successfully!')
        // Clear password field
        setFormData(prev => ({ ...prev, password: '' }))
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone,
        telegramToken: user.telegramToken || '',
        department: user.department,
        managerEmail: user.managerEmail || '',
        password: ''
      })
    }
    setIsEditing(false)
    setError('')
    setSuccess('')
  }

  const handleIdCardPhotoUploadSuccess = (photoUrl: string) => {
    // Update user state with new photo URL
    if (user) {
      setUser({
        ...user,
        idCardPhoto: photoUrl
      })
    }
  }

  if (!user) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }



  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your personal information and account settings</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <a
            href="/profile/notifications"
            className="btn-secondary flex items-center space-x-2"
          >
            <Bell className="h-4 w-4" />
            <span>Notification Settings</span>
          </a>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Overview */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center">
            <span className="text-black font-bold text-xl">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-black">{user.name}</h2>
            <p className="text-gray-600">{user.employeeId}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                user.role === 'top_management' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {getRoleDisplayName(user.role)}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {user.status}
              </span>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.totalTasks}</div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.completedTasks}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.totalLeaves}</div>
            <div className="text-sm text-gray-600">Total Leaves</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.totalWFH}</div>
            <div className="text-sm text-gray-600">Total WFH</div>
          </div>
        </div>

        {/* ID Card Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-black mb-3">Employee ID Card</h3>
          <IDCard user={user} />
        </div>

        {/* ID Card Photo Upload Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-black mb-3">ID Card Photo</h3>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <IdCardPhotoUpload
              currentPhotoUrl={user.idCardPhoto}
              onUploadSuccess={handleIdCardPhotoUploadSuccess}
            />
          </div>
        </div>

        {/* Security Settings Section */}
        <div className="mb-6 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-black mb-3">Security & Device Settings</h3>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-4">
            
            {/* Biometric Toggle Row */}
            {bioSupported && (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-black">Biometric Login (Touch ID / Face ID)</h4>
                  <p className="text-sm text-gray-500">Enable Touch ID/Face ID to quickly unlock the application.</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBiometricWeb}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    biometricEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Error & Success indicators specific to security */}
            {securityError && (
              <p className="text-sm text-rose-500">{securityError}</p>
            )}
            {securitySuccess && (
              <p className="text-sm text-green-600">{securitySuccess}</p>
            )}

            {/* PIN Settings Row */}
            <div className="border-t border-gray-200 pt-4 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-black">App Security PIN</h4>
                  <p className="text-sm text-gray-500">Configure your 4-digit authentication lock PIN.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPinEditing(!isPinEditing)
                    setSecurityError('')
                    setSecuritySuccess('')
                  }}
                  className="btn-secondary"
                >
                  {isPinEditing ? 'Cancel' : 'Change PIN'}
                </button>
              </div>

              {isPinEditing && (
                <form onSubmit={handleChangePinWeb} className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-200 mt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Current PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                      className="input-field text-center font-mono tracking-widest text-lg"
                      placeholder="••••"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">New PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      className="input-field text-center font-mono tracking-widest text-lg"
                      placeholder="••••"
                      required
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New PIN</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        maxLength={4}
                        value={confirmNewPin}
                        onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                        className="input-field text-center font-mono tracking-widest text-lg flex-1"
                        placeholder="••••"
                        required
                      />
                      <button type="submit" className="btn-primary">
                        Save
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee ID (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Employee ID
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={user.employeeId}
                  disabled
                  className="input-field pl-10 bg-gray-100 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Employee ID cannot be changed</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!isEditing}
                required
                className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
                  className={`input-field pl-10 ${!isEditing ? 'bg-gray-50' : ''}`}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
                  className={`input-field pl-10 ${!isEditing ? 'bg-gray-50' : ''}`}
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Department *
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  disabled={!isEditing || isLoadingSettings}
                  required
                  className={`input-field pl-10 ${!isEditing ? 'bg-gray-50' : ''}`}
                >
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Manager Email */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Manager Email
              </label>
              <input
                type="email"
                name="managerEmail"
                value={formData.managerEmail}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`}
                placeholder="amtariksha@gmail.com"
              />
            </div>

            {/* Telegram Token */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Telegram Token
              </label>
              <input
                type="text"
                name="telegramToken"
                value={formData.telegramToken}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`input-field ${!isEditing ? 'bg-gray-50' : ''}`}
                placeholder="Optional telegram token"
              />
            </div>

            {/* Password (only when editing) */}
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Leave blank to keep current password"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
      </div>
    </div>
  )
}
