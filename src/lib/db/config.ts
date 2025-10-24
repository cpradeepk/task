// MySQL Database Configuration
// Server-side only - do not use 'use client'

import mysql from 'mysql2/promise'

// Database connection configuration
export const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'u806435594_swarg',
  password: process.env.MYSQL_PASSWORD || 'W8zTtc>qL3?',
  database: process.env.MYSQL_DATABASE || 'task',
  ssl: {
    rejectUnauthorized: false // AWS RDS requires SSL
  },
  // Connection pool settings
  waitForConnections: true,
  connectionLimit: 20, // Increased from 10 to handle more concurrent requests
  queueLimit: 0, // Unlimited queue

  // Timeout settings to prevent hanging (mysql2 valid options)
  connectTimeout: 10000, // 10 seconds to establish connection

  // Keep-alive settings
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
}

// Create connection pool
let pool: mysql.Pool | null = null

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG)
  }
  return pool
}

// Get a connection from the pool
export async function getConnection(): Promise<mysql.PoolConnection> {
  const pool = getPool()
  return await pool.getConnection()
}

// Execute a query with automatic connection management
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T> {
  const pool = getPool()
  const [rows] = await pool.execute(sql, params)
  return rows as T
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
    const connection = await pool.getConnection()
    await connection.ping()
    connection.release()
    console.log('✅ MySQL database connection successful')
    return true
  } catch (error) {
    console.error('❌ MySQL database connection failed:', error)
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

