'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { User, LeaveApplication, WFHApplication } from '@/lib/types'
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, FileText, Briefcase, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react'

import Navbar from '@/components/layout/Navbar'

import { optimizedDataService } from '@/lib/optimizedDataService'

interface Application {
  id: string
  type: 'leave' | 'wfh'
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  appliedDate: string
  approvedBy?: string
  approvalDate?: string
  approvalRemarks?: string
  days: number
}

// Skeleton component for loading states
const ApplicationSkeleton = () => (
  <div className="border border-gray-200 rounded-lg p-4 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <div className="w-20 h-4 bg-gray-300 rounded"></div>
          <div className="w-24 h-4 bg-gray-300 rounded"></div>
          <div className="w-16 h-6 bg-gray-300 rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <div className="w-48 h-4 bg-gray-300 rounded"></div>
          <div className="w-32 h-4 bg-gray-300 rounded"></div>
        </div>
        <div className="w-full h-4 bg-gray-300 rounded mb-2"></div>
        <div className="w-3/4 h-4 bg-gray-300 rounded"></div>
      </div>
    </div>
  </div>
)

// Summary card skeleton
const SummaryCardSkeleton = () => (
  <div className="card animate-pulse">
    <div className="flex items-center">
      <div className="p-3 bg-gray-200 rounded-lg">
        <div className="h-6 w-6 bg-gray-300 rounded"></div>
      </div>
      <div className="ml-4">
        <div className="w-24 h-4 bg-gray-300 rounded mb-2"></div>
        <div className="w-8 h-6 bg-gray-300 rounded"></div>
      </div>
    </div>
  </div>
)

// Simple cache for applications data
const applicationsCache = new Map<string, { data: Application[], timestamp: number }>()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

export default function MyApplications() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true) // Start with loading true
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      window.location.href = '/'
      return
    }
    setCurrentUser(user)
    loadApplications(user.employeeId)
  }, [])

  // Memoized filtered applications for better performance
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesStatus = filter === 'all' || app.status === filter
      const matchesType = typeFilter === 'all' || app.type === typeFilter
      return matchesStatus && matchesType
    })
  }, [applications, filter, typeFilter])

  // Memoized summary statistics
  const summaryStats = useMemo(() => ({
    total: applications.length,
    approved: applications.filter(app => app.status === 'approved').length,
    pending: applications.filter(app => app.status === 'pending').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
  }), [applications])

  const loadApplications = useCallback(async (employeeId: string, isRefresh = false) => {
    // Check cache first (only if not refreshing)
    if (!isRefresh) {
      const cached = applicationsCache.get(employeeId)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setApplications(cached.data)
        setIsLoading(false)
        return
      }
    }

    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      // Add a small delay for better UX on fast connections (only for initial load)
      const minLoadTime = isRefresh ? Promise.resolve() : new Promise(resolve => setTimeout(resolve, 200))

      // Get leave and WFH applications with individual error handling
      const [leaveResult, wfhResult] = await Promise.allSettled([
        optimizedDataService.getLeaveApplicationsByUser(employeeId, isRefresh),
        optimizedDataService.getWFHApplicationsByUser(employeeId, isRefresh),
        minLoadTime // Ensure minimum loading time for smooth transitions
      ])

      const leaveApps = leaveResult.status === 'fulfilled' ? leaveResult.value : []
      const wfhApps = wfhResult.status === 'fulfilled' ? wfhResult.value : []

      // Transform to unified Application format
      const allApplications: Application[] = [
        ...leaveApps.map((app: LeaveApplication) => ({
          id: app.id,
          type: 'leave' as const,
          startDate: app.fromDate,
          endDate: app.toDate,
          reason: app.reason,
          status: app.status.toLowerCase() as 'pending' | 'approved' | 'rejected',
          appliedDate: app.createdAt.split('T')[0],
          approvedBy: app.approvedBy,
          approvalDate: app.approvalDate,
          approvalRemarks: app.approvalRemarks,
          days: calculateDays(app.fromDate, app.toDate)
        })),
        ...wfhApps.map((app: WFHApplication) => ({
          id: app.id,
          type: 'wfh' as const,
          startDate: app.fromDate,
          endDate: app.toDate,
          reason: app.reason,
          status: app.status.toLowerCase() as 'pending' | 'approved' | 'rejected',
          appliedDate: app.createdAt.split('T')[0],
          approvedBy: app.approvedBy,
          approvalDate: app.approvalDate,
          approvalRemarks: app.approvalRemarks,
          days: calculateDays(app.fromDate, app.toDate)
        }))
      ]

      // Sort by applied date (newest first)
      allApplications.sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime())

      setApplications(allApplications)
      setRetryCount(0) // Reset retry count on success

      // Cache the results
      applicationsCache.set(employeeId, {
        data: allApplications,
        timestamp: Date.now()
      })

      // Set error message if both API calls failed
      if (leaveResult.status === 'rejected' && wfhResult.status === 'rejected') {
        setError('Unable to load applications. Please try again later.')
      } else if (leaveResult.status === 'rejected') {
        setError('Unable to load leave applications. WFH applications loaded successfully.')
      } else if (wfhResult.status === 'rejected') {
        setError('Unable to load WFH applications. Leave applications loaded successfully.')
      }

    } catch (error) {
      console.error('Failed to load applications:', error)
      setError('Failed to load applications. Please check your connection and try again.')
      setApplications([])
      setRetryCount(prev => prev + 1)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Retry function with exponential backoff
  const retryLoad = useCallback(() => {
    if (currentUser) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000) // Max 10 seconds
      setTimeout(() => {
        loadApplications(currentUser.employeeId)
      }, delay)
    }
  }, [currentUser, retryCount, loadApplications])

  const calculateDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'leave' ? <Calendar className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">My Applications</h1>
              <p className="text-gray-600 mt-1">
                View all your leave and WFH applications with status and details
              </p>
            </div>
            <button
              onClick={() => loadApplications(currentUser.employeeId, true)}
              disabled={isLoading || isRefreshing}
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 mr-2 transition-transform duration-200 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-700">{error}</span>
              </div>
              {retryCount < 3 && (
                <button
                  onClick={retryLoad}
                  className="text-sm text-red-600 hover:text-red-800 underline transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            // Show skeleton cards while loading
            <>
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
            </>
          ) : (
            <>
              <div className="card transform transition-all duration-300 hover:scale-105">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Total Applications</p>
                    <p className="text-xl font-bold text-black transition-all duration-300">{summaryStats.total}</p>
                  </div>
                </div>
              </div>

              <div className="card transform transition-all duration-300 hover:scale-105">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Approved</p>
                    <p className="text-xl font-bold text-black transition-all duration-300">{summaryStats.approved}</p>
                  </div>
                </div>
              </div>

              <div className="card transform transition-all duration-300 hover:scale-105">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-xl font-bold text-black transition-all duration-300">{summaryStats.pending}</p>
                  </div>
                </div>
              </div>

              <div className="card transform transition-all duration-300 hover:scale-105">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Rejected</p>
                    <p className="text-xl font-bold text-black transition-all duration-300">{summaryStats.rejected}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="card mb-8 transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="status-filter" className="text-sm font-medium text-black">
                Status:
              </label>
              <select
                id="status-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="input-field w-auto transition-all duration-200 focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label htmlFor="type-filter" className="text-sm font-medium text-black">
                Type:
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input-field w-auto transition-all duration-200 focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              >
                <option value="all">All Types</option>
                <option value="leave">Leave</option>
                <option value="wfh">Work From Home</option>
              </select>
            </div>

            {!isLoading && (
              <div className="text-sm text-gray-500 ml-auto">
                Showing {filteredApplications.length} of {applications.length} applications
              </div>
            )}
          </div>
        </div>

        {/* Applications List */}
        <div className="card transition-all duration-300">
          <h3 className="text-lg font-semibold text-black mb-6">
            Applications {!isLoading && `(${filteredApplications.length})`}
          </h3>

          {isLoading ? (
            // Show skeleton applications while loading
            <div className="space-y-4">
              <ApplicationSkeleton />
              <ApplicationSkeleton />
              <ApplicationSkeleton />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-8 transition-all duration-300">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                {applications.length === 0
                  ? 'No applications submitted yet'
                  : 'No applications match the selected filters'
                }
              </p>
              {applications.length === 0 && (
                <p className="text-sm text-gray-500">
                  Submit your first leave or WFH application to see it here
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application, index) => (
                <div
                  key={application.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 opacity-0 animate-fade-in"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animationFillMode: 'forwards'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(application.type)}
                          <span className="font-mono text-sm text-primary font-medium">
                            {application.id}
                          </span>
                        </div>
                        
                        <span className="text-sm font-medium text-black capitalize">
                          {application.type === 'wfh' ? 'Work From Home' : 'Leave'}
                        </span>

                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                          {getStatusIcon(application.status)}
                          <span className="ml-1 capitalize">{application.status}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Duration:</span> {formatDate(application.startDate)} 
                          {application.startDate !== application.endDate && ` - ${formatDate(application.endDate)}`}
                          <span className="ml-2">({application.days} day{application.days > 1 ? 's' : ''})</span>
                        </div>
                        <div>
                          <span className="font-medium">Applied:</span> {formatDate(application.appliedDate)}
                        </div>
                      </div>

                      <div className="mb-3">
                        <span className="font-medium text-black">Reason:</span>
                        <p className="text-gray-700 mt-1">{application.reason}</p>
                      </div>

                      {application.status === 'approved' && application.approvedBy && (
                        <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                          <span className="font-medium">Approved by:</span> {application.approvedBy} on {formatDate(application.approvalDate!)}
                          {application.approvalRemarks && (
                            <>
                              <br />
                              <span className="font-medium">Remarks:</span> {application.approvalRemarks}
                            </>
                          )}
                        </div>
                      )}

                      {application.status === 'rejected' && application.approvedBy && (
                        <div className="text-sm text-red-700 bg-red-50 p-2 rounded">
                          <span className="font-medium">Rejected by:</span> {application.approvedBy} on {formatDate(application.approvalDate!)}

                          {application.approvalRemarks && (
                            <>
                              <br />
                              <span className="font-medium">Reason:</span> {application.approvalRemarks}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
