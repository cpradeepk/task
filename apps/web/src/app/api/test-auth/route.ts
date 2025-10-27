import { NextResponse } from 'next/server'
import { initializeAuth, getSheetsClient } from '@/lib/sheets/auth'
import { SHEETS_CONFIG } from '@/lib/sheets/config'

export async function GET() {
  try {
    console.log('🧪 Testing Google Sheets authentication...')
    
    // Step 1: Try to initialize auth
    const authClient = await initializeAuth()
    if (!authClient) {
      return NextResponse.json({
        success: false,
        step: 'auth_initialization',
        error: 'Failed to initialize authentication'
      })
    }
    
    console.log('✅ Authentication initialized successfully')
    
    // Step 2: Try to get sheets client
    const sheets = await getSheetsClient()
    if (!sheets) {
      return NextResponse.json({
        success: false,
        step: 'sheets_client',
        error: 'Failed to get sheets client'
      })
    }
    
    console.log('✅ Sheets client obtained successfully')
    
    // Step 3: Try to read from the actual sheet
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
        range: `${SHEETS_CONFIG.RANGES.USER_DETAILS}!A1:B2`, // Just get headers
      })
      
      console.log('✅ Successfully read from Google Sheet')
      
      return NextResponse.json({
        success: true,
        message: 'Google Sheets authentication and connection successful',
        data: {
          rowCount: response.data.values?.length || 0,
          headers: response.data.values?.[0] || []
        }
      })
    } catch (sheetsError) {
      console.error('❌ Failed to read from Google Sheet:', sheetsError)
      return NextResponse.json({
        success: false,
        step: 'sheet_read',
        error: sheetsError instanceof Error ? sheetsError.message : 'Unknown sheets error'
      })
    }
    
  } catch (error) {
    console.error('❌ Test auth error:', error)
    return NextResponse.json({
      success: false,
      step: 'general',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
