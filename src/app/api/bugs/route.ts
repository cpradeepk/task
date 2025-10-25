import { NextRequest, NextResponse } from 'next/server'
import { getAllBugs, getBugsAssignedTo, getBugsReportedBy, getBugsByStatus, createBug } from '@/lib/db/bugs'
import { Bug } from '@/lib/types'
import { generateBugId } from '@/lib/data'

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

/**
 * POST /api/bugs - Create a new bug
 *
 * This endpoint handles bug creation by:
 * 1. Validating required fields (title, description, reportedBy)
 * 2. Generating a unique bug ID
 * 3. Setting default values for status and reopenedCount
 * 4. Inserting the bug into MySQL database
 *
 * @param {NextRequest} request - The incoming request with bug data in JSON body
 * @returns {NextResponse} JSON response with created bug data or error
 */
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

    // Generate unique bug ID
    const bugId = generateBugId()

    // Prepare bug object with all required fields
    const bugToCreate = {
      bugId,
      title: bugData.title,
      description: bugData.description,
      severity: bugData.severity,
      priority: bugData.priority,
      status: bugData.status || 'New', // Default to 'New' if not provided
      category: bugData.category,
      platform: bugData.platform,
      assignedTo: bugData.assignedTo,
      assignedBy: bugData.assignedBy,
      reportedBy: bugData.reportedBy,
      environment: bugData.environment,
      browserInfo: bugData.browserInfo,
      deviceInfo: bugData.deviceInfo,
      stepsToReproduce: bugData.stepsToReproduce,
      expectedBehavior: bugData.expectedBehavior,
      actualBehavior: bugData.actualBehavior,
      attachments: bugData.attachments,
      estimatedHours: bugData.estimatedHours,
      actualHours: bugData.actualHours,
      resolvedDate: bugData.resolvedDate,
      closedDate: bugData.closedDate,
      reopenedCount: bugData.reopenedCount || 0, // Default to 0 if not provided
      tags: bugData.tags,
      relatedBugs: bugData.relatedBugs
    }

    // Add bug to MySQL
    const bug = await createBug(bugToCreate)

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
