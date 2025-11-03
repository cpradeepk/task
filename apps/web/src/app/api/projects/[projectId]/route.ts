/**
 * Individual Project API Route
 * 
 * Handles GET, PUT, and DELETE requests for a specific project
 * 
 * GET /api/projects/[projectId] - Get project by ID
 * PUT /api/projects/[projectId] - Update project
 * DELETE /api/projects/[projectId] - Soft delete project
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  getProjectById, 
  updateProject, 
  softDeleteProject,
  getSubProjects
} from '@/lib/db/projects'

/**
 * GET /api/projects/[projectId]
 * 
 * Get a specific project by ID
 * 
 * Query parameters:
 * - includeDeleted: 'true' | 'false' (default: 'false', admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const searchParams = request.nextUrl.searchParams
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    const project = await getProjectById(projectId, includeDeleted)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Also get sub-projects if this is a main project
    const subProjects = await getSubProjects(projectId)

    return NextResponse.json(
      { 
        ...project,
        subProjects: subProjects 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/projects/[projectId]
 * 
 * Update a project
 * 
 * Request body:
 * {
 *   projectName?: string
 *   parentProjectId?: string
 *   description?: string
 *   status?: 'Active' | 'Inactive'
 *   updatedBy: string (required, employee ID)
 * }
 * 
 * Permissions: Only admin and top_management can update projects
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()

    // Validate updatedBy field
    if (!body.updatedBy) {
      return NextResponse.json(
        { error: 'Missing required field: updatedBy' },
        { status: 400 }
      )
    }

    // TODO: Add permission check here
    // For now, we'll trust the frontend to only allow admin/top_management

    // Check if project exists
    const existingProject = await getProjectById(projectId)
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Prepare updates (only include fields that are provided)
    const updates: any = {}
    if (body.projectName !== undefined) updates.projectName = body.projectName
    if (body.parentProjectId !== undefined) updates.parentProjectId = body.parentProjectId
    if (body.description !== undefined) updates.description = body.description
    if (body.status !== undefined) updates.status = body.status

    // Update project (validation happens in the database layer)
    const updatedProject = await updateProject(projectId, updates, body.updatedBy)

    return NextResponse.json(updatedProject, { status: 200 })
  } catch (error) {
    console.error('Error updating project:', error)
    
    // Return specific error messages
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[projectId]
 * 
 * Soft delete a project (mark as deleted, not physical delete)
 * 
 * Request body:
 * {
 *   deletedBy: string (required, employee ID)
 * }
 * 
 * Permissions: Only admin can delete projects
 * 
 * Note: Cannot delete projects with sub-projects
 */
// PATCH handler (alias for PUT to support both methods)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return PUT(request, { params })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()

    // Validate deletedBy field
    if (!body.deletedBy) {
      return NextResponse.json(
        { error: 'Missing required field: deletedBy' },
        { status: 400 }
      )
    }

    // TODO: Add permission check here (admin only)
    // For now, we'll trust the frontend to only allow admin

    // Check if project exists
    const existingProject = await getProjectById(projectId)
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Soft delete project (will fail if it has sub-projects)
    const success = await softDeleteProject(projectId, body.deletedBy)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Project deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting project:', error)
    
    // Return specific error messages
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}

