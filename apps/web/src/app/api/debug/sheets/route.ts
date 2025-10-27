import { NextResponse } from 'next/server'
import { testConnection, isSheetsAvailable } from '@/lib/sheets/auth'
import { SHEETS_CONFIG } from '@/lib/sheets/config'
import { UserSheetsService } from '@/lib/sheets/users'

export async function GET() {
  try {
    console.log('=== Google Sheets Debug Information ===')
    
    // Check environment variables
    const envCheck = {
      hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
      hasPrivateKeyId: !!process.env.GOOGLE_PRIVATE_KEY_ID,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      projectId: process.env.GOOGLE_PROJECT_ID,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0
    }
    
    console.log('Environment Variables:', envCheck)
    
    // Check configuration
    const configCheck = {
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      sheets: SHEETS_CONFIG.SHEETS,
      ranges: SHEETS_CONFIG.RANGES
    }
    
    console.log('Configuration:', configCheck)
    
    // Check if sheets is available
    const sheetsAvailable = isSheetsAvailable()
    console.log('Sheets Available:', sheetsAvailable)
    
    if (!sheetsAvailable) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheets not available',
        debug: {
          environment: envCheck,
          configuration: configCheck,
          sheetsAvailable
        }
      })
    }
    
    // Test connection
    const connectionTest = await testConnection(SHEETS_CONFIG.SPREADSHEET_ID)
    console.log('Connection Test:', connectionTest)
    
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: 'Connection test failed',
        debug: {
          environment: envCheck,
          configuration: configCheck,
          sheetsAvailable,
          connectionTest
        }
      })
    }
    
    // Try to get users
    const userService = new UserSheetsService()
    let usersTest = null
    try {
      const users = await userService.getAllUsers()
      usersTest = {
        success: true,
        userCount: users.length,
        users: users.slice(0, 3) // First 3 users for debugging
      }
    } catch (error) {
      usersTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    console.log('Users Test:', usersTest)
    
    return NextResponse.json({
      success: true,
      debug: {
        environment: envCheck,
        configuration: configCheck,
        sheetsAvailable,
        connectionTest,
        usersTest
      }
    })
    
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        environment: {
          hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
          hasPrivateKeyId: !!process.env.GOOGLE_PRIVATE_KEY_ID,
          hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
          hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
          hasClientId: !!process.env.GOOGLE_CLIENT_ID
        }
      }
    })
  }
}
