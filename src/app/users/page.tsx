'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, addUser, updateUser, getRoleDisplayName } from '@/lib/auth'
import { optimizedDataService } from '@/lib/optimizedDataService'
import { User } from '@/lib/types'
import {
  Plus,
  Edit,
  Search,
  Filter,
  Users as UsersIcon,
  Mail,
  Phone,
  Building,
  Shield,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import UserModal from '@/components/users/UserModal'
import Navbar from '@/components/layout/Navbar'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import LoadingButton from '@/components/ui/LoadingButton'
import { useLoading } from '@/contexts/LoadingContext'

// Fetch with timeout to prevent hanging
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout: ${url} took longer than ${timeoutMs}ms`)
    }
    throw error
  }
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [sendingCredentials, setSendingCredentials] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(0)
  const [isHydrated, setIsHydrated] = useState(false)
  const router = useRouter()
  const currentUser = getCurrentUser()
  const { showGlobalLoading, hideGlobalLoading } = useLoading()

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Optimized user loading with caching
  const loadUsers = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true)
      }
      const allUsers = await optimizedDataService.getAllUsers(forceRefresh)
      setUsers(allUsers)
      setLastRefresh(Date.now())
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      if (forceRefresh) {
        setIsRefreshing(false)
      }
    }
  }, []) // Empty dependency array since this function doesn't depend on any props or state

  useEffect(() => {
    const initializeData = async () => {
      if (!isHydrated) return

      if (!currentUser) {
        router.push('/')
        return
      }

      if (currentUser.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      // Load users with caching - only show loading on initial load
      try {
        const allUsers = await optimizedDataService.getAllUsers(false)
        setUsers(allUsers)
        setLastRefresh(Date.now())
      } catch (error) {
        console.error('Failed to load users:', error)
      } finally {
        setIsInitialLoading(false)
      }
    }

    initializeData()
  }, [currentUser, router, isHydrated])

  // Memoized filtered users for better performance
  const filteredUsers = useMemo(() => {
    let filtered = users

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        user.employeeId.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.department?.toLowerCase().includes(searchLower)
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter)
    }

    return filtered
  }, [users, searchTerm, roleFilter, statusFilter])

  const handleAddUser = () => {
    setSelectedUser(null)
    setIsModalOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleSendCredentials = async (user: User) => {
    if (!user.email) {
      alert('User email is required to send credentials')
      return
    }

    setSendingCredentials(user.employeeId)

    try {
      const response = await fetchWithTimeout(
        `/api/users/${user.employeeId}/send-credentials`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
        15000 // 15 second timeout
      )

      const result = await response.json()

      if (result.success) {
        alert(`✅ Credentials email sent successfully to ${user.email}`)
      } else {
        alert(`❌ Failed to send email: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to send credentials email:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send credentials email'
      alert(`❌ ${errorMessage}. Please try again.`)
    } finally {
      setSendingCredentials(null)
    }
  }

  const handleSaveUser = async (userData: Omit<User, 'createdAt' | 'updatedAt'>) => {
    setIsSaving(true)
    showGlobalLoading(selectedUser ? 'Updating user...' : 'Adding user...')

    try {
      if (selectedUser) {
        // Update existing user
        const success = await updateUser(userData as User)
        if (success) {
          // Clear cache and reload with fresh data without showing loading state
          optimizedDataService.clearUserCache()
          try {
            const allUsers = await optimizedDataService.getAllUsers(true)
            setUsers(allUsers)
            setLastRefresh(Date.now())
          } catch (error) {
            console.error('Failed to reload users:', error)
          }
          setIsModalOpen(false)
          setSelectedUser(null)
        } else {
          alert('Failed to update user. Please try again.')
        }
      } else {
        // Add new user
        const success = await addUser(userData)
        if (success) {
          // Clear cache and reload with fresh data without showing loading state
          optimizedDataService.clearUserCache()
          try {
            const allUsers = await optimizedDataService.getAllUsers(true)
            setUsers(allUsers)
            setLastRefresh(Date.now())
          } catch (error) {
            console.error('Failed to reload users:', error)
          }
          setIsModalOpen(false)

          // Automatically send credentials email for new user if email is provided
          if (userData.email) {
            try {
              const response = await fetchWithTimeout(
                `/api/users/${userData.employeeId}/send-credentials`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({}),
                },
                15000 // 15 second timeout
              )

              const result = await response.json()

              if (result.success) {
                alert(`✅ User created successfully! Credentials email sent to ${userData.email}`)
              } else {
                alert(`✅ User created successfully! However, failed to send credentials email: ${result.error}`)
              }
            } catch (emailError) {
              console.error('Failed to send credentials email:', emailError)
              const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error'
              alert(`✅ User created successfully! However, ${errorMessage}. You can send it manually from the user list.`)
            }
          } else {
            alert('✅ User created successfully!')
          }
        } else {
          alert('Failed to add user. This might be due to Google Sheets quota limits. Please wait a moment and try again.')
        }
      }
    } catch (error) {
      console.error('Failed to save user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to save user: ${errorMessage}. Please try again.`)
    } finally {
      setIsSaving(false)
      hideGlobalLoading()
    }
  }

  // Prevent hydration mismatch and flickering
  if (!isHydrated) {
    return (
      <>
        <Navbar />
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
            <div className="h-10 bg-gray-200 rounded w-full mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!currentUser) return null

  const roles = [
    { value: 'all', label: 'All Roles' },
    { value: 'employee', label: 'Employee' },
    { value: 'management', label: 'Management' },
    { value: 'top_management', label: 'Top Management' },
    { value: 'admin', label: 'Administrator' }
  ]

  const statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-6 animate-smooth-appear">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">User Management</h1>
            <p className="text-gray-600 mt-1">
              Manage system users and their permissions
              {lastRefresh > 0 && (
                <span className="text-xs text-gray-500 ml-2">
                  Last updated: {new Date(lastRefresh).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <LoadingButton
              onClick={() => loadUsers(true)}
              isLoading={isRefreshing}
              variant="secondary"
              className="flex items-center space-x-2 px-3 py-2 rounded-lg font-medium text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </LoadingButton>
            <LoadingButton
              onClick={handleAddUser}
              isLoading={isSaving}
              variant="primary"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Add User</span>
            </LoadingButton>
          </div>
        </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Search Users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                placeholder="Search by name, email, ID..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field"
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              {statuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-secondary-600 min-w-[120px]">
              {isInitialLoading ? (
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              ) : (
                `Showing ${filteredUsers.length} of ${users.length} users`
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      {isInitialLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div>
                      <div className="h-5 bg-gray-200 rounded w-32 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-4 bg-gray-200 rounded w-40"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 rounded w-36"></div>
                  </div>
                </div>
                <div className="mt-4 lg:mt-0 lg:ml-6 flex space-x-3">
                  <div className="h-9 w-16 bg-gray-200 rounded"></div>
                  <div className="h-9 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card text-center py-8">
          <UsersIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <p className="text-secondary-600">No users found</p>
          <p className="text-sm text-secondary-500 mt-1">
            {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first user to get started'
            }
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 user-list-container ${isRefreshing ? 'loading' : ''}`}>
          {filteredUsers.map((user) => (
            <div key={user.employeeId} className="card">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-medium text-sm">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-secondary-900">{user.name}</h3>
                      <p className="text-sm text-secondary-600">{user.employeeId}</p>
                    </div>
                    <div className="flex items-center space-x-2">
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-secondary-600">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>{user.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4" />
                      <span>{user.department}</span>
                    </div>
                  </div>

                  {user.warningCount > 0 && (
                    <div className="mt-3 flex items-center space-x-2 text-sm text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Warning Count: {user.warningCount}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 lg:mt-0 lg:ml-6 flex space-x-3">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>

                  <LoadingButton
                    onClick={() => handleSendCredentials(user)}
                    isLoading={sendingCredentials === user.employeeId}
                    className="btn-primary flex items-center space-x-2"
                    disabled={!user.email}
                  >
                    <Mail className="h-4 w-4" />
                    <span>Mail</span>
                  </LoadingButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Modal */}
      <UserModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedUser(null)
        }}
        onSave={handleSaveUser}
        existingUsers={users}
      />
      </div>
    </>
  )
}
