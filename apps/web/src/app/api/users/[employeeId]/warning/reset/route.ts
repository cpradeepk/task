import { NextRequest, NextResponse } from 'next/server'
import { resetWarningCount } from '@/lib/db/users'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    const result = await resetWarningCount(employeeId)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Failed to reset warning count:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset warning count' },
      { status: 500 }
    )
  }
}
