import { NextRequest, NextResponse } from 'next/server'
import { BugSheetsService } from '@/lib/sheets/bugs'
import { Bug } from '@/lib/types'

const bugService = new BugSheetsService()

// Simple in-memory cache for bugs
let bugsCache: { data: Bug[], timestamp: number } | null = null
const CACHE_DURATION = 300000 // 5 minutes cache

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assignedTo = searchParams.get('assignedTo')
    const reportedBy = searchParams.get('reportedBy')
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const category = searchParams.get('category')

    // Check cache first for general queries
    if (!assignedTo && !reportedBy && bugsCache && Date.now() - bugsCache.timestamp < CACHE_DURATION) {
      console.log('Returning cached bugs data')
      let bugs = bugsCache.data

      // Apply filters
      if (status) bugs = bugs.filter(bug => bug.status === status)
      if (severity) bugs = bugs.filter(bug => bug.severity === severity)
      if (category) bugs = bugs.filter(bug => bug.category === category)

      return NextResponse.json({
        success: true,
        data: bugs,
        source: 'cache'
      })
    }

    console.log('Fetching fresh bugs data from Google Sheets')
    let bugs: Bug[]

    if (assignedTo) {
      bugs = await bugService.getBugsByAssignee(assignedTo)
    } else if (reportedBy) {
      bugs = await bugService.getBugsByReporter(reportedBy)
    } else {
      bugs = await bugService.getAllBugs()
      
      // Cache the result for general queries
      bugsCache = {
        data: bugs,
        timestamp: Date.now()
      }
    }

    // Apply additional filters
    if (status) bugs = bugs.filter(bug => bug.status === status)
    if (severity) bugs = bugs.filter(bug => bug.severity === severity)
    if (category) bugs = bugs.filter(bug => bug.category === category)

    return NextResponse.json({
      success: true,
      data: bugs,
      source: 'google_sheets'
    })
  } catch (error) {
    console.error('Failed to get bugs:', error)

    // If we have cached data and the error is quota-related, return cached data
    if (bugsCache && error instanceof Error && error.message.includes('quota exceeded')) {
      console.log('Returning stale cached data due to quota error')
      return NextResponse.json({
        success: true,
        data: bugsCache.data,
        source: 'stale_cache'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get bugs'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const bugData = await request.json()

    // Validate required fields
    if (!bugData.title || !bugData.description || !bugData.reportedBy) {
      return NextResponse.json({
        success: false,
        error: 'Title, description, and reportedBy are required'
      }, { status: 400 })
    }

    // Add bug to Google Sheets
    const bugId = await bugService.addBug(bugData)
    
    // Invalidate cache when bug is added
    bugsCache = null

    return NextResponse.json({
      success: true,
      data: bugId,
      message: 'Bug created successfully'
    })
  } catch (error) {
    console.error('Failed to create bug:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create bug'
    }, { status: 500 })
  }
}
