// PostgreSQL Database Configuration (Supabase)
// Server-side only - do not use 'use client'

import { Pool, PoolConfig } from 'pg'

// Configuration: Set to true to suppress database connection logs
const SUPPRESS_DB_LOGS = process.env.NEXT_PUBLIC_GRAPHQL_ERROR_ONLY === 'true' || true // Default to suppressed

// DATABASE_URL is required — never fall back to a hardcoded credential.
// Set it in apps/web/.env.local (local dev) and on Vercel (Production/Preview/Development).
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required. ' +
    'Set it in apps/web/.env.local for local development or in your hosting environment (e.g., Vercel project settings) for production.'
  )
}

if (!SUPPRESS_DB_LOGS) {
  console.log('✅ [DB] DATABASE_URL environment variable found')
}

// Database connection configuration
// IMPORTANT: Use Supabase's IPv4-compatible pooler hostname (aws-1-ap-south-1.pooler.supabase.com)
// The old hostname (db.*.supabase.co) only has IPv6, which Vercel doesn't support
export const DB_CONFIG: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Supabase requires SSL
  },
  // Connection pool settings - OPTIMIZED FOR SERVERLESS
  // CRITICAL: On Vercel serverless, each function instance creates its own pool
  // With PgBouncer on Supabase, we can use more connections safely
  max: 10, // Maximum connections per serverless instance
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 15000 // 15 seconds to establish connection
}

// Create connection pool
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    try {
      pool = new Pool(DB_CONFIG)

      // Log connection pool creation (helps debug serverless instances) - only if not suppressed
      if (!SUPPRESS_DB_LOGS) {
        const connectionString = DB_CONFIG.connectionString || ''
        const maskedConnectionString = connectionString.replace(/:[^:@]+@/, ':****@')

        console.log('🔵 [DB] New PostgreSQL connection pool created', {
          max: DB_CONFIG.max,
          idleTimeoutMillis: DB_CONFIG.idleTimeoutMillis,
          connectionTimeoutMillis: DB_CONFIG.connectionTimeoutMillis,
          connectionString: maskedConnectionString
        })
      }

      // Monitor connection pool events - only if not suppressed
      if (!SUPPRESS_DB_LOGS) {
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
      }

      // Always log errors (even in suppressed mode)
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
    if (!SUPPRESS_DB_LOGS) {
      console.log('✅ PostgreSQL database connection successful')
    }
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

