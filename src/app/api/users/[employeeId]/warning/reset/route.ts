import { NextRequest, NextResponse } from 'next/server'
import { UserSheetsService } from '@/lib/sheets/users'

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

    const userService = new UserSheetsService()
    const result = await userService.resetWarningCount(employeeId)

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
