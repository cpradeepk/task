import { NextRequest, NextResponse } from 'next/server'
import { getWFHByEmployeeId } from '@/lib/db/wfh'
import { requireUserAccess } from '@/lib/auth-server'

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

    // Anyone signed in could previously read any employee's records by editing
    // the ID in the URL. Access is now self, your reports (at any depth), or a
    // company admin of the company you share.
    const auth = await requireUserAccess(request, employeeId)
    if (!auth.ok) return auth.response

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
