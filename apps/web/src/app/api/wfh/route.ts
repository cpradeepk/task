import { NextRequest, NextResponse } from 'next/server'
import { getAllWFH, createWFH } from '@/lib/db/wfh'
import { withTimeout } from '@/lib/db/config'

export async function GET() {
  try {
    console.log('Fetching WFH applications from MySQL')
    const wfhApplications = await withTimeout(
      getAllWFH(),
      10000,
      'Failed to fetch WFH applications - database timeout'
    )

    return NextResponse.json({
      success: true,
      data: wfhApplications,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get WFH applications:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get WFH applications'

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
    const requiredFields = ['employeeId', 'employeeName', 'wfhType', 'fromDate', 'toDate', 'workLocation', 'contactNumber', 'reason']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          success: false,
          error: `${field} is required`
        }, { status: 400 })
      }
    }

    const wfh = await createWFH(body)

    return NextResponse.json({
      success: true,
      data: wfh,
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
