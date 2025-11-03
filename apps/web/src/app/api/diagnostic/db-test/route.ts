/**
 * Database Connection Diagnostic API
 * 
 * This endpoint tests the database connection and provides diagnostic information.
 * Access: /api/diagnostic/db-test
 */

import { NextResponse } from 'next/server'
import { getPool, testConnection } from '@/lib/db/config'
import dns from 'dns'
import { promisify } from 'util'

const resolve4 = promisify(dns.resolve4)
const resolve6 = promisify(dns.resolve6)

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    region: process.env.VERCEL_REGION || 'unknown',
    tests: {}
  }

  try {
    // Test 1: Check environment variable
    diagnostics.tests.environmentVariable = {
      name: 'DATABASE_URL Environment Variable',
      status: !!process.env.DATABASE_URL ? 'PASS' : 'FAIL',
      value: process.env.DATABASE_URL 
        ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')
        : 'NOT SET',
      usingFallback: !process.env.DATABASE_URL
    }

    // Test 2: Extract hostname from connection string
    const connectionString = process.env.DATABASE_URL || ''
    const hostnameMatch = connectionString.match(/@([^:]+):/)
    const hostname = hostnameMatch ? hostnameMatch[1] : 'unknown'
    
    diagnostics.hostname = hostname

    // Test 3: DNS Resolution (IPv4)
    try {
      const ipv4Addresses = await resolve4(hostname)
      diagnostics.tests.dnsIPv4 = {
        name: 'DNS Resolution (IPv4)',
        status: 'PASS',
        addresses: ipv4Addresses
      }
    } catch (error: any) {
      diagnostics.tests.dnsIPv4 = {
        name: 'DNS Resolution (IPv4)',
        status: 'FAIL',
        error: error.message,
        code: error.code
      }
    }

    // Test 4: DNS Resolution (IPv6)
    try {
      const ipv6Addresses = await resolve6(hostname)
      diagnostics.tests.dnsIPv6 = {
        name: 'DNS Resolution (IPv6)',
        status: 'PASS',
        addresses: ipv6Addresses
      }
    } catch (error: any) {
      diagnostics.tests.dnsIPv6 = {
        name: 'DNS Resolution (IPv6)',
        status: 'FAIL',
        error: error.message,
        code: error.code
      }
    }

    // Test 5: Database Connection
    try {
      const pool = getPool()
      const result = await pool.query('SELECT version(), current_database(), current_user')
      
      diagnostics.tests.databaseConnection = {
        name: 'Database Connection',
        status: 'PASS',
        version: result.rows[0].version.split(' ').slice(0, 2).join(' '),
        database: result.rows[0].current_database,
        user: result.rows[0].current_user
      }
    } catch (error: any) {
      diagnostics.tests.databaseConnection = {
        name: 'Database Connection',
        status: 'FAIL',
        error: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall
      }
    }

    // Test 6: Simple Query
    try {
      const pool = getPool()
      const result = await pool.query('SELECT 1 as test')
      
      diagnostics.tests.simpleQuery = {
        name: 'Simple Query Test',
        status: result.rows[0].test === 1 ? 'PASS' : 'FAIL',
        result: result.rows[0]
      }
    } catch (error: any) {
      diagnostics.tests.simpleQuery = {
        name: 'Simple Query Test',
        status: 'FAIL',
        error: error.message
      }
    }

    // Overall status
    const allTests = Object.values(diagnostics.tests)
    const passedTests = allTests.filter((test: any) => test.status === 'PASS').length
    const totalTests = allTests.length
    
    diagnostics.summary = {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      overallStatus: passedTests === totalTests ? 'HEALTHY' : 'UNHEALTHY'
    }

    return NextResponse.json(diagnostics, { status: 200 })

  } catch (error: any) {
    diagnostics.criticalError = {
      message: error.message,
      stack: error.stack
    }
    
    return NextResponse.json(diagnostics, { status: 500 })
  }
}

