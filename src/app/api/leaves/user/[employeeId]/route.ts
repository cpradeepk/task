import { NextRequest, NextResponse } from 'next/server'
import { getLeavesByEmployeeId } from '@/lib/db/leaves'

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

    const leaves = await getLeavesByEmployeeId(employeeId)
    return NextResponse.json({
      success: true,
      data: leaves,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get leave applications for user:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get leave applications for user'
    }, { status: 500 })
  }
}
