import { NextRequest, NextResponse } from 'next/server'
import { getAllLeaves, createLeave } from '@/lib/db/leaves'
import { withTimeout } from '@/lib/db/config'

export async function GET() {
  try {
    console.log('Fetching leave applications from MySQL')
    const leaves = await withTimeout(
      getAllLeaves(),
      10000,
      'Failed to fetch leave applications - database timeout'
    )

    return NextResponse.json({
      success: true,
      data: leaves,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get leave applications:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get leave applications'

    return NextResponse.json({
      success: false,
      error: errorMessage
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

    const leave = await createLeave(body)

    return NextResponse.json({
      success: true,
      data: leave,
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
