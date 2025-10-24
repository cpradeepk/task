import { NextResponse } from 'next/server'
import { SHEETS_CONFIG } from '@/lib/sheets/config'
import { vercelHealthCheck, isVercelEnvironment, getVercelStage } from '@/lib/vercel-protection'
import { ABSOLUTE_PRODUCTION_SHEET_ID } from '@/lib/constants/production'

export async function GET() {
  try {
    // Run Vercel health check
    const vercelCheck = vercelHealthCheck()

    // Additional environment checks
    const environmentInfo = {
      nodeEnv: process.env.NODE_ENV,
      isVercel: isVercelEnvironment(),
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      vercelStage: getVercelStage(),
      vercelRegion: process.env.VERCEL_REGION,
      timestamp: new Date().toISOString()
    }
    
    // Google Sheets configuration check with absolute protection
    const sheetsConfig = {
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      expectedId: ABSOLUTE_PRODUCTION_SHEET_ID,
      isCorrect: SHEETS_CONFIG.SPREADSHEET_ID === ABSOLUTE_PRODUCTION_SHEET_ID,
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit',
      vercelProtection: vercelCheck.protection,
      absoluteProtection: 'ACTIVE'
    }
    
    // Service account configuration check
    const serviceAccountCheck = {
      hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      projectId: process.env.GOOGLE_PROJECT_ID,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL
    }
    
    // Overall status with Vercel protection
    const isHealthy = vercelCheck.protection === 'ACTIVE' &&
                     sheetsConfig.isCorrect &&
                     serviceAccountCheck.hasProjectId &&
                     serviceAccountCheck.hasPrivateKey &&
                     serviceAccountCheck.hasClientEmail
    
    return NextResponse.json({
      status: isHealthy ? 'HEALTHY' : 'ERROR',
      timestamp: environmentInfo.timestamp,
      vercelCheck,
      environment: environmentInfo,
      googleSheets: sheetsConfig,
      serviceAccount: serviceAccountCheck,
      protection: {
        vercelProtection: vercelCheck.protection,
        absoluteProtection: sheetsConfig.absoluteProtection,
        sheetIdCorrect: sheetsConfig.isCorrect,
        environmentComplete: serviceAccountCheck.hasProjectId &&
                           serviceAccountCheck.hasPrivateKey &&
                           serviceAccountCheck.hasClientEmail
      },
      message: isHealthy ?
        '🔒 VERCEL DEPLOYMENT: Healthy with absolute Google Sheet ID protection' :
        '🚨 VERCEL DEPLOYMENT: Configuration issues detected'
    })
    
  } catch (error) {
    console.error('Production check failed:', error)
    
    return NextResponse.json({
      status: 'CRITICAL_ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Critical production configuration error detected'
    }, { status: 500 })
  }
}
