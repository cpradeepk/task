import { NextRequest, NextResponse } from 'next/server'
import { LeaveSheetsService } from '@/lib/sheets/leaves'

const leaveService = new LeaveSheetsService()

// Simple in-memory cache for leave applications
let leavesCache: { data: any[], timestamp: number } | null = null
const CACHE_DURATION = 60000 // 60 seconds

export async function GET() {
  try {
    // Check cache first
    if (leavesCache && Date.now() - leavesCache.timestamp < CACHE_DURATION) {
      console.log('Returning cached leave applications')
      return NextResponse.json({
        success: true,
        data: leavesCache.data,
        source: 'cache'
      })
    }

    console.log('Fetching fresh leave applications')
    const leaves = await leaveService.getAllLeaveApplications()

    // Cache the result
    leavesCache = {
      data: leaves,
      timestamp: Date.now()
    }

    return NextResponse.json({
      success: true,
      data: leaves,
      source: 'google_sheets'
    })
  } catch (error) {
    console.error('Failed to get leave applications:', error)

    // If we have cached data and the error is quota-related, return cached data
    if (leavesCache && error instanceof Error && error.message.includes('quota exceeded')) {
      console.log('Returning stale cached data due to quota error')
      return NextResponse.json({
        success: true,
        data: leavesCache.data,
        source: 'stale_cache'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get leave applications'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['employeeId', 'employeeName', 'leaveType', 'fromDate', 'toDate', 'reason']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          success: false,
          error: `${field} is required`
        }, { status: 400 })
      }
    }

    const leaveId = await leaveService.addLeaveApplication(body)

    return NextResponse.json({
      success: true,
      data: leaveId,
      message: 'Leave application created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create leave application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create leave application'
    }, { status: 500 })
  }
}
