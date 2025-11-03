// PostgreSQL Database Configuration (Supabase)
// Server-side only - do not use 'use client'

import { Pool, PoolConfig } from 'pg'

// Log environment variable status for debugging
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ [DB] DATABASE_URL environment variable not set, using fallback connection string')
  console.warn('⚠️ [DB] This may cause connection issues on Vercel. Please set DATABASE_URL in Vercel environment variables.')
} else {
  console.log('✅ [DB] DATABASE_URL environment variable found')
}

// Database connection configuration
export const DB_CONFIG: PoolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:W8zTtc%3EqL3%3F@db.rbckjkdohzbclomrufrx.supabase.co:6543/postgres?pgbouncer=true',
  ssl: {
    rejectUnauthorized: false // Supabase requires SSL
  },
  // Connection pool settings - OPTIMIZED FOR SERVERLESS
  // CRITICAL: On Vercel serverless, each function instance creates its own pool
  // With PgBouncer on Supabase, we can use more connections safely
  max: 3, // Maximum connections per serverless instance (was connectionLimit in mysql2)
  idleTimeoutMillis: 10000, // Close idle connections after 10 seconds
  connectionTimeoutMillis: 5000 // 5 seconds to establish connection
}

// Create connection pool
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    try {
      pool = new Pool(DB_CONFIG)

      // Log connection pool creation (helps debug serverless instances)
      const connectionString = DB_CONFIG.connectionString || ''
      const maskedConnectionString = connectionString.replace(/:[^:@]+@/, ':****@')

      console.log('🔵 [DB] New PostgreSQL connection pool created', {
        max: DB_CONFIG.max,
        idleTimeoutMillis: DB_CONFIG.idleTimeoutMillis,
        connectionTimeoutMillis: DB_CONFIG.connectionTimeoutMillis,
        connectionString: maskedConnectionString,
        usingEnvVar: !!process.env.DATABASE_URL
      })

      // Monitor connection pool events
      pool.on('connect', (client) => {
        console.log('🔵 [DB] New client connected to pool', {
          totalCount: (pool as any).totalCount || 0,
          idleCount: (pool as any).idleCount || 0
        })
      })

      pool.on('acquire', (client) => {
        console.log('🔵 [DB] Client acquired from pool', {
          totalCount: (pool as any).totalCount || 0,
          idleCount: (pool as any).idleCount || 0
        })
      })

      pool.on('remove', (client) => {
        console.log('🔴 [DB] Client removed from pool', {
          totalCount: (pool as any).totalCount || 0,
          idleCount: (pool as any).idleCount || 0
        })
      })

      pool.on('error', (err, client) => {
        console.error('❌ [DB] Unexpected error on idle client', err)
        console.error('❌ [DB] Error details:', {
          message: err.message,
          code: (err as any).code,
          errno: (err as any).errno,
          syscall: (err as any).syscall,
          hostname: (err as any).hostname
        })
      })
    } catch (error) {
      console.error('❌ [DB] Failed to create connection pool:', error)
      throw error
    }
  }
  return pool
}

// Execute a query with automatic connection management
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T> {
  const pool = getPool()
  const result = params && params.length > 0
    ? await pool.query(sql, params)
    : await pool.query(sql)
  return result.rows as T
}

// Execute a query and return the first row
export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T[]>(sql, params)
  return rows.length > 0 ? rows[0] : null
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool()
    await pool.query('SELECT 1')
    console.log('✅ PostgreSQL database connection successful')
    return true
  } catch (error) {
    console.error('❌ PostgreSQL database connection failed:', error)
    return false
  }
}

// Close the connection pool
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// Retry configuration for database operations
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2
}

// Helper function to retry database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = RETRY_CONFIG.maxRetries
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // Don't retry on timeout errors - fail fast
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Database operation timed out. Please try again.')
    }

    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay))
      return withRetry(operation, retries - 1)
    }
    throw error
  }
}

// Helper function to add timeout to any async operation
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number = 15000, // 15 seconds default
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ])
}

