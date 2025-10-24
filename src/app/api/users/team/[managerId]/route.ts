import { NextRequest, NextResponse } from 'next/server'
import { UserSheetsService } from '@/lib/sheets/users'

const userService = new UserSheetsService()

// Simple in-memory cache for team members
const teamMembersCache = new Map<string, { data: any[], timestamp: number }>()
const CACHE_DURATION = 60000 // 60 seconds

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

    // Check cache first
    const cached = teamMembersCache.get(managerId)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Returning cached team members for manager ${managerId}`)
      return NextResponse.json({
        success: true,
        data: cached.data,
        source: 'cache'
      })
    }

    console.log(`Fetching fresh team members for manager ${managerId}`)
    const teamMembers = await userService.getTeamMembers(managerId)

    // Cache the result
    teamMembersCache.set(managerId, {
      data: teamMembers,
      timestamp: Date.now()
    })

    return NextResponse.json({
      success: true,
      data: teamMembers,
      source: 'google_sheets'
    })
  } catch (error) {
    console.error('Failed to get team members:', error)

    const { managerId } = await params

    // If we have cached data and the error is quota-related, return cached data
    const cached = teamMembersCache.get(managerId)
    if (cached && error instanceof Error && error.message.includes('quota exceeded')) {
      console.log(`Returning stale cached data due to quota error for manager ${managerId}`)
      return NextResponse.json({
        success: true,
        data: cached.data,
        source: 'stale_cache'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get team members'
    }, { status: 500 })
  }
}
