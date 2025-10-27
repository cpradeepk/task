import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple environment variable check
    const envCheck = {
      timestamp: new Date().toISOString(),
      environment: {
        isVercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV,
        nodeEnv: process.env.NODE_ENV,
        vercelUrl: process.env.VERCEL_URL
      },
      googleVars: {
        GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID || 'MISSING',
        GOOGLE_PRIVATE_KEY_ID: process.env.GOOGLE_PRIVATE_KEY_ID || 'MISSING',
        GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? 'PRESENT' : 'MISSING',
        GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL || 'MISSING',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'MISSING',
        GOOGLE_CLIENT_CERT_URL: process.env.GOOGLE_CLIENT_CERT_URL || 'MISSING'
      },
      privateKeyInfo: {
        present: !!process.env.GOOGLE_PRIVATE_KEY,
        length: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
        startsWithBegin: process.env.GOOGLE_PRIVATE_KEY?.includes('-----BEGIN PRIVATE KEY-----') || false,
        endsWithEnd: process.env.GOOGLE_PRIVATE_KEY?.includes('-----END PRIVATE KEY-----') || false,
        hasNewlines: process.env.GOOGLE_PRIVATE_KEY?.includes('\\n') || false
      },
      sheetId: '1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98'
    }

    // Count present variables
    const presentVars = Object.values(envCheck.googleVars).filter(val => val !== 'MISSING').length
    
    return NextResponse.json({
      status: presentVars === 6 ? 'ALL_VARS_PRESENT' : 'MISSING_VARS',
      presentCount: `${presentVars}/6`,
      ...envCheck
    })

  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
