'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getTeamMembers } from '@/lib/auth'
import { formatDate, getStatusColor } from '@/lib/data'
import { LeaveApplication, WFHApplication } from '@/lib/types'
import { Check, X, Clock, Calendar, MapPin, Phone } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'

export default function Approvals() {
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([])
  const [wfhApplications, setWFHApplications] = useState<WFHApplication[]>([])
  const [activeTab, setActiveTab] = useState<'leave' | 'wfh'>('leave')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false)
  const [isLoadingWFH, setIsLoadingWFH] = useState(false)
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [isManager, setIsManager] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalData, setApprovalData] = useState<{
    id: string
    type: 'leave' | 'wfh'
    action: 'Approved' | 'Rejected'
    applicantName: string
  } | null>(null)
  const [approvalRemarks, setApprovalRemarks] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasLoadingError, setHasLoadingError] = useState(false)
  const [error, setError] = useState<string>('')
  const [lastLoadTime, setLastLoadTime] = useState(0)
  const router = useRouter()
  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }

    checkManagerStatus()
  }, [currentUser, router])

  const checkManagerStatus = async () => {
    if (!currentUser) return

    try {
      // Check if user has team members (is a manager)
      const response = await fetch(`/api/users/team/${currentUser.employeeId}`)
      if (response.ok) {
        const result = await response.json()
        const team = result.success ? result.data : []
        const hasTeam = Array.isArray(team) && team.length > 0
        setIsManager(hasTeam || currentUser.role === 'top_management' || currentUser.role === 'admin')

        if (hasTeam) {
          setTeamMembers(team.map((member: any) => member.employeeId))
        }

        if (hasTeam || currentUser.role === 'top_management' || currentUser.role === 'admin') {
          await loadApplications()
        }
      } else {
        // If API fails, check role only
        setIsManager(currentUser.role === 'top_management' || currentUser.role === 'admin')
        if (currentUser.role === 'top_management' || currentUser.role === 'admin') {
          await loadApplications()
        }
      }
    } catch (error) {
      console.error('Error checking manager status:', error)
      // Fallback to role-based check
      setIsManager(currentUser.role === 'top_management' || currentUser.role === 'admin')
      if (currentUser.role === 'top_management' || currentUser.role === 'admin') {
        await loadApplications()
      }
    }

    setIsLoading(false)
  }

  const forceRefresh = async () => {
    setLastLoadTime(0) // Reset debounce
    setIsLoadingLeaves(true)
    setIsLoadingWFH(true)
    await loadApplications()
  }

  const loadApplications = async () => {
    // Prevent excessive API calls - minimum 60 seconds between loads
    const now = Date.now()
    if (now - lastLoadTime < 60000) {
      console.log('Skipping load - too soon since last load')
      return
    }
    setLastLoadTime(now)

    setHasLoadingError(false)
    setError('')
    setIsLoadingLeaves(true)
    setIsLoadingWFH(true)

    try {
      let leaves: any[] = []
      let wfhs: any[] = []
      let hasAnyError = false

      // Try to load leave applications with error handling
      try {
        console.log('Loading leave applications...')
        const leaveResponse = await fetch('/api/leaves')
        if (!leaveResponse.ok) {
          throw new Error('Failed to fetch leave applications')
        }
        const leaveResult = await leaveResponse.json()
        leaves = leaveResult.data || []
        console.log(`Successfully loaded ${leaves.length} leave applications`)
      } catch (leaveError: any) {
        console.error('Failed to load leave applications:', leaveError)
        if (leaveError.message && (
          leaveError.message.includes('quota exceeded') ||
          leaveError.message.includes('429') ||
          leaveError.message.includes('API request failed: 500') ||
          leaveError.message.includes('Failed to get leave applications')
        )) {
          console.warn('Google Sheets API issue for leave applications')
          hasAnyError = true
        }
        leaves = [] // Fallback to empty array
      } finally {
        setIsLoadingLeaves(false)
      }

      // Add delay between API calls to avoid quota issues
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Try to load WFH applications with error handling
      try {
        console.log('Loading WFH applications...')
        const wfhResponse = await fetch('/api/wfh')
        if (!wfhResponse.ok) {
          throw new Error('Failed to fetch WFH applications')
        }
        const wfhResult = await wfhResponse.json()
        wfhs = wfhResult.data || []
        console.log(`Successfully loaded ${wfhs.length} WFH applications`)
      } catch (wfhError: any) {
        console.error('Failed to load WFH applications:', wfhError)
        if (wfhError.message && (
          wfhError.message.includes('quota exceeded') ||
          wfhError.message.includes('429') ||
          wfhError.message.includes('API request failed: 500') ||
          wfhError.message.includes('Failed to get WFH applications')
        )) {
          console.warn('Google Sheets API issue for WFH applications')
          hasAnyError = true
        }
        wfhs = [] // Fallback to empty array
      } finally {
        setIsLoadingWFH(false)
      }

      // Set error state if any API calls failed
      setHasLoadingError(hasAnyError)

      if (hasAnyError) {
        setError('Some data could not be loaded due to API limits. Please try refreshing the page in a few minutes.')
      }

      // Filter applications based on manager's team and status (only show pending applications)
      let filteredLeaves = leaves.filter(app => app.status === 'Pending')
      let filteredWFHs = wfhs.filter(app => app.status === 'Pending')

      if (currentUser?.role === 'employee' && teamMembers.length > 0) {
        // For employees who are managers, show only their team's pending applications
        filteredLeaves = filteredLeaves.filter(app => teamMembers.includes(app.employeeId))
        filteredWFHs = filteredWFHs.filter(app => teamMembers.includes(app.employeeId))
      } else if (currentUser?.role === 'top_management') {
        // For top management, show pending applications from their team members
        if (teamMembers.length > 0) {
          filteredLeaves = filteredLeaves.filter(app => teamMembers.includes(app.employeeId))
          filteredWFHs = filteredWFHs.filter(app => teamMembers.includes(app.employeeId))
        }
        // If no team members found, show all pending applications (fallback for top management)
        if (teamMembers.length === 0) {
          // filteredLeaves and filteredWFHs already filtered to pending only
        }
      }
      // Admin sees all pending applications (already filtered to pending only)

      setLeaveApplications(filteredLeaves)
      setWFHApplications(filteredWFHs)
    } catch (error: any) {
      console.error('Failed to load applications:', error)
      setError(`Failed to load applications: ${error.message || 'Unknown error'}. Please try again.`)
      setHasLoadingError(true)
      // Set empty arrays as fallback
      setLeaveApplications([])
      setWFHApplications([])
    }
  }

  const openApprovalModal = (id: string, type: 'leave' | 'wfh', action: 'Approved' | 'Rejected', applicantName: string) => {
    setApprovalData({ id, type, action, applicantName })
    setApprovalRemarks('')
    setShowApprovalModal(true)
  }

  const closeApprovalModal = () => {
    setShowApprovalModal(false)
    setApprovalData(null)
    setApprovalRemarks('')
    setIsProcessing(false)
  }

  const processApproval = async () => {
    if (!currentUser || !approvalData) return

    setIsProcessing(true)
    try {
      let success = false

      if (approvalData.type === 'leave') {
        const endpoint = approvalData.action === 'Approved' ? 'approve' : 'reject'
        const url = `/api/leaves/${approvalData.id}/${endpoint}`
        console.log('Making request to:', url)

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approverId: currentUser.employeeId,
            remarks: approvalRemarks.trim() || undefined
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error:', response.status, errorText)

          // Handle quota exceeded specifically
          if (response.status === 429) {
            throw new Error('Google Sheets quota exceeded. Please try again in a few minutes.')
          }

          throw new Error(`API request failed: ${response.status} - ${errorText}`)
        }

        success = response.ok
      } else {
        const endpoint = approvalData.action === 'Approved' ? 'approve' : 'reject'
        const url = `/api/wfh/${approvalData.id}/${endpoint}`
        console.log('Making request to:', url)

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approverId: currentUser.employeeId,
            remarks: approvalRemarks.trim() || undefined
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error:', response.status, errorText)

          // Handle quota exceeded specifically
          if (response.status === 429) {
            throw new Error('Google Sheets quota exceeded. Please try again in a few minutes.')
          }

          throw new Error(`API request failed: ${response.status} - ${errorText}`)
        }

        success = response.ok
      }

      if (success) {
        // Update the local state immediately without reloading from server
        if (approvalData.type === 'leave') {
          setLeaveApplications(prev => prev.filter(app => app.id !== approvalData.id))
        } else {
          setWFHApplications(prev => prev.filter(app => app.id !== approvalData.id))
        }

        closeApprovalModal()
        // Show success message
        alert(`Application ${approvalData.action.toLowerCase()} successfully!`)
      } else {
        alert('Failed to process approval. Please try again.')
      }
    } catch (error: any) {
      console.error('Error processing approval:', error)

      // Provide more specific error messages
      if (error.message && error.message.includes('quota exceeded')) {
        alert('Google Sheets quota exceeded. Please try again in a few minutes.')
      } else if (error.message && error.message.includes('Authentication failed')) {
        alert('Authentication error. Please refresh the page and try again.')
      } else if (error.message && error.message.includes('Failed to fetch')) {
        alert('Network error. Please check your connection and try again.')
      } else if (error.message && error.message.includes('API request failed')) {
        alert(`Server error: ${error.message}. Please try again or contact support.`)
      } else {
        alert('An error occurred while processing the approval. Please try again.')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <Navbar />
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentUser) return null

  // Show access denied if user is not a manager
  if (!isManager) {
    return (
      <div>
        <Navbar />
        <div className="max-w-6xl mx-auto p-6">
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-semibold text-black mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-4">
              This page is only available to managers and team leaders.
            </p>
            <p className="text-sm text-gray-500">
              You need to have team members reporting to you to access the approvals section.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const pendingLeaves = leaveApplications.filter(app => app.status === 'Pending')
  const pendingWFHs = wfhApplications.filter(app => app.status === 'Pending')

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">Team Approvals</h1>
            <p className="text-gray-600 mt-1">
              Review and approve leave and work from home requests from your team members
              {teamMembers.length > 0 && ` (${teamMembers.length} team members)`}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={forceRefresh}
              disabled={isLoading || isLoadingLeaves || isLoadingWFH}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className={`-ml-1 mr-2 h-4 w-4 ${(isLoading || isLoadingLeaves || isLoadingWFH) ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {(isLoading || isLoadingLeaves || isLoadingWFH) ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {(hasLoadingError || error) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="text-yellow-600">⚠️</div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  {hasLoadingError ? 'Limited Data Available' : 'Error Loading Data'}
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {error || 'Some applications may not be visible due to temporary system limits. Please try refreshing the page in a few minutes.'}
                </p>
                {hasLoadingError && (
                  <button
                    onClick={forceRefresh}
                    className="mt-2 text-sm text-yellow-800 underline hover:text-yellow-900"
                  >
                    Try refreshing now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Tabs */}
      <div className="border-b border-secondary-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('leave')}
            className={`py-2 px-1 border-b-2 font-medium text-sm tab-button ${
              activeTab === 'leave'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
            }`}
          >
            Leave Applications ({pendingLeaves.length})
          </button>
          <button
            onClick={() => setActiveTab('wfh')}
            className={`py-2 px-1 border-b-2 font-medium text-sm tab-button ${
              activeTab === 'wfh'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
            }`}
          >
            WFH Applications ({pendingWFHs.length})
          </button>
        </nav>
      </div>

      {/* Leave Applications Tab */}
      {activeTab === 'leave' && (
        <div className="space-y-4">
          {isLoadingLeaves ? (
            <div className="card text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-secondary-600">Loading leave applications...</p>
            </div>
          ) : pendingLeaves.length === 0 ? (
            <div className="card text-center py-8">
              <Clock className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
              <p className="text-secondary-600">No pending leave applications</p>
            </div>
          ) : (
            pendingLeaves.map((application) => (
              <div key={application.id} className="card">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-secondary-900">{application.employeeName}</h3>
                      <span className="text-sm text-secondary-600">({application.employeeId})</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                        {application.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-secondary-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          <strong>Type:</strong> {application.leaveType}
                          {application.isHalfDay && ' (Half Day)'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          <strong>Dates:</strong> {formatDate(application.fromDate)} - {formatDate(application.toDate)}
                        </span>
                      </div>
                      {application.emergencyContact && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span><strong>Emergency Contact:</strong> {application.emergencyContact}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 p-3 bg-secondary-50 rounded-lg">
                      <p className="text-sm text-secondary-700">
                        <strong>Reason:</strong> {application.reason}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 lg:mt-0 lg:ml-6 flex space-x-2">
                    <button
                      onClick={() => openApprovalModal(application.id, 'leave', 'Approved', application.employeeName)}
                      className="btn-primary flex items-center space-x-1 text-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => openApprovalModal(application.id, 'leave', 'Rejected', application.employeeName)}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center space-x-1 text-sm"
                    >
                      <X className="h-4 w-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* WFH Applications Tab */}
      {activeTab === 'wfh' && (
        <div className="space-y-4">
          {isLoadingWFH ? (
            <div className="card text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-secondary-600">Loading WFH applications...</p>
            </div>
          ) : pendingWFHs.length === 0 ? (
            <div className="card text-center py-8">
              <Clock className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
              <p className="text-secondary-600">No pending WFH applications</p>
            </div>
          ) : (
            pendingWFHs.map((application) => (
              <div key={application.id} className="card">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-secondary-900">{application.employeeName}</h3>
                      <span className="text-sm text-secondary-600">({application.employeeId})</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                        {application.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-secondary-600">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span><strong>Type:</strong> {application.wfhType}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          <strong>Dates:</strong> {formatDate(application.fromDate)} - {formatDate(application.toDate)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span><strong>Location:</strong> {application.workLocation}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span><strong>Contact:</strong> {application.contactNumber}</span>
                      </div>
                      {application.availableFrom && application.availableTo && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            <strong>Available:</strong> {application.availableFrom} - {application.availableTo}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 p-3 bg-secondary-50 rounded-lg">
                      <p className="text-sm text-secondary-700">
                        <strong>Reason:</strong> {application.reason}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 lg:mt-0 lg:ml-6 flex space-x-2">
                    <button
                      onClick={() => openApprovalModal(application.id, 'wfh', 'Approved', application.employeeName)}
                      className="btn-primary flex items-center space-x-1 text-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => openApprovalModal(application.id, 'wfh', 'Rejected', application.employeeName)}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center space-x-1 text-sm"
                    >
                      <X className="h-4 w-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && approvalData && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            margin: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all max-h-[85vh] flex flex-col overflow-hidden"
            style={{
              margin: 0,
              position: 'relative'
            }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    approvalData.action === 'Approved'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {approvalData.action === 'Approved' ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <X className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {approvalData.action} Application
                    </h3>
                    <p className="text-sm text-gray-500">
                      {approvalData.type === 'leave' ? 'Leave' : 'Work From Home'} Request
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeApprovalModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isProcessing}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <p className="text-gray-700">
                    Are you sure you want to <span className={`font-semibold ${
                      approvalData.action === 'Approved' ? 'text-green-600' : 'text-red-600'
                    }`}>{approvalData.action.toLowerCase()}</span> the {approvalData.type} application from <span className="font-semibold text-gray-900">{approvalData.applicantName}</span>?
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <span className="flex items-center space-x-2">
                    <span>Remarks</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      approvalData.action === 'Rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {approvalData.action === 'Rejected' ? 'Required' : 'Optional'}
                    </span>
                  </span>
                </label>
                <textarea
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder={`Add your remarks for ${approvalData.action.toLowerCase()}ing this application...`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                  rows={4}
                  disabled={isProcessing}
                />
                {approvalData.action === 'Rejected' && !approvalRemarks.trim() && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="h-1 w-1 bg-red-500 rounded-full"></div>
                    <p className="text-red-600 text-sm">Remarks are required when rejecting an application</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-xl flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  onClick={closeApprovalModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={processApproval}
                  disabled={isProcessing || (approvalData.action === 'Rejected' && !approvalRemarks.trim())}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-colors flex items-center justify-center space-x-2 ${
                    approvalData.action === 'Approved'
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {approvalData.action === 'Approved' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      <span>{approvalData.action}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
