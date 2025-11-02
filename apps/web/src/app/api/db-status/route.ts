import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db/config'

/**
 * Database Connection Pool Status Endpoint
 * 
 * GET /api/db-status
 * 
 * Returns current connection pool statistics to help monitor
 * and diagnose connection issues.
 * 
 * IMPORTANT: This endpoint should be protected in production
 * or removed entirely. It exposes internal database metrics.
 */
export async function GET() {
  try {
    const pool = getPool()
    
    // Get pool statistics
    // Note: These are internal properties and may change in future mysql2 versions
    const poolStats = {
      // Connection pool configuration
      config: {
        connectionLimit: (pool as any).config?.connectionLimit || 'unknown',
        queueLimit: (pool as any).config?.queueLimit || 'unknown',
        maxIdle: (pool as any).config?.maxIdle || 'unknown',
        idleTimeout: (pool as any).config?.idleTimeout || 'unknown',
        connectTimeout: (pool as any).config?.connectTimeout || 'unknown',
        acquireTimeout: (pool as any).config?.acquireTimeout || 'unknown'
      },
      
      // Current pool state
      state: {
        allConnections: (pool as any)._allConnections?.length || 0,
        freeConnections: (pool as any)._freeConnections?.length || 0,
        activeConnections: ((pool as any)._allConnections?.length || 0) - ((pool as any)._freeConnections?.length || 0),
        queueLength: (pool as any)._connectionQueue?.length || 0
      },
      
      // Health indicators
      health: {
        status: 'healthy',
        warnings: [] as string[]
      },
      
      timestamp: new Date().toISOString()
    }
    
    // Add warnings based on pool state
    const utilizationPercent = (poolStats.state.activeConnections / poolStats.config.connectionLimit) * 100
    
    if (utilizationPercent > 80) {
      poolStats.health.status = 'warning'
      poolStats.health.warnings.push(`High connection utilization: ${utilizationPercent.toFixed(1)}%`)
    }
    
    if (poolStats.state.queueLength > 0) {
      poolStats.health.status = 'warning'
      poolStats.health.warnings.push(`${poolStats.state.queueLength} connection requests queued`)
    }
    
    if (poolStats.state.activeConnections >= poolStats.config.connectionLimit) {
      poolStats.health.status = 'critical'
      poolStats.health.warnings.push('Connection pool exhausted!')
    }
    
    // Test connection
    try {
      const connection = await pool.getConnection()
      await connection.ping()
      connection.release()
      poolStats.health.warnings.push('Database ping successful')
    } catch (error) {
      poolStats.health.status = 'critical'
      poolStats.health.warnings.push(`Database ping failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return NextResponse.json({
      success: true,
      data: poolStats
    })
  } catch (error) {
    console.error('Failed to get database status:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get database status',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

