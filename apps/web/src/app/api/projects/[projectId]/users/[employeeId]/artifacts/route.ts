/**
 * Project User Artifacts API Route
 *
 * Returns counts of tasks and bugs a user has within a specific project.
 * Used by the removal warning dialog.
 *
 * GET /api/projects/[projectId]/users/[employeeId]/artifacts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserArtifactCounts } from '@/lib/db/project-users'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; employeeId: string }> }
) {
  try {
    const { projectId, employeeId } = await params
    const counts = await getUserArtifactCounts(projectId, employeeId)

    return NextResponse.json({
      success: true,
      data: counts,
    })
  } catch (error) {
    console.error('Failed to get artifact counts:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch artifact counts'

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
