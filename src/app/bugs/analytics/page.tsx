'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { Bug } from '@/lib/types'
import { getAllBugs, getBugStatistics, getAverageResolutionTime } from '@/lib/bugService'
import { getCurrentUser } from '@/lib/auth'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Users,
  Calendar,
  Target
} from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function BugAnalyticsPage() {
  const [bugs, setBugs] = useState<Bug[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [averageResolutionTime, setAverageResolutionTime] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const router = useRouter()
  const currentUser = getCurrentUser()

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const loadAnalyticsData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [bugsData, stats, avgTime] = await Promise.all([
        getAllBugs(),
        getBugStatistics(),
        getAverageResolutionTime()
      ])

      setBugs(bugsData)
      setStatistics(stats)
      setAverageResolutionTime(avgTime)
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    if (!currentUser) {
      router.push('/')
      return
    }

    // Admin users have full access to bug analytics

    if (initialized) return // Prevent multiple executions

    loadAnalyticsData()
    setInitialized(true)
  }, [currentUser, router, isHydrated, initialized, loadAnalyticsData])

  const getRecentBugs = () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    return bugs.filter(bug => new Date(bug.createdAt) >= thirtyDaysAgo)
  }

  const getTopAssignees = () => {
    const assigneeCounts: Record<string, number> = {}
    
    bugs.forEach(bug => {
      if (bug.assignedTo) {
        assigneeCounts[bug.assignedTo] = (assigneeCounts[bug.assignedTo] || 0) + 1
      }
    })

    return Object.entries(assigneeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([assignee, count]) => ({ assignee, count }))
  }

  const getResolutionRate = () => {
    if (bugs.length === 0) return 0
    const resolvedBugs = bugs.filter(bug => bug.status === 'Resolved' || bug.status === 'Closed')
    return Math.round((resolvedBugs.length / bugs.length) * 100)
  }

  // Show loading state to prevent flickering
  if (!isHydrated || !currentUser || !initialized) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div>
                  <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
              </div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>

            {/* Statistics Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>

            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div>
        <Navbar />
        <LoadingSpinner size="lg" message="Loading analytics..." center />
      </div>
    )
  }

  const recentBugs = getRecentBugs()
  const topAssignees = getTopAssignees()
  const resolutionRate = getResolutionRate()

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-black flex items-center space-x-2">
            <BarChart3 className="h-6 w-6" />
            <span>Bug Analytics</span>
          </h1>
          <p className="text-gray-600 mt-1">Insights and statistics about bug reports</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bugs</p>
                <p className="text-2xl font-bold text-black">{statistics?.total || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                <p className="text-2xl font-bold text-green-600">{resolutionRate}%</p>
              </div>
              <Target className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold text-blue-600">{averageResolutionTime}d</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last 30 Days</p>
                <p className="text-2xl font-bold text-purple-600">{recentBugs.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
            <div className="space-y-3">
              {statistics && Object.entries(statistics.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {status === 'Resolved' || status === 'Closed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm font-medium">{status}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{count as number}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${((count as number) / statistics.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Severity Distribution */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Severity Distribution</h3>
            <div className="space-y-3">
              {statistics && Object.entries(statistics.bySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      severity === 'Critical' ? 'text-red-500' :
                      severity === 'Major' ? 'text-orange-500' : 'text-yellow-500'
                    }`} />
                    <span className="text-sm font-medium">{severity}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{count as number}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          severity === 'Critical' ? 'bg-red-600' :
                          severity === 'Major' ? 'bg-orange-600' : 'bg-yellow-600'
                        }`}
                        style={{ width: `${((count as number) / statistics.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Distribution */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Platform Distribution</h3>
            <div className="space-y-3">
              {statistics && Object.entries(statistics.byPlatform).map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{platform}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{count as number}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${((count as number) / statistics.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Assignees */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Top Assignees</h3>
            <div className="space-y-3">
              {topAssignees.length > 0 ? (
                topAssignees.map(({ assignee, count }, index) => (
                  <div key={assignee} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">{assignee}</span>
                    </div>
                    <span className="text-sm text-gray-600">{count} bugs</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No assigned bugs yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Bugs (Last 30 Days)</h3>
          {recentBugs.length > 0 ? (
            <div className="space-y-3">
              {recentBugs.slice(0, 10).map((bug) => (
                <div key={bug.bugId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs bg-white px-2 py-1 rounded">
                      {bug.bugId}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bug.severity === 'Critical' ? 'text-red-600 bg-red-100' :
                      bug.severity === 'Major' ? 'text-orange-600 bg-orange-100' :
                      'text-yellow-600 bg-yellow-100'
                    }`}>
                      {bug.severity}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {bug.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{new Date(bug.createdAt).toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded-full ${
                      bug.status === 'New' ? 'text-blue-600 bg-blue-100' :
                      bug.status === 'In Progress' ? 'text-yellow-600 bg-yellow-100' :
                      bug.status === 'Resolved' ? 'text-green-600 bg-green-100' :
                      'text-gray-600 bg-gray-100'
                    }`}>
                      {bug.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No bugs reported in the last 30 days</p>
          )}
        </div>
      </div>
    </>
  )
}
