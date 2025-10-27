'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Calendar, Clock, Phone, MapPin, FileText, Save, X, AlertCircle } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'

export default function ApplyWFH() {
  const [formData, setFormData] = useState({
    wfhType: '',
    reason: '',
    fromDate: '',
    toDate: '',
    workLocation: '',
    availableFrom: '',
    availableTo: '',
    contactNumber: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [minDate, setMinDate] = useState('')
  const router = useRouter()
  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }

    if (initialized) return // Prevent multiple executions

    // Set default dates to today and contact number
    const today = new Date().toISOString().split('T')[0]
    setMinDate(today)
    setFormData(prev => ({
      ...prev,
      fromDate: today,
      toDate: today,
      contactNumber: currentUser.phone || ''
    }))

    setInitialized(true)
  }, [currentUser, router, initialized])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

    try {
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      // Validation
      if (!formData.wfhType || !formData.reason || !formData.fromDate || 
          !formData.toDate || !formData.workLocation || !formData.contactNumber) {
        throw new Error('Please fill in all required fields')
      }

      // Check if from date is not in the past
      if (formData.fromDate < minDate) {
        throw new Error('Cannot apply for WFH on past dates')
      }

      // Check if from date is not after to date
      if (new Date(formData.fromDate) > new Date(formData.toDate)) {
        throw new Error('From date cannot be after to date')
      }

      // Validate availability times for flexible hours
      if (formData.wfhType === 'Flexible Hours') {
        if (!formData.availableFrom || !formData.availableTo) {
          throw new Error('Please specify availability hours for flexible WFH')
        }
      }

      // Half-day validation
      if (formData.wfhType === 'Half Day') {
        // Validate half-day dates
        const validationResponse = await fetch(`/api/half-day?action=validate&fromDate=${formData.fromDate}&toDate=${formData.toDate}&type=wfh`)
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

      // Create WFH application - it will be sent to the user's manager
      const applicationData = {
        employeeId: currentUser.employeeId,
        employeeName: currentUser.name,
        wfhType: formData.wfhType as any,
        reason: formData.reason,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        workLocation: formData.workLocation,
        availableFrom: formData.availableFrom || undefined,
        availableTo: formData.availableTo || undefined,
        contactNumber: formData.contactNumber,
        status: 'Pending' as const,
        managerId: currentUser.managerId // Send to manager for approval
      }

      // Submit WFH application via API
      const response = await fetch('/api/wfh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit WFH application')
      }
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      wfhType: '',
      reason: '',
      fromDate: minDate,
      toDate: minDate,
      workLocation: '',
      availableFrom: '',
      availableTo: '',
      contactNumber: currentUser?.phone || ''
    })
    setError('')
  }

  if (!currentUser) return null

  const wfhTypes = [
    'Full Day',
    'Half Day',
    'Flexible Hours'
  ]

  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Apply for Work From Home</h1>
          <p className="text-gray-600 mt-1">Submit your work from home application for approval</p>
        </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {/* WFH Type */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              WFH Type *
            </label>
            <select
              name="wfhType"
              value={formData.wfhType}
              onChange={handleInputChange}
              required
              className="input-field"
            >
              <option value="">Choose WFH type...</option>
              {wfhTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Reason for WFH *
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
                placeholder="Please provide a detailed reason for working from home..."
              />
            </div>
          </div>

          {/* WFH Dates */}
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

          {/* Work Location */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Work Location *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="workLocation"
                value={formData.workLocation}
                onChange={handleInputChange}
                required
                className="input-field pl-10"
                placeholder="e.g., Home, Co-working space, etc."
              />
            </div>
          </div>

          {/* Availability Hours (for Flexible Hours) */}
          {formData.wfhType === 'Flexible Hours' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Available From *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    name="availableFrom"
                    value={formData.availableFrom}
                    onChange={handleInputChange}
                    required={formData.wfhType === 'Flexible Hours'}
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Available To *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    name="availableTo"
                    value={formData.availableTo}
                    onChange={handleInputChange}
                    required={formData.wfhType === 'Flexible Hours'}
                    className="input-field pl-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Contact Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleInputChange}
                required
                className="input-field pl-10"
                placeholder="Contact number during WFH"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isLoading ? 'Submitting...' : 'Apply WFH'}</span>
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  )
}
