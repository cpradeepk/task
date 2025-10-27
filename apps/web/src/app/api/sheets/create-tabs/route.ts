import { NextResponse } from 'next/server'
import { SchemaInitializer } from '@/lib/sheets/schema'

export async function POST() {
  try {
    console.log('Creating Google Sheets tabs...')
    
    const schemaInitializer = new SchemaInitializer()
    const result = await schemaInitializer.initializeAllSheets()

    if (result) {
      return NextResponse.json({
        success: true,
        message: 'Google Sheets tabs created successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to create some sheets'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to create sheets:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to create Google Sheets tabs'
    }, { status: 500 })
  }
}
