'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, updateUser, getRoleDisplayName } from '@/lib/auth'
import { User, Task } from '@/lib/types'
import { DEPARTMENTS } from '@/lib/constants/departments'
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
  CheckCircle
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import IDCard from '@/components/profile/IDCard'

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
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
  const router = useRouter()
  const currentUser = getCurrentUser()

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
          // Fetch data from API endpoints
          const [tasksResponse, leavesResponse, wfhsResponse] = await Promise.all([
            fetch(`/api/tasks/user/${currentUser.employeeId}`),
            fetch(`/api/leaves/user/${currentUser.employeeId}`),
            fetch(`/api/wfh/user/${currentUser.employeeId}`)
          ])

          const tasksData = tasksResponse.ok ? await tasksResponse.json() : { data: [] }
          const leavesData = leavesResponse.ok ? await leavesResponse.json() : { data: [] }
          const wfhsData = wfhsResponse.ok ? await wfhsResponse.json() : { data: [] }

          const tasks = tasksData.data || []
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
      // Fetch data from API endpoints
      const [tasksResponse, leavesResponse, wfhsResponse] = await Promise.all([
        fetch(`/api/tasks/user/${currentUser.employeeId}`),
        fetch(`/api/leaves/user/${currentUser.employeeId}`),
        fetch(`/api/wfh/user/${currentUser.employeeId}`)
      ])

      const tasksData = tasksResponse.ok ? await tasksResponse.json() : { data: [] }
      const leavesData = leavesResponse.ok ? await leavesResponse.json() : { data: [] }
      const wfhsData = wfhsResponse.ok ? await wfhsResponse.json() : { data: [] }

      const tasks = tasksData.data || []
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
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-primary flex items-center space-x-2 mt-4 sm:mt-0"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>
        )}
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
                  disabled={!isEditing}
                  required
                  className={`input-field pl-10 ${!isEditing ? 'bg-gray-50' : ''}`}
                >
                  {DEPARTMENTS.map(dept => (
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
