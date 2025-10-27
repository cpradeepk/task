import { NextRequest, NextResponse } from 'next/server'
import { getWFHByEmployeeId } from '@/lib/db/wfh'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    const wfhApplications = await getWFHByEmployeeId(employeeId)
    return NextResponse.json({
      success: true,
      data: wfhApplications,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get WFH applications for user:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get WFH applications for user'
    }, { status: 500 })
  }
}
