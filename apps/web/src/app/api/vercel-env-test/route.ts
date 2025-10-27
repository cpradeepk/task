import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test environment variables in Vercel
    const envTest = {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      
      // Google Cloud Environment Variables
      googleProjectId: {
        exists: !!process.env.GOOGLE_PROJECT_ID,
        value: process.env.GOOGLE_PROJECT_ID,
        length: process.env.GOOGLE_PROJECT_ID?.length || 0
      },
      
      googleClientEmail: {
        exists: !!process.env.GOOGLE_CLIENT_EMAIL,
        value: process.env.GOOGLE_CLIENT_EMAIL,
        length: process.env.GOOGLE_CLIENT_EMAIL?.length || 0
      },
      
      googleClientId: {
        exists: !!process.env.GOOGLE_CLIENT_ID,
        value: process.env.GOOGLE_CLIENT_ID,
        length: process.env.GOOGLE_CLIENT_ID?.length || 0
      },
      
      googlePrivateKeyId: {
        exists: !!process.env.GOOGLE_PRIVATE_KEY_ID,
        value: process.env.GOOGLE_PRIVATE_KEY_ID,
        length: process.env.GOOGLE_PRIVATE_KEY_ID?.length || 0
      },
      
      googlePrivateKey: {
        exists: !!process.env.GOOGLE_PRIVATE_KEY,
        length: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
        startsWithBegin: process.env.GOOGLE_PRIVATE_KEY?.startsWith('-----BEGIN PRIVATE KEY-----') || false,
        endsWithEnd: process.env.GOOGLE_PRIVATE_KEY?.endsWith('-----END PRIVATE KEY-----') || false,
        hasEscapedNewlines: process.env.GOOGLE_PRIVATE_KEY?.includes('\\n') || false,
        hasRealNewlines: process.env.GOOGLE_PRIVATE_KEY?.includes('\n') || false,
        preview: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 100) || 'N/A'
      }
    }

    // Validation summary
    const validation = {
      allVariablesPresent: !!(
        process.env.GOOGLE_PROJECT_ID &&
        process.env.GOOGLE_CLIENT_EMAIL &&
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_PRIVATE_KEY_ID &&
        process.env.GOOGLE_PRIVATE_KEY
      ),
      privateKeyFormatValid: !!(
        process.env.GOOGLE_PRIVATE_KEY?.includes('-----BEGIN PRIVATE KEY-----') &&
        process.env.GOOGLE_PRIVATE_KEY?.includes('-----END PRIVATE KEY-----')
      ),
      expectedPrivateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0 > 1000,
      environment: process.env.NODE_ENV,
      vercelEnvironment: process.env.VERCEL_ENV || 'local'
    }

    return NextResponse.json({
      success: true,
      environment: envTest,
      validation,
      timestamp: new Date().toISOString(),
      message: validation.allVariablesPresent && validation.privateKeyFormatValid 
        ? 'All environment variables are properly configured'
        : 'Environment variables need attention'
    })

  } catch (error) {
    console.error('Vercel environment test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}
