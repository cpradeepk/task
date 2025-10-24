import { NextRequest, NextResponse } from 'next/server'
import { getUsersByManagerId } from '@/lib/db/users'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ managerId: string }> }
) {
  try {
    const { managerId } = await params

    if (!managerId) {
      return NextResponse.json({
        success: false,
        error: 'Manager ID is required'
      }, { status: 400 })
    }

    console.log(`Fetching team members for manager ${managerId} from MySQL`)
    const teamMembers = await getUsersByManagerId(managerId)

    return NextResponse.json({
      success: true,
      data: teamMembers,
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get team members:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to get team members'
    }, { status: 500 })
  }
}
