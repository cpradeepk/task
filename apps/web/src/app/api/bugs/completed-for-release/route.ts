import { NextRequest, NextResponse } from 'next/server'
import { getCompletedBugsForRelease } from '@/lib/db/bugs'

/**
 * GET /api/bugs/completed-for-release?subprojectId=...
 *
 * Returns the completed (Resolved/Closed) bugs/features for a sub-project that
 * are eligible to be linked in a new release (i.e. completed since the previous
 * release for that sub-project). Used to pre-populate the release create form.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subprojectId = searchParams.get('subprojectId') || undefined

    if (!subprojectId) {
      return NextResponse.json({
        success: false,
        error: 'subprojectId is required'
      }, { status: 400 })
    }

    const data = await getCompletedBugsForRelease(subprojectId)

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Failed to get completed bugs for release:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get completed bugs for release'
    }, { status: 500 })
  }
}
