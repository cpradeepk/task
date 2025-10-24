'use client'

import { useState, useEffect } from 'react'
import { User } from '@/lib/types'
import { DEPARTMENTS } from '@/lib/constants/departments'
import { generateTemporaryPassword } from '@/lib/utils/password'
import { X, Save, User as UserIcon, Mail, Phone, Building, Shield, AlertCircle } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface UserModalProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
  onSave: (userData: Omit<User, 'createdAt' | 'updatedAt'>) => void
  existingUsers?: User[] // Pass existing users to avoid additional API calls
}

export default function UserModal({ user, isOpen, onClose, onSave, existingUsers = [] }: UserModalProps) {
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    telegramToken: '',
    department: '',
    managerEmail: '',
    managerId: '',
    isTodayTask: false,
    warningCount: 0,
    role: 'employee',
    password: '',
    status: 'active'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isGeneratingId, setIsGeneratingId] = useState(false)
  const [isLookingUpManager, setIsLookingUpManager] = useState(false)
  const [managerInfo, setManagerInfo] = useState<{ name: string; id: string } | null>(null)

  // Function to generate next Employee ID using existing users data
  const generateNextEmployeeId = (): string => {
    try {
      setIsGeneratingId(true)

      // Use existing users data instead of making API call
      const users = existingUsers

      // Filter only AM- prefixed IDs and extract numbers
      const elIds = users
        .filter((user: any) => user.employeeId?.startsWith('AM-'))
        .map((user: any) => {
          const match = user.employeeId.match(/^AM-(\d{4})$/)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter((num: number) => num > 0)

      // Find the highest number and increment
      const maxId = elIds.length > 0 ? Math.max(...elIds) : 0
      const nextId = maxId + 1

      // Format as AM-0001, AM-0002, etc.
      return `AM-${nextId.toString().padStart(4, '0')}`
    } catch (error) {
      console.error('Error generating Employee ID:', error)
      // Fallback to AM-0001 if there's an error
      return 'AM-0001'
    } finally {
      setIsGeneratingId(false)
    }
  }

  const lookupManagerByEmail = async (email: string) => {
    if (!email.trim()) {
      setManagerInfo(null)
      setFormData(prev => ({ ...prev, managerId: '' }))
      return
    }

    setIsLookingUpManager(true)
    try {
      // First check in existing users (from props)
      const managerFromExisting = existingUsers.find(u =>
        u.email.toLowerCase() === email.toLowerCase()
      )

      if (managerFromExisting) {
        setManagerInfo({
          name: managerFromExisting.name,
          id: managerFromExisting.employeeId
        })
        setFormData(prev => ({
          ...prev,
          managerId: managerFromExisting.employeeId
        }))
      } else {
        // If not found in existing users, fetch from API
        const response = await fetch('/api/users')
        if (response.ok) {
          const result = await response.json()
          const allUsers = result.success ? result.data : []
          const manager = allUsers.find((u: User) =>
            u.email.toLowerCase() === email.toLowerCase()
          )

          if (manager) {
            setManagerInfo({
              name: manager.name,
              id: manager.employeeId
            })
            setFormData(prev => ({
              ...prev,
              managerId: manager.employeeId
            }))
          } else {
            setManagerInfo(null)
            setFormData(prev => ({ ...prev, managerId: '' }))
            setError(`Manager with email "${email}" not found. Please ensure the manager exists in the system.`)
          }
        } else {
          throw new Error('Failed to fetch users')
        }
      }
    } catch (error) {
      console.error('Failed to lookup manager:', error)
      setManagerInfo(null)
      setFormData(prev => ({ ...prev, managerId: '' }))
      setError('Failed to lookup manager. Please check the email and try again.')
    } finally {
      setIsLookingUpManager(false)
    }
  }

  useEffect(() => {
    if (user) {
      setFormData({
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        telegramToken: user.telegramToken || '',
        department: user.department,
        managerEmail: user.managerEmail || '',
        managerId: user.managerId || '',
        isTodayTask: user.isTodayTask,
        warningCount: user.warningCount,
        role: user.role,
        password: user.password,
        status: user.status
      })
    } else {
      // Reset form for new user and generate Employee ID
      if (isOpen) {
        const nextEmployeeId = generateNextEmployeeId()
        const tempPassword = generateTemporaryPassword(nextEmployeeId)
        setFormData({
          employeeId: nextEmployeeId,
          name: '',
          email: '',
          phone: '',
          telegramToken: '',
          department: '',
          managerEmail: '',
          managerId: '',
          isTodayTask: false,
          warningCount: 0,
          role: 'employee',
          password: tempPassword,
          status: 'active'
        })
      }
    }
    setError('')
  }, [user, isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))

      // If manager email changed, lookup manager ID
      if (name === 'managerEmail') {
        // Clear any previous error related to manager lookup
        if (error.includes('Manager with email')) {
          setError('')
        }
        // Debounce the lookup to avoid too many API calls
        setTimeout(() => {
          lookupManagerByEmail(value)
        }, 500)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Validation
      if (!formData.employeeId || !formData.name || !formData.email ||
          !formData.phone || !formData.department || !formData.password) {
        throw new Error('Please fill in all required fields')
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address')
      }

      // Phone validation (basic)
      const phoneRegex = /^[\+]?[0-9\-\s\(\)]+$/
      if (!phoneRegex.test(formData.phone)) {
        throw new Error('Please enter a valid phone number')
      }

      // Employee ID format validation (auto-generated IDs should always be valid)
      if (!formData.employeeId.match(/^(AM-\d{4}|admin-\d{3})$/)) {
        throw new Error('Invalid Employee ID format')
      }

      const userData = {
        ...formData,
        id: user?.employeeId || formData.employeeId,
        createdAt: user?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as User

      onSave(userData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      if (errorMessage.includes('quota') || errorMessage.includes('Quota')) {
        setError('Google Sheets quota limit reached. Please wait a moment and try again.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const roles = [
    { value: 'employee', label: 'Employee' },
    { value: 'management', label: 'Management' },
    { value: 'top_management', label: 'Top Management' }
  ]



  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center p-4 z-50 overflow-y-auto"
      style={{ margin: 0, padding: '1rem', minHeight: '100vh', width: '100vw' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl my-8 relative modal-content transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-secondary-900">
              {user ? 'Edit User' : 'Add New User'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-secondary-400 hover:text-secondary-600 rounded-lg hover:bg-secondary-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Employee ID *
                </label>
                <div className="relative">
                  <UserIcon className="input-icon" />
                  <input
                    type="text"
                    name="employeeId"
                    value={isGeneratingId ? 'Generating...' : formData.employeeId}
                    onChange={handleInputChange}
                    required
                    disabled={true} // Always disabled - auto-generated for new users, non-editable for existing
                    className="input-field-with-icon disabled:bg-secondary-100 disabled:text-secondary-600"
                    placeholder="Auto-generated"
                  />
                </div>
                {!user && (
                  <p className="text-xs text-secondary-500 mt-1">
                    Employee ID is automatically generated in format AM-0001, AM-0002, etc.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="Enter full name"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="input-field-with-icon"
                    placeholder="amtariksha@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="input-icon" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="input-field-with-icon"
                    placeholder="+91-9876543210"
                  />
                </div>
              </div>
            </div>

            {/* Department and Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Department *
                </label>
                <div className="relative">
                  <Building className="input-icon" />
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="input-field-with-icon"
                  >
                    <option value="">Select department...</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Role *
                </label>
                <div className="relative">
                  <Shield className="input-icon" />
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="input-field-with-icon"
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Manager Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="managerEmail"
                    value={formData.managerEmail}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="amtariksha@gmail.com"
                  />
                  {isLookingUpManager && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </div>
                {managerInfo && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-green-700">
                      <UserIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{managerInfo.name}</span>
                      <span className="text-xs text-green-600">({managerInfo.id})</span>
                    </div>
                  </div>
                )}
                {formData.managerEmail && !managerInfo && !isLookingUpManager && (
                  <p className="text-xs text-gray-500 mt-1">
                    Manager will be looked up automatically when you enter a valid email
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Telegram Token
                </label>
                <input
                  type="text"
                  name="telegramToken"
                  value={formData.telegramToken}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Optional telegram token"
                />
              </div>
            </div>

            {/* Password and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Additional Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isTodayTask"
                  name="isTodayTask"
                  checked={formData.isTodayTask}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                />
                <label htmlFor="isTodayTask" className="text-sm font-medium text-secondary-700">
                  Today Task Required
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Warning Count
                </label>
                <input
                  type="number"
                  name="warningCount"
                  value={formData.warningCount}
                  onChange={handleInputChange}
                  min="0"
                  className="input-field"
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-secondary-200">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <LoadingButton
                type="submit"
                isLoading={isLoading}
                loadingText="Saving..."
                variant="primary"
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{user ? 'Update User' : 'Add User'}</span>
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
