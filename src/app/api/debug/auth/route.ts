import { NextResponse } from 'next/server'
import { SERVICE_ACCOUNT_CONFIG } from '@/lib/sheets/config'

export async function GET() {
  try {
    // Debug environment variables and configuration
    const debug = {
      environment: {
        hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
        hasPrivateKeyId: !!process.env.GOOGLE_PRIVATE_KEY_ID,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        projectId: process.env.GOOGLE_PROJECT_ID,
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
        privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
        privateKeyStart: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 50) || 'N/A',
        privateKeyHasBegin: process.env.GOOGLE_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY') || false,
        privateKeyHasEnd: process.env.GOOGLE_PRIVATE_KEY?.includes('END PRIVATE KEY') || false
      },
      configuration: {
        hasProjectId: !!SERVICE_ACCOUNT_CONFIG.project_id,
        hasPrivateKeyId: !!SERVICE_ACCOUNT_CONFIG.private_key_id,
        hasPrivateKey: !!SERVICE_ACCOUNT_CONFIG.private_key,
        hasClientEmail: !!SERVICE_ACCOUNT_CONFIG.client_email,
        hasClientId: !!SERVICE_ACCOUNT_CONFIG.client_id,
        projectId: SERVICE_ACCOUNT_CONFIG.project_id,
        clientEmail: SERVICE_ACCOUNT_CONFIG.client_email,
        privateKeyLength: SERVICE_ACCOUNT_CONFIG.private_key?.length || 0,
        privateKeyStart: SERVICE_ACCOUNT_CONFIG.private_key?.substring(0, 50) || 'N/A',
        privateKeyHasBegin: SERVICE_ACCOUNT_CONFIG.private_key?.includes('BEGIN PRIVATE KEY') || false,
        privateKeyHasEnd: SERVICE_ACCOUNT_CONFIG.private_key?.includes('END PRIVATE KEY') || false
      },
      validationChecks: {
        hasRequiredFields: !!(SERVICE_ACCOUNT_CONFIG.client_email && SERVICE_ACCOUNT_CONFIG.private_key),
        privateKeyFormatValid: SERVICE_ACCOUNT_CONFIG.private_key?.includes('BEGIN PRIVATE KEY') || false,
        notPlaceholder: !(SERVICE_ACCOUNT_CONFIG.client_email === 'your-service-account@your-project.iam.gserviceaccount.com' ||
                         SERVICE_ACCOUNT_CONFIG.private_key?.includes('Your-Private-Key-Here'))
      }
    }

    return NextResponse.json({
      success: true,
      debug
    })
  } catch (error) {
    console.error('Debug auth error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
