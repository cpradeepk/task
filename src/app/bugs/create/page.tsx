'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { BugFormData, User } from '@/lib/types'
import { createBug } from '@/lib/bugService'
import { getCurrentUser, getAllUsers } from '@/lib/auth'
import { Bug, AlertCircle, Save, X, FileText, Settings, CheckSquare, Paperclip, Clock, Tag } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function CreateBugPage() {
  const [formData, setFormData] = useState<BugFormData>({
    title: '',
    description: '',
    severity: 'Minor',
    priority: 'Low',
    category: 'Other',
    platform: 'Web',
    environment: 'Production',
    browserInfo: '',
    deviceInfo: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    attachments: '',
    estimatedHours: undefined,
    tags: '',
    relatedBugs: ''
  })
  
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [error, setError] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)

  const router = useRouter()
  const currentUser = getCurrentUser()

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const loadUsers = useCallback(async () => {
    if (usersLoaded) return

    try {
      setIsLoadingUsers(true)
      const allUsers = await getAllUsers()
      setUsers(allUsers.filter(user => user.status === 'active'))
      setUsersLoaded(true)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [usersLoaded])

  useEffect(() => {
    if (!isHydrated) return

    if (!currentUser) {
      router.push('/')
      return
    }

    // Admin users have full access to bug tracking

    loadUsers()
  }, [currentUser, router, isHydrated, loadUsers])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimatedHours' ? (value ? parseFloat(value) : undefined) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUser) return
    
    // Validate required fields
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }
    
    if (!formData.description.trim()) {
      setError('Description is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const bugData = {
        ...formData,
        reportedBy: currentUser.employeeId
      }

      const bugId = await createBug(bugData)
      
      if (bugId) {
        router.push(`/bugs/${bugId}`)
      } else {
        setError('Failed to create bug. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Prevent hydration mismatch by not rendering until hydrated
  if (!isHydrated) {
    return (
      <div>
        <Navbar />
        <LoadingSpinner size="lg" message="Loading..." center />
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div>
      <Navbar />
      <div className="max-w-5xl mx-auto p-6 content-fade-in page-transition">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bug className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Report New Bug</h1>
              <p className="text-gray-600 mt-1">Help us improve by reporting issues you've encountered</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Before reporting a bug:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Check if this issue has already been reported</li>
                  <li>Provide as much detail as possible to help us reproduce the issue</li>
                  <li>Include screenshots or videos if they help explain the problem</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Information Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Bug className="h-5 w-5 text-blue-600" />
                  <span>Bug Information</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">Provide basic details about the bug</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bug Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Brief, descriptive title of the bug"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Severity <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="severity"
                      value={formData.severity}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      required
                    >
                      <option value="Critical">🔴 Critical</option>
                      <option value="Major">🟠 Major</option>
                      <option value="Minor">🟡 Minor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      required
                    >
                      <option value="High">⬆️ High</option>
                      <option value="Medium">➡️ Medium</option>
                      <option value="Low">⬇️ Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      required
                    >
                      <option value="UI">🎨 UI</option>
                      <option value="API">🔌 API</option>
                      <option value="Backend">⚙️ Backend</option>
                      <option value="Performance">⚡ Performance</option>
                      <option value="Security">🔒 Security</option>
                      <option value="Database">🗄️ Database</option>
                      <option value="Integration">🔗 Integration</option>
                      <option value="Other">📋 Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Platform <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="platform"
                      value={formData.platform}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      required
                    >
                      <option value="Web">🌐 Web</option>
                      <option value="iOS">📱 iOS</option>
                      <option value="Android">🤖 Android</option>
                      <option value="All">🔄 All Platforms</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Environment <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="environment"
                      value={formData.environment}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      required
                    >
                      <option value="Production">🚀 Production</option>
                      <option value="Staging">🧪 Staging</option>
                      <option value="Development">💻 Development</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Assign To (Optional)
                    </label>
                    {!usersLoaded ? (
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center min-h-[48px]">
                        {isLoadingUsers ? (
                          <LoadingSpinner size="sm" message="Loading users..." />
                        ) : (
                          <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <select
                        name="assignedTo"
                        value={formData.assignedTo || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      >
                        <option value="">👤 Select assignee...</option>
                        {users.map(user => (
                          <option key={user.employeeId} value={user.employeeId}>
                            {user.name} ({user.employeeId})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <span>Bug Description</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">Provide detailed information about the bug</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                  placeholder="Provide a detailed description of the bug, including what went wrong and any relevant context..."
                  required
                />
              </div>
            </div>

            {/* Technical Details Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-purple-600" />
                  <span>Technical Details</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">Environment and system information</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Browser Information
                  </label>
                  <input
                    type="text"
                    name="browserInfo"
                    value={formData.browserInfo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., Chrome 91.0.4472.124, Safari 14.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Device Information
                  </label>
                  <input
                    type="text"
                    name="deviceInfo"
                    value={formData.deviceInfo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., iPhone 12, Windows 10, MacBook Pro"
                  />
                </div>
              </div>
            </div>

            {/* Reproduction Steps Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <CheckSquare className="h-5 w-5 text-orange-600" />
                  <span>Reproduction & Behavior</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">Help us understand and reproduce the issue</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Steps to Reproduce
                  </label>
                  <textarea
                    name="stepsToReproduce"
                    value={formData.stepsToReproduce}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                    placeholder="Please provide step-by-step instructions:&#10;1. Go to the login page&#10;2. Enter invalid credentials&#10;3. Click 'Sign In' button&#10;4. Observe the error"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Expected Behavior
                    </label>
                    <textarea
                      name="expectedBehavior"
                      value={formData.expectedBehavior}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                      placeholder="What should happen? Describe the expected outcome..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Actual Behavior
                    </label>
                    <textarea
                      name="actualBehavior"
                      value={formData.actualBehavior}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                      placeholder="What actually happened? Describe what went wrong..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Paperclip className="h-5 w-5 text-indigo-600" />
                  <span>Additional Information</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">Optional details to help with resolution</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                    <Paperclip className="h-4 w-4" />
                    <span>Attachments (URLs)</span>
                  </label>
                  <input
                    type="text"
                    name="attachments"
                    value={formData.attachments}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="https://example.com/screenshot1.png, https://example.com/video.mp4"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate multiple URLs with commas</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Estimated Hours</span>
                  </label>
                  <input
                    type="number"
                    name="estimatedHours"
                    value={formData.estimatedHours || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="0.5"
                    min="0"
                    step="0.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Estimated time to fix this bug</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                    <Tag className="h-4 w-4" />
                    <span>Tags</span>
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="urgent, login, payment, mobile"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated keywords for categorization</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                    <Bug className="h-4 w-4" />
                    <span>Related Bugs</span>
                  </label>
                  <input
                    type="text"
                    name="relatedBugs"
                    value={formData.relatedBugs}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="BUG-123456789, BUG-987654321"
                  />
                  <p className="text-xs text-gray-500 mt-1">Reference related bug IDs</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-8 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                <span className="text-red-500">*</span> Required fields
              </div>

              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/bugs')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>

                <LoadingButton
                  type="submit"
                  isLoading={isLoading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center space-x-2 font-medium"
                >
                  <Save className="h-4 w-4" />
                  <span>Report Bug</span>
                </LoadingButton>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
