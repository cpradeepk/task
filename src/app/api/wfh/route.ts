import { NextRequest, NextResponse } from 'next/server'
import { WFHSheetsService } from '@/lib/sheets/wfh'

const wfhService = new WFHSheetsService()

// Simple in-memory cache for WFH applications
let wfhCache: { data: any[], timestamp: number } | null = null
const CACHE_DURATION = 60000 // 60 seconds

export async function GET() {
  try {
    // Check cache first
    if (wfhCache && Date.now() - wfhCache.timestamp < CACHE_DURATION) {
      console.log('Returning cached WFH applications')
      return NextResponse.json({
        success: true,
        data: wfhCache.data,
        source: 'cache'
      })
    }

    console.log('Fetching fresh WFH applications')
    const wfhApplications = await wfhService.getAllWFHApplications()

    // Cache the result
    wfhCache = {
      data: wfhApplications,
      timestamp: Date.now()
    }

    return NextResponse.json({
      success: true,
      data: wfhApplications,
      source: 'google_sheets'
    })
  } catch (error) {
    console.error('Failed to get WFH applications:', error)

    // If we have cached data and the error is quota-related, return cached data
    if (wfhCache && error instanceof Error && error.message.includes('quota exceeded')) {
      console.log('Returning stale cached data due to quota error')
      return NextResponse.json({
        success: true,
        data: wfhCache.data,
        source: 'stale_cache'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get WFH applications'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['employeeId', 'employeeName', 'wfhType', 'fromDate', 'toDate', 'workLocation', 'contactNumber', 'reason']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          success: false,
          error: `${field} is required`
        }, { status: 400 })
      }
    }

    const wfhId = await wfhService.addWFHApplication(body)
    
    return NextResponse.json({
      success: true,
      data: wfhId,
      message: 'WFH application created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create WFH application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create WFH application'
    }, { status: 500 })
  }
}
