'use client'

import { useState, useEffect } from 'react'
import { MetricsSummary } from '@/lib/metrics'

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [timeWindow, setTimeWindow] = useState(60)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchMetrics = async () => {
    try {
      const [metricsRes, cacheRes] = await Promise.all([
        fetch(`/api/metrics?timeWindow=${timeWindow}`),
        fetch('/api/cache/stats')
      ])

      if (metricsRes.ok) {
        const data = await metricsRes.json()
        setMetrics(data.data)
      }

      if (cacheRes.ok) {
        const data = await cacheRes.json()
        setCacheStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [timeWindow])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchMetrics()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, timeWindow])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Loading metrics...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">API Performance Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring of API performance and caching</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Time Window:</label>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value={5}>Last 5 minutes</option>
              <option value={15}>Last 15 minutes</option>
              <option value={30}>Last 30 minutes</option>
              <option value={60}>Last hour</option>
              <option value={180}>Last 3 hours</option>
              <option value={1440}>Last 24 hours</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Auto-refresh (5s)</span>
            </label>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <MetricCard
            title="Total Requests"
            value={metrics?.totalRequests || 0}
            icon="📊"
            color="blue"
          />
          <MetricCard
            title="Avg Response Time"
            value={`${metrics?.avgResponseTime || 0}ms`}
            icon="⚡"
            color="green"
          />
          <MetricCard
            title="Cache Hit Rate"
            value={`${metrics?.cacheHitRate || 0}%`}
            icon="💾"
            color="purple"
          />
          <MetricCard
            title="Error Rate"
            value={`${metrics?.errorRate || 0}%`}
            icon="⚠️"
            color={metrics && metrics.errorRate > 5 ? 'red' : 'gray'}
          />
        </div>

        {/* Cache Statistics */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cache Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Cache Type</div>
              <div className="text-lg font-semibold capitalize">{cacheStats?.cache?.type || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Cache Size</div>
              <div className="text-lg font-semibold">{cacheStats?.cache?.size || 0} keys</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Redis Status</div>
              <div className={`text-lg font-semibold ${cacheStats?.redis?.isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
                {cacheStats?.redis?.isAvailable ? '✓ Connected' : '○ Not Connected'}
              </div>
            </div>
          </div>
        </div>

        {/* Requests by Endpoint */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Requests by Endpoint</h2>
          <div className="space-y-3">
            {metrics && Object.entries(metrics.requestsByEndpoint)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 10)
              .map(([endpoint, count]) => (
                <div key={endpoint} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{endpoint}</div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span>Avg: {Math.round(metrics.avgResponseTimeByEndpoint[endpoint] || 0)}ms</span>
                      {metrics.errorsByEndpoint[endpoint] && (
                        <span className="text-red-600">Errors: {metrics.errorsByEndpoint[endpoint]}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-semibold text-gray-700">{count} requests</div>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / (metrics.totalRequests || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Requests */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Requests</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Response Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cache</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metrics?.recentRequests.slice().reverse().map((req, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {new Date(req.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{req.endpoint}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{req.method}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        req.statusCode < 300 ? 'bg-green-100 text-green-800' :
                        req.statusCode < 400 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {req.statusCode}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{req.responseTime}ms</td>
                    <td className="px-4 py-2 text-sm">
                      {req.cacheHit ? (
                        <span className="text-green-600">✓ Hit</span>
                      ) : (
                        <span className="text-gray-400">○ Miss</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-600">{title}</div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className={`text-3xl font-bold ${colorClasses[color as keyof typeof colorClasses]}`}>
        {value}
      </div>
    </div>
  )
}

