import { NextRequest, NextResponse } from 'next/server'
import { getAllBugs, getBugsAssignedTo, getBugsReportedBy, getBugsByStatus, createBug } from '@/lib/db/bugs'
import { Bug } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assignedTo = searchParams.get('assignedTo')
    const reportedBy = searchParams.get('reportedBy')
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const category = searchParams.get('category')

    console.log('Fetching bugs data from MySQL')
    let bugs: Bug[]

    if (assignedTo) {
      bugs = await getBugsAssignedTo(assignedTo)
    } else if (reportedBy) {
      bugs = await getBugsReportedBy(reportedBy)
    } else if (status) {
      bugs = await getBugsByStatus(status as Bug['status'])
    } else {
      bugs = await getAllBugs()
    }

    // Apply additional filters
    if (severity) bugs = bugs.filter(bug => bug.severity === severity)
    if (category) bugs = bugs.filter(bug => bug.category === category)

    return NextResponse.json({
      success: true,
      data: bugs,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get bugs:', error)

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

    // Add bug to MySQL
    const bug = await createBug(bugData)

    return NextResponse.json({
      success: true,
      data: bug,
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
