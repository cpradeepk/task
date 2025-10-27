// Server-side only - do not use 'use client'

import { google } from 'googleapis'
import { SERVICE_ACCOUNT_CONFIG, SCOPES, SHEETS_CONFIG } from './config'
import { vercelRuntimeProtection } from '../vercel-protection'
import { validateAbsoluteSheetId } from '../constants/production'

// Force serverless environment check
if (typeof window !== 'undefined') {
  throw new Error('Google Sheets authentication must only be used on the server side')
}

let authClient: any = null

/**
 * Initialize Google Sheets authentication
 */
export async function initializeAuth() {
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      console.warn('Google Sheets API should only be used on the server side')
      return null
    }

    // Debug: Log environment variables (safely)
    console.log('Environment check:', {
      hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
      hasPrivateKeyId: !!process.env.GOOGLE_PRIVATE_KEY_ID,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      projectId: process.env.GOOGLE_PROJECT_ID,
      privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length,
      privateKeyStart: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 50),
      privateKeyHasBegin: process.env.GOOGLE_PRIVATE_KEY?.includes('-----BEGIN PRIVATE KEY-----'),
      privateKeyHasEnd: process.env.GOOGLE_PRIVATE_KEY?.includes('-----END PRIVATE KEY-----'),
      privateKeyHasEscapedNewlines: process.env.GOOGLE_PRIVATE_KEY?.includes('\\n')
    })

    // Validate required environment variables
    if (!SERVICE_ACCOUNT_CONFIG.client_email || !SERVICE_ACCOUNT_CONFIG.private_key) {
      console.warn('Missing required Google Sheets credentials - using localStorage fallback')
      console.warn('Config values:', {
        client_email: SERVICE_ACCOUNT_CONFIG.client_email,
        has_private_key: !!SERVICE_ACCOUNT_CONFIG.private_key,
        private_key_length: SERVICE_ACCOUNT_CONFIG.private_key?.length,
        private_key_start: SERVICE_ACCOUNT_CONFIG.private_key?.substring(0, 50)
      })
      return null
    }

    // Additional validation for private key format (more flexible)
    const isProduction = process.env.NODE_ENV === 'production'
    const hasValidKeyFormat = SERVICE_ACCOUNT_CONFIG.private_key.includes('BEGIN') &&
                             SERVICE_ACCOUNT_CONFIG.private_key.includes('PRIVATE KEY')

    if (!hasValidKeyFormat && !isProduction) {
      console.warn('Private key format appears invalid - using localStorage fallback')
      console.warn('Private key preview:', SERVICE_ACCOUNT_CONFIG.private_key.substring(0, 100))
      return null
    } else if (!hasValidKeyFormat && isProduction) {
      console.warn('Private key format appears invalid but proceeding in production mode')
      console.warn('Private key preview:', SERVICE_ACCOUNT_CONFIG.private_key.substring(0, 100))
    }

    // Check if credentials are placeholder values
    if (SERVICE_ACCOUNT_CONFIG.client_email === 'your-service-account@your-project.iam.gserviceaccount.com' ||
        SERVICE_ACCOUNT_CONFIG.private_key?.includes('Your-Private-Key-Here')) {
      console.warn('Google Sheets credentials are placeholder values - using localStorage fallback')
      return null
    }

    // Create JWT auth client with enhanced error handling
    try {
      console.log('🔑 Creating JWT auth client...')
      authClient = new google.auth.JWT({
        email: SERVICE_ACCOUNT_CONFIG.client_email,
        key: SERVICE_ACCOUNT_CONFIG.private_key,
        scopes: SCOPES
      })

      console.log('🔐 Authorizing client...')
      // Authorize the client with timeout
      const authPromise = authClient.authorize()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Authentication timeout after 15 seconds')), 15000)
      )

      await Promise.race([authPromise, timeoutPromise])
      console.log('✅ JWT authorization successful')
    } catch (authError) {
      console.error('❌ JWT authentication failed:', authError)

      // Try a more direct approach if the first one fails
      try {
        console.log('🔄 Trying alternative authentication method...')
        authClient = new google.auth.GoogleAuth({
          credentials: {
            type: 'service_account',
            project_id: SERVICE_ACCOUNT_CONFIG.project_id,
            private_key_id: SERVICE_ACCOUNT_CONFIG.private_key_id,
            private_key: SERVICE_ACCOUNT_CONFIG.private_key,
            client_email: SERVICE_ACCOUNT_CONFIG.client_email,
            client_id: SERVICE_ACCOUNT_CONFIG.client_id
          },
          scopes: SCOPES
        })

        // Test the alternative auth
        await authClient.getAccessToken()
        console.log('✅ Alternative authentication successful')
      } catch (altAuthError) {
        console.error('❌ Alternative authentication also failed:', altAuthError)
        throw authError // Throw the original error
      }
    }

    console.log('Google Sheets authentication successful')
    return authClient
  } catch (error) {
    console.warn('Failed to initialize Google Sheets auth, using localStorage fallback:', error)
    return null
  }
}

/**
 * Get authenticated Google Sheets client
 */
export async function getSheetsClient() {
  try {
    if (!authClient) {
      authClient = await initializeAuth()
    }

    if (!authClient) {
      throw new Error('Google Sheets authentication not available - using localStorage fallback')
    }

    // Handle both JWT and GoogleAuth clients
    if (authClient.getAccessToken) {
      // GoogleAuth client
      return google.sheets({ version: 'v4', auth: authClient })
    } else {
      // JWT client
      return google.sheets({ version: 'v4', auth: authClient })
    }
  } catch (error) {
    console.warn('Failed to get Sheets client, using localStorage fallback:', error)
    throw error
  }
}

/**
 * Test the connection to Google Sheets
 */
export async function testConnection(spreadsheetId: string) {
  try {
    // ABSOLUTE PROTECTION: Use Vercel runtime protection
    const protectedSheetId = vercelRuntimeProtection()

    // Validate that the provided sheet ID matches the protected one
    validateAbsoluteSheetId(spreadsheetId)

    // Ensure we're using the protected sheet ID
    if (spreadsheetId !== protectedSheetId) {
      throw new Error(`🚨 CRITICAL: Sheet ID mismatch! Expected: ${protectedSheetId}, Got: ${spreadsheetId}`)
    }

    const sheets = await getSheetsClient()
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties.title'
    })

    console.log('Connection test successful:', response.data.properties?.title)
    return {
      success: true,
      title: response.data.properties?.title,
      sheets: response.data.sheets?.map(sheet => sheet.properties?.title)
    }
  } catch (error) {
    console.error('Connection test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check if Google Sheets is available
 */
export function isSheetsAvailable(): boolean {
  return !!(
    SERVICE_ACCOUNT_CONFIG.client_email &&
    SERVICE_ACCOUNT_CONFIG.private_key &&
    SERVICE_ACCOUNT_CONFIG.client_email !== 'your-service-account@your-project.iam.gserviceaccount.com' &&
    !SERVICE_ACCOUNT_CONFIG.private_key?.includes('Your-Private-Key-Here') &&
    typeof window === 'undefined' // Server-side only
  )
}
