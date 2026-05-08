'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { hasTabAccess } from '@/lib/permissions'
import { Calendar, Clock, Phone, FileText, Save, X, AlertCircle } from 'lucide-react'
import { optimizedDataService } from '@/lib/optimizedDataService'
import Navbar from '@/components/layout/Navbar'

export default function ApplyLeave() {
  const [formData, setFormData] = useState({
    leaveType: '',
    reason: '',
    fromDate: '',
    toDate: '',
    isHalfDay: false,
    emergencyContact: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [minDate, setMinDate] = useState('')
  const [savedContacts, setSavedContacts] = useState<string[]>([])
  const [showContactSuggestions, setShowContactSuggestions] = useState(false)
  const router = useRouter()
  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }

    if (!hasTabAccess(currentUser, 'leaves')) {
      router.push('/dashboard')
      return
    }

    if (initialized) return // Prevent multiple executions

    // Set default dates to today
    const today = new Date().toISOString().split('T')[0]
    setMinDate(today)
    setFormData(prev => ({
      ...prev,
      fromDate: today,
      toDate: today
    }))

    // Load saved emergency contacts from user profile
    const loadSavedContacts = async () => {
      try {
        const response = await fetch(`/api/users/${currentUser.employeeId}`)
        if (response.ok) {
          const userData = await response.json()
          if (userData.data?.emergencyContacts) {
            setSavedContacts(userData.data.emergencyContacts)
          }
        }
      } catch (error) {
        console.error('Failed to load saved contacts:', error)
      }
    }

    loadSavedContacts()
    setInitialized(true)
  }, [currentUser, router, initialized])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else {
      setFormData(prev => {
        const updated = {
          ...prev,
          [name]: value
        }
        // Auto-sync toDate when fromDate is changed
        if (name === 'fromDate' && value) {
          updated.toDate = value
        }
        return updated
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      // Validation
      if (!formData.leaveType || !formData.reason || !formData.fromDate || !formData.toDate) {
        throw new Error('Please fill in all required fields')
      }

      // Check if from date is not in the past
      if (formData.fromDate < minDate) {
        throw new Error('Cannot apply for leave on past dates')
      }

      // Check if from date is not after to date
      if (new Date(formData.fromDate) > new Date(formData.toDate)) {
        throw new Error('From date cannot be after to date')
      }

      // Half-day validation
      if (formData.isHalfDay) {
        // Validate half-day dates
        const validationResponse = await fetch(`/api/half-day?action=validate&fromDate=${formData.fromDate}&toDate=${formData.toDate}&type=leave`)
        const validationResult = await validationResponse.json()

        if (!validationResult.success || !validationResult.data.isValid) {
          throw new Error(validationResult.data?.error || 'Invalid half-day dates')
        }

        // Check for existing applications
        const conflictResponse = await fetch(`/api/half-day?action=conflict&employeeId=${currentUser.employeeId}&date=${formData.fromDate}`)
        const conflictResult = await conflictResponse.json()

        if (!conflictResult.success) {
          throw new Error('Failed to check for existing applications')
        }

        if (conflictResult.data.hasConflict) {
          throw new Error(conflictResult.data.conflictDetails)
        }
      }

      // Create leave application - it will be sent to the user's manager
      const applicationData = {
        employeeId: currentUser.employeeId,
        employeeName: currentUser.name,
        leaveType: formData.leaveType as any,
        reason: formData.reason,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        isHalfDay: formData.isHalfDay,
        emergencyContact: formData.emergencyContact || undefined,
        status: 'Pending' as const,
        managerId: currentUser.managerId // Send to manager for approval
      }

      // Submit leave application via API
      const response = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit leave application')
      }

      const responseData = await response.json()
      const leaveId = responseData.data?.id

      // Save emergency contact to user profile if provided and not already saved
      if (formData.emergencyContact && !savedContacts.includes(formData.emergencyContact)) {
        try {
          const newContacts = [...savedContacts, formData.emergencyContact]
          await fetch(`/api/users/${currentUser.employeeId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ emergencyContacts: newContacts })
          })
        } catch (error) {
          console.error('Failed to save emergency contact:', error)
          // Don't fail the leave application if contact save fails
        }
      }

      // Clear application cache to ensure fresh data is loaded
      optimizedDataService.clearApplicationCache()

      // Redirect to my-applications page to show the created leave
      router.push('/my-applications')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      leaveType: '',
      reason: '',
      fromDate: minDate,
      toDate: minDate,
      isHalfDay: false,
      emergencyContact: ''
    })
    setError('')
  }

  if (!currentUser) return null

  const leaveTypes = [
    'Sick Leave',
    'Casual Leave',
    'Annual Leave',
    'Emergency Leave',
    'Maternity Leave',
    'Paternity Leave'
  ]

  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Apply for Leave</h1>
          <p className="text-gray-600 mt-1">Submit your leave application for approval</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Leave Type */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Leave Type *
              </label>
              <select
                name="leaveType"
                value={formData.leaveType}
                onChange={handleInputChange}
                required
                className="input-field"
              >
                <option value="">Choose leave type...</option>
                {leaveTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Reason for Leave *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="input-field pl-10"
                  placeholder="Please provide a detailed reason for your leave..."
                />
              </div>
            </div>

            {/* Leave Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  From Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    name="fromDate"
                    value={formData.fromDate}
                    onChange={handleInputChange}
                    required
                    min={minDate}
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  To Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    name="toDate"
                    value={formData.toDate}
                    onChange={handleInputChange}
                    required
                    min={formData.fromDate || minDate}
                    className="input-field pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Half Day Option */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isHalfDay"
                name="isHalfDay"
                checked={formData.isHalfDay}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="isHalfDay" className="text-sm font-medium text-black">
                Half Day Leave
              </label>
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Emergency Contact (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => {
                    handleInputChange(e)
                    setShowContactSuggestions(true)
                  }}
                  onFocus={() => setShowContactSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowContactSuggestions(false), 200)}
                  className="input-field pl-10"
                  placeholder="Contact number during leave"
                  autoComplete="off"
                />

                {/* Contact Suggestions Dropdown */}
                {showContactSuggestions && savedContacts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    {savedContacts.map((contact, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, emergencyContact: contact }))
                          setShowContactSuggestions(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex items-center space-x-2"
                      >
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{contact}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {savedContacts.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Tip: Click on the field to see your saved emergency contacts
                </p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push('/my-applications')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Submitting...' : 'Apply Leave'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
