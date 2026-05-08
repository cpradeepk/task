/**
 * Project Users API Route
 *
 * Manages user assignments for a specific project.
 *
 * GET /api/projects/[projectId]/users - List assigned users
 * POST /api/projects/[projectId]/users - Assign a user to the project
 * DELETE /api/projects/[projectId]/users - Remove a user from the project
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getProjectUsers,
  assignUserToProject,
  removeUserFromProject,
} from '@/lib/db/project-users'

/**
 * GET /api/projects/[projectId]/users
 *
 * Returns all users assigned to the project with their details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const users = await getProjectUsers(projectId)

    return NextResponse.json({
      success: true,
      data: users,
    })
  } catch (error) {
    console.error('Failed to get project users:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch project users'

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[projectId]/users
 *
 * Assign a user to the project
 * Body: { employeeId: string, assignedBy: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { employeeId, assignedBy } = body

    if (!employeeId || !assignedBy) {
      return NextResponse.json(
        { success: false, error: 'employeeId and assignedBy are required' },
        { status: 400 }
      )
    }

    const assignment = await assignUserToProject(projectId, employeeId, assignedBy)

    return NextResponse.json({
      success: true,
      data: assignment,
    })
  } catch (error) {
    console.error('Failed to assign user to project:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to assign user'

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[projectId]/users
 *
 * Remove a user from the project
 * Body: { employeeId: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { employeeId } = body

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'employeeId is required' },
        { status: 400 }
      )
    }

    await removeUserFromProject(projectId, employeeId)

    return NextResponse.json({
      success: true,
      message: `User ${employeeId} removed from project ${projectId}`,
    })
  } catch (error) {
    console.error('Failed to remove user from project:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove user'

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
