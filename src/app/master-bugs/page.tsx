/**
 * Master Bugs Page - Admin and Top Management view of all bugs
 * Shows all bugs across the organization with comprehensive filtering
 */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { Bug, User } from '@/lib/types'
import { getCurrentUser, getAllUsers } from '@/lib/auth'
import { getAllBugs } from '@/lib/bugService'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  Bug as BugIcon,
  Search,
  Filter,
  Calendar,
  User as UserIcon,
  AlertCircle,
  RefreshCw,
  Eye,
  AlertTriangle
} from 'lucide-react'

export default function MasterBugsPage() {
  const [bugs, setBugs] = useState<Bug[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [reporterFilter, setReporterFilter] = useState('all')

  const router = useRouter()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    if (initialized) return // Prevent multiple executions

    const currentUser = getCurrentUser()

    if (!currentUser) {
      router.push('/')
      return
    }

    // Only Admin and Top Management can access
    if (currentUser.role !== 'admin' && currentUser.role !== 'top_management') {
      router.push('/dashboard')
      return
    }

    loadData()
    setInitialized(true)
  }, [isHydrated, initialized, router])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Fetch all bugs via API
      const bugsResponse = await fetch('/api/bugs')
      if (!bugsResponse.ok) {
        throw new Error('Failed to fetch bugs')
      }
      const bugsData = await bugsResponse.json()

      // Fetch all users
      const allUsers = await getAllUsers()

      setBugs(bugsData.data || [])
      setUsers(allUsers.filter(u => u.status === 'active'))
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get unique categories
  const categories = useMemo(() => {
    const categorySet = new Set(bugs.map(b => b.category).filter(Boolean))
    return Array.from(categorySet)
  }, [bugs])

  // Filter bugs
  const filteredBugs = useMemo(() => {
    let filtered = bugs

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(bug =>
        bug.bugId.toLowerCase().includes(searchLower) ||
        bug.title.toLowerCase().includes(searchLower) ||
        bug.description.toLowerCase().includes(searchLower) ||
        (bug.assignedTo && bug.assignedTo.toLowerCase().includes(searchLower)) ||
        bug.reportedBy.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(bug => bug.status === statusFilter)
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(bug => bug.severity === severityFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(bug => bug.category === categoryFilter)
    }

    // Assignee filter
    if (assigneeFilter !== 'all') {
      filtered = filtered.filter(bug => bug.assignedTo && bug.assignedTo === assigneeFilter)
    }

    // Reporter filter
    if (reporterFilter !== 'all') {
      filtered = filtered.filter(bug => bug.reportedBy === reporterFilter)
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [bugs, searchTerm, statusFilter, severityFilter, categoryFilter, assigneeFilter, reporterFilter])

  // Calculate statistics
  const statistics = useMemo(() => {
    return {
      total: bugs.length,
      new: bugs.filter(b => b.status === 'New').length,
      inProgress: bugs.filter(b => b.status === 'In Progress').length,
      resolved: bugs.filter(b => b.status === 'Resolved').length,
      closed: bugs.filter(b => b.status === 'Closed').length,
      critical: bugs.filter(b => b.severity === 'Critical').length,
      major: bugs.filter(b => b.severity === 'Major').length,
      minor: bugs.filter(b => b.severity === 'Minor').length
    }
  }, [bugs])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-yellow-100 text-yellow-800'
      case 'In Progress': return 'bg-blue-100 text-blue-800'
      case 'Resolved': return 'bg-green-100 text-green-800'
      case 'Closed': return 'bg-gray-100 text-gray-800'
      case 'Reopened': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800'
      case 'Major': return 'bg-orange-100 text-orange-800'
      case 'Minor': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const currentUser = getCurrentUser()

  if (!isHydrated || !currentUser) {
    return null
  }

  if (currentUser.role !== 'admin' && currentUser.role !== 'top_management') {
    return (
      <div>
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-black mb-4">Access Denied</h1>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <BugIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Master Bugs View</h1>
              <p className="text-gray-600 mt-1">All bugs across the organization</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-6 sm:mt-0">
            <button
              onClick={loadData}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Total Bugs</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">New</p>
            <p className="text-2xl font-bold text-yellow-600">{statistics.new}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{statistics.inProgress}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Resolved</p>
            <p className="text-2xl font-bold text-green-600">{statistics.resolved}</p>
          </div>
        </div>

        {/* Severity Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-gray-600">Critical</p>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">{statistics.critical}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <p className="text-sm text-gray-600">Major</p>
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-2">{statistics.major}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-gray-600">Minor</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">{statistics.minor}</p>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Loading bugs..." center />
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Filter className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="md:col-span-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by bug ID, title, description, assignee, or reporter..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Statuses</option>
                    <option value="New">New</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                    <option value="Reopened">Reopened</option>
                  </select>
                </div>

                {/* Severity Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="Major">Major</option>
                    <option value="Minor">Minor</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignee Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignee</label>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Assignees</option>
                    {users.map(user => (
                      <option key={user.employeeId} value={user.employeeId}>
                        {user.name} ({user.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reporter Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reporter</label>
                  <select
                    value={reporterFilter}
                    onChange={(e) => setReporterFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Reporters</option>
                    {users.map(user => (
                      <option key={user.employeeId} value={user.employeeId}>
                        {user.name} ({user.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setSeverityFilter('all')
                    setCategoryFilter('all')
                    setAssigneeFilter('all')
                    setReporterFilter('all')
                  }}
                  className="btn-secondary"
                >
                  Clear All Filters
                </button>
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200">
                Showing <span className="font-semibold text-gray-900">{filteredBugs.length}</span> of <span className="font-semibold text-gray-900">{bugs.length}</span> bugs
              </div>
            </div>

            {/* Bugs List */}
            {filteredBugs.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bugs found</h3>
                <p className="text-gray-600">
                  {bugs.length === 0 ? 'No bugs in the system yet.' : 'Try adjusting your filters.'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bug ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Severity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assignee
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reporter
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBugs.map((bug) => {
                        const assignee = users.find(u => u.employeeId === bug.assignedTo)
                        const reporter = users.find(u => u.employeeId === bug.reportedBy)

                        return (
                          <tr key={bug.bugId} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                {bug.bugId}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-900 max-w-md truncate" title={bug.title}>
                                {bug.title}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(bug.severity)}`}>
                                {bug.severity}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bug.status)}`}>
                                {bug.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{bug.category}</span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <UserIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {assignee?.name || bug.assignedTo}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <UserIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {reporter?.name || bug.reportedBy}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {new Date(bug.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <button
                                onClick={() => router.push(`/bugs/${bug.bugId}`)}
                                className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="text-sm">View</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

