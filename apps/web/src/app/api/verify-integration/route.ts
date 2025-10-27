import { NextRequest, NextResponse } from 'next/server'
import { testConnection } from '@/lib/sheets/auth'
import { SHEETS_CONFIG } from '@/lib/sheets/config'

/**
 * Comprehensive verification endpoint for Google Sheets integration
 * Tests all aspects of the integration to ensure it's working correctly
 */
export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || 'development',
    tests: {} as any,
    summary: {
      passed: 0,
      failed: 0,
      total: 0
    }
  }

  // Test 1: Environment Variables
  try {
    const envVars = {
      GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_PRIVATE_KEY_ID: process.env.GOOGLE_PRIVATE_KEY_ID,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_CLIENT_CERT_URL: process.env.GOOGLE_CLIENT_CERT_URL
    }

    const missingVars = Object.entries(envVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    const privateKeyValid = envVars.GOOGLE_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY') && 
                           envVars.GOOGLE_PRIVATE_KEY?.includes('END PRIVATE KEY')

    results.tests.environmentVariables = {
      passed: missingVars.length === 0 && privateKeyValid,
      details: {
        missingVariables: missingVars,
        privateKeyValid,
        privateKeyLength: envVars.GOOGLE_PRIVATE_KEY?.length || 0,
        allVariablesPresent: missingVars.length === 0
      }
    }
  } catch (error) {
    results.tests.environmentVariables = {
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Test 2: Google Sheets Connection
  try {
    const connectionTest = await testConnection(SHEETS_CONFIG.SPREADSHEET_ID)
    results.tests.googleSheetsConnection = {
      passed: connectionTest.success,
      details: connectionTest
    }
  } catch (error) {
    results.tests.googleSheetsConnection = {
      passed: false,
      error: error instanceof Error ? error.message : 'Connection test failed'
    }
  }

  // Test 3: Sheets Configuration
  try {
    results.tests.sheetsConfiguration = {
      passed: true,
      details: {
        spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
        sheets: SHEETS_CONFIG.SHEETS,
        ranges: SHEETS_CONFIG.RANGES
      }
    }
  } catch (error) {
    results.tests.sheetsConfiguration = {
      passed: false,
      error: error instanceof Error ? error.message : 'Configuration error'
    }
  }

  // Test 4: Authentication Module
  try {
    const { initializeAuth, isSheetsAvailable } = await import('@/lib/sheets/auth')
    const authAvailable = isSheetsAvailable()
    
    results.tests.authenticationModule = {
      passed: authAvailable,
      details: {
        sheetsAvailable: authAvailable,
        serverSide: typeof window === 'undefined'
      }
    }
  } catch (error) {
    results.tests.authenticationModule = {
      passed: false,
      error: error instanceof Error ? error.message : 'Auth module error'
    }
  }

  // Calculate summary
  const testResults = Object.values(results.tests)
  results.summary.total = testResults.length
  results.summary.passed = testResults.filter((test: any) => test.passed).length
  results.summary.failed = results.summary.total - results.summary.passed

  // Overall status
  const allPassed = results.summary.failed === 0
  const status = allPassed ? 'SUCCESS' : 'FAILED'

  // Recommendations
  const recommendations = []
  if (!results.tests.environmentVariables?.passed) {
    recommendations.push('Set all required environment variables in Vercel Dashboard')
  }
  if (!results.tests.googleSheetsConnection?.passed) {
    recommendations.push('Check Google Sheets permissions and service account access')
  }
  if (!results.tests.authenticationModule?.passed) {
    recommendations.push('Verify authentication module configuration')
  }

  return NextResponse.json({
    status,
    success: allPassed,
    message: allPassed 
      ? '✅ All Google Sheets integration tests passed!' 
      : `❌ ${results.summary.failed} test(s) failed`,
    ...results,
    recommendations: recommendations.length > 0 ? recommendations : ['All tests passed! Google Sheets integration is working correctly.']
  }, { 
    status: allPassed ? 200 : 500 
  })
}
