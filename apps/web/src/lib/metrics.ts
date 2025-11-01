/**
 * API Performance Metrics Tracking
 * Tracks API calls, response times, cache hits/misses, and errors
 */

import { redisCache } from './redis'

export interface APIMetric {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  cacheHit: boolean
  timestamp: number
  error?: string
}

export interface MetricsSummary {
  totalRequests: number
  avgResponseTime: number
  cacheHitRate: number
  errorRate: number
  requestsByEndpoint: Record<string, number>
  avgResponseTimeByEndpoint: Record<string, number>
  errorsByEndpoint: Record<string, number>
  recentRequests: APIMetric[]
}

class MetricsCollector {
  private metrics: APIMetric[] = []
  private maxMetrics = 1000 // Keep last 1000 metrics in memory
  private metricsKey = 'api:metrics'

  /**
   * Record an API call metric
   */
  async record(metric: APIMetric): Promise<void> {
    // Add to in-memory array
    this.metrics.push(metric)
    
    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Also store in Redis for persistence (if available)
    try {
      await redisCache.increment(`api:count:${metric.endpoint}:${metric.method}`)
      await redisCache.increment(`api:total_requests`)
      
      if (metric.cacheHit) {
        await redisCache.increment(`api:cache_hits`)
      } else {
        await redisCache.increment(`api:cache_misses`)
      }
      
      if (metric.statusCode >= 400) {
        await redisCache.increment(`api:errors`)
        await redisCache.increment(`api:errors:${metric.endpoint}`)
      }
    } catch (error) {
      // Silently fail if Redis is unavailable
      console.error('Failed to record metric to Redis:', error)
    }
  }

  /**
   * Get metrics summary
   */
  getSummary(timeWindowMinutes: number = 60): MetricsSummary {
    const now = Date.now()
    const windowStart = now - (timeWindowMinutes * 60 * 1000)
    
    // Filter metrics within time window
    const recentMetrics = this.metrics.filter(m => m.timestamp >= windowStart)
    
    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        requestsByEndpoint: {},
        avgResponseTimeByEndpoint: {},
        errorsByEndpoint: {},
        recentRequests: []
      }
    }

    // Calculate summary statistics
    const totalRequests = recentMetrics.length
    const totalResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0)
    const avgResponseTime = totalResponseTime / totalRequests
    
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length
    const cacheHitRate = (cacheHits / totalRequests) * 100
    
    const errors = recentMetrics.filter(m => m.statusCode >= 400).length
    const errorRate = (errors / totalRequests) * 100

    // Group by endpoint
    const requestsByEndpoint: Record<string, number> = {}
    const responseTimesByEndpoint: Record<string, number[]> = {}
    const errorsByEndpoint: Record<string, number> = {}

    recentMetrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`
      requestsByEndpoint[key] = (requestsByEndpoint[key] || 0) + 1
      
      if (!responseTimesByEndpoint[key]) {
        responseTimesByEndpoint[key] = []
      }
      responseTimesByEndpoint[key].push(m.responseTime)
      
      if (m.statusCode >= 400) {
        errorsByEndpoint[key] = (errorsByEndpoint[key] || 0) + 1
      }
    })

    // Calculate average response time by endpoint
    const avgResponseTimeByEndpoint: Record<string, number> = {}
    Object.keys(responseTimesByEndpoint).forEach(key => {
      const times = responseTimesByEndpoint[key]
      avgResponseTimeByEndpoint[key] = times.reduce((sum, t) => sum + t, 0) / times.length
    })

    return {
      totalRequests,
      avgResponseTime: Math.round(avgResponseTime),
      cacheHitRate: Math.round(cacheHitRate * 10) / 10,
      errorRate: Math.round(errorRate * 10) / 10,
      requestsByEndpoint,
      avgResponseTimeByEndpoint,
      errorsByEndpoint,
      recentRequests: recentMetrics.slice(-50) // Last 50 requests
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): APIMetric[] {
    return this.metrics
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector()

/**
 * Middleware helper to track API performance
 */
export function trackAPICall(
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  cacheHit: boolean = false,
  error?: string
): void {
  metricsCollector.record({
    endpoint,
    method,
    statusCode,
    responseTime,
    cacheHit,
    timestamp: Date.now(),
    error
  }).catch(err => {
    console.error('Failed to track API call:', err)
  })
}

