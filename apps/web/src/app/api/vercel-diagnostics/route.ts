import { NextResponse } from 'next/server'
import { ABSOLUTE_PRODUCTION_SHEET_ID } from '@/lib/constants/production'

export async function GET() {
  try {
    console.log('🔍 VERCEL DIAGNOSTICS: Starting comprehensive check...')
    
    // Environment detection
    const isVercel = !!(
      process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.VERCEL_URL
    )
    
    // Environment variables check
    const envVars = {
      GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
      GOOGLE_PRIVATE_KEY_ID: process.env.GOOGLE_PRIVATE_KEY_ID,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? '[PRESENT]' : '[MISSING]',
      GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_CERT_URL: process.env.GOOGLE_CLIENT_CERT_URL
    }
    
    // Check for presence of each variable
    const envStatus = {
      GOOGLE_PROJECT_ID: !!process.env.GOOGLE_PROJECT_ID,
      GOOGLE_PRIVATE_KEY_ID: !!process.env.GOOGLE_PRIVATE_KEY_ID,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_CERT_URL: !!process.env.GOOGLE_CLIENT_CERT_URL
    }
    
    // Count present variables
    const presentCount = Object.values(envStatus).filter(Boolean).length
    const totalCount = Object.keys(envStatus).length
    
    // Check for dangerous environment variables
    const dangerousVars = [
      'SPREADSHEET_ID',
      'GOOGLE_SPREADSHEET_ID', 
      'SHEET_ID',
      'GOOGLE_SHEET_ID',
      'SHEETS_ID'
    ]
    
    const foundDangerousVars: Record<string, string> = {}
    dangerousVars.forEach(varName => {
      if (process.env[varName]) {
        foundDangerousVars[varName] = process.env[varName] || ''
      }
    })
    
    // Google Sheets configuration check
    let configSheetId = 'UNKNOWN'
    let configError = null
    
    try {
      configSheetId = ABSOLUTE_PRODUCTION_SHEET_ID
    } catch (error) {
      configError = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Private key validation
    let privateKeyStatus = 'MISSING'
    let privateKeyError = null
    
    if (process.env.GOOGLE_PRIVATE_KEY) {
      try {
        const privateKey = process.env.GOOGLE_PRIVATE_KEY
        if (privateKey.includes('BEGIN PRIVATE KEY')) {
          privateKeyStatus = 'VALID_FORMAT'
        } else {
          privateKeyStatus = 'INVALID_FORMAT'
          privateKeyError = 'Private key does not contain BEGIN PRIVATE KEY header'
        }
      } catch (error) {
        privateKeyStatus = 'ERROR'
        privateKeyError = error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // Test Google Sheets authentication
    let authTest = 'NOT_TESTED'
    let authError = null
    
    try {
      // Try to import and test authentication
      const { initializeAuth } = await import('@/lib/sheets/auth')
      const auth = await initializeAuth()
      authTest = auth ? 'SUCCESS' : 'FAILED'
    } catch (error) {
      authTest = 'ERROR'
      authError = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Overall health assessment
    const isHealthy = presentCount === totalCount && 
                     configSheetId === '1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98' &&
                     privateKeyStatus === 'VALID_FORMAT' &&
                     Object.keys(foundDangerousVars).length === 0
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      status: isHealthy ? 'HEALTHY' : 'ISSUES_DETECTED',
      
      // Environment information
      environment: {
        isVercel,
        vercelEnv: process.env.VERCEL_ENV,
        vercelUrl: process.env.VERCEL_URL,
        vercelRegion: process.env.VERCEL_REGION,
        nodeEnv: process.env.NODE_ENV
      },
      
      // Environment variables status
      environmentVariables: {
        status: `${presentCount}/${totalCount} present`,
        presentCount,
        totalCount,
        variables: envVars,
        variableStatus: envStatus
      },
      
      // Google Sheets configuration
      googleSheets: {
        configuredSheetId: configSheetId,
        expectedSheetId: '1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98',
        isCorrect: configSheetId === '1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98',
        configError
      },
      
      // Authentication test
      authentication: {
        status: authTest,
        error: authError,
        privateKeyStatus,
        privateKeyError
      },
      
      // Security check
      security: {
        dangerousVariablesFound: Object.keys(foundDangerousVars).length > 0,
        dangerousVariables: foundDangerousVars
      },
      
      // Recommendations
      recommendations: [] as string[]
    }
    
    // Add specific recommendations based on issues found
    if (presentCount < totalCount) {
      diagnostics.recommendations.push('Add missing environment variables in Vercel Project Settings')
    }
    
    if (privateKeyStatus !== 'VALID_FORMAT') {
      diagnostics.recommendations.push('Check GOOGLE_PRIVATE_KEY format - ensure it includes BEGIN/END PRIVATE KEY headers')
    }
    
    if (Object.keys(foundDangerousVars).length > 0) {
      diagnostics.recommendations.push('Remove dangerous environment variables that could override sheet ID')
    }
    
    if (authTest === 'ERROR') {
      diagnostics.recommendations.push('Check Google Cloud service account configuration and permissions')
    }
    
    if (!isVercel) {
      diagnostics.recommendations.push('This diagnostic is running locally - deploy to Vercel for production testing')
    }
    
    console.log('🔍 VERCEL DIAGNOSTICS COMPLETED:', JSON.stringify(diagnostics, null, 2))
    
    return NextResponse.json(diagnostics)
    
  } catch (error) {
    console.error('🚨 VERCEL DIAGNOSTICS ERROR:', error)
    
    return NextResponse.json({
      status: 'CRITICAL_ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown diagnostic error',
      message: 'Failed to run Vercel diagnostics'
    }, { status: 500 })
  }
}
