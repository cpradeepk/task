import { NextResponse } from 'next/server'
import { SHEETS_CONFIG } from '@/lib/sheets/config'
import { testConnection } from '@/lib/sheets/auth'
import { ABSOLUTE_PRODUCTION_SHEET_ID } from '@/lib/constants/production'
import { vercelHealthCheck, isVercelEnvironment } from '@/lib/vercel-protection'

export async function GET() {
  try {
    console.log('🔍 VERIFYING GOOGLE SHEET CONFIGURATION...')
    
    // Get current configuration
    const currentSheetId = SHEETS_CONFIG.SPREADSHEET_ID
    const expectedSheetId = ABSOLUTE_PRODUCTION_SHEET_ID
    
    // Vercel environment check
    const vercelCheck = vercelHealthCheck()
    const isVercel = isVercelEnvironment()
    
    // Basic validation
    const isSheetIdCorrect = currentSheetId === expectedSheetId
    
    console.log(`📋 Current Sheet ID: ${currentSheetId}`)
    console.log(`📋 Expected Sheet ID: ${expectedSheetId}`)
    console.log(`✅ Sheet ID Correct: ${isSheetIdCorrect}`)
    
    // Test connection to Google Sheets
    let connectionTest = null
    let connectionError = null
    
    try {
      console.log('🔗 Testing connection to Google Sheets...')
      connectionTest = await testConnection(currentSheetId)
      console.log('✅ Connection test successful')
    } catch (error) {
      console.error('❌ Connection test failed:', error)
      connectionError = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Environment variables check
    const envCheck = {
      hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasPrivateKeyId: !!process.env.GOOGLE_PRIVATE_KEY_ID,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientCertUrl: !!process.env.GOOGLE_CLIENT_CERT_URL,
      projectId: process.env.GOOGLE_PROJECT_ID,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL
    }
    
    // Overall health status
    const isHealthy = isSheetIdCorrect && 
                     connectionTest !== null && 
                     envCheck.hasProjectId && 
                     envCheck.hasPrivateKey && 
                     envCheck.hasClientEmail
    
    // Verification result
    const verificationResult = {
      status: isHealthy ? 'VERIFIED' : 'FAILED',
      timestamp: new Date().toISOString(),
      
      // Google Sheet verification
      googleSheet: {
        currentId: currentSheetId,
        expectedId: expectedSheetId,
        isCorrect: isSheetIdCorrect,
        url: 'https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit',
        connectionStatus: connectionTest ? 'SUCCESS' : 'FAILED',
        connectionError: connectionError
      },
      
      // Environment verification
      environment: {
        isVercel,
        vercelStage: process.env.VERCEL_ENV || 'unknown',
        nodeEnv: process.env.NODE_ENV,
        vercelUrl: process.env.VERCEL_URL,
        environmentVariables: envCheck
      },
      
      // Protection verification
      protection: {
        vercelProtection: vercelCheck.protection,
        sheetIdLocked: isSheetIdCorrect,
        buildValidation: 'ACTIVE',
        runtimeValidation: 'ACTIVE'
      },
      
      // Summary
      summary: {
        sheetIdProtected: isSheetIdCorrect,
        connectionWorking: connectionTest !== null,
        environmentComplete: envCheck.hasProjectId && envCheck.hasPrivateKey && envCheck.hasClientEmail,
        overallHealth: isHealthy
      }
    }
    
    // Log verification result
    console.log('📊 VERIFICATION RESULT:', JSON.stringify(verificationResult, null, 2))
    
    return NextResponse.json(verificationResult)
    
  } catch (error) {
    console.error('🚨 VERIFICATION ERROR:', error)
    
    return NextResponse.json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown verification error',
      message: 'Google Sheet verification failed'
    }, { status: 500 })
  }
}
