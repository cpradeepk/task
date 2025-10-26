/**
 * Restore Project API Route
 * 
 * POST /api/projects/[projectId]/restore - Restore a soft-deleted project
 * 
 * Permissions: Admin only
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProjectById, restoreProject } from '@/lib/db/projects'

/**
 * POST /api/projects/[projectId]/restore
 * 
 * Restore a soft-deleted project
 * 
 * Permissions: Admin only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId

    // TODO: Add permission check here (admin only)
    // For now, we'll trust the frontend to only allow admin

    // Check if project exists (including deleted)
    const existingProject = await getProjectById(projectId, true)
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if project is actually deleted
    if (existingProject.status !== 'Deleted') {
      return NextResponse.json(
        { error: 'Project is not deleted' },
        { status: 400 }
      )
    }

    // Restore project
    const success = await restoreProject(projectId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to restore project' },
        { status: 500 }
      )
    }

    // Get the restored project
    const restoredProject = await getProjectById(projectId)

    return NextResponse.json(
      { 
        message: 'Project restored successfully',
        project: restoredProject
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error restoring project:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to restore project' },
      { status: 500 }
    )
  }
}

