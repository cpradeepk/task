import { NextRequest, NextResponse } from 'next/server'
import { TaskSheetsService } from '@/lib/sheets/tasks'
import { UserSheetsService } from '@/lib/sheets/users'

const taskService = new TaskSheetsService()
const userService = new UserSheetsService()

/**
 * Admin endpoint to fix Google Sheets column structure
 * This will ensure the headers are in the correct order
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting Google Sheets structure fix...')
    
    // Initialize sheets with correct headers
    const taskSheetFixed = await taskService.initializeSheet()
    const userSheetFixed = await userService.initializeSheet()
    
    if (taskSheetFixed && userSheetFixed) {
      console.log('✅ Google Sheets structure fixed successfully')
      return NextResponse.json({
        success: true,
        message: 'Google Sheets structure fixed successfully',
        details: {
          taskSheet: 'Headers updated',
          userSheet: 'Headers updated'
        }
      })
    } else {
      console.error('❌ Failed to fix some sheets')
      return NextResponse.json({
        success: false,
        message: 'Failed to fix some sheets',
        details: {
          taskSheet: taskSheetFixed ? 'Fixed' : 'Failed',
          userSheet: userSheetFixed ? 'Fixed' : 'Failed'
        }
      }, { status: 500 })
    }
  } catch (error) {
    console.error('❌ Error fixing Google Sheets structure:', error)
    return NextResponse.json({
      success: false,
      message: 'Error fixing Google Sheets structure',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
