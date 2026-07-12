/**
 * Projects API Route
 * 
 * Handles GET and POST requests for projects
 * 
 * GET /api/projects - Get all projects (with optional filters)
 * POST /api/projects - Create a new project
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAllProjects,
  getActiveProjects,
  getMainProjects,
  createProject
} from '@/lib/db/projects'
import { getUserProjectIds } from '@/lib/db/project-users'
import { getAuthUser } from '@/lib/auth-server'
import { Project } from '@/lib/types'

/**
 * GET /api/projects
 * 
 * Query parameters:
 * - status: 'active' | 'all' (default: 'active')
 * - type: 'main' | 'all' (default: 'all')
 * - includeDeleted: 'true' | 'false' (default: 'false', admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'active'
    const type = searchParams.get('type') || 'all'
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    let projects: Project[]

    // Get projects based on filters
    if (type === 'main') {
      // Get only main projects (no parent)
      projects = await getMainProjects()
    } else if (status === 'all') {
      // Get all projects (including inactive)
      projects = await getAllProjects(includeDeleted)
    } else {
      // Get only active projects (default)
      projects = await getActiveProjects()
    }

    // Project dropdowns must show ONLY projects the user has been added to —
    // for EVERY role (admin/top_management included). The admin project
    // management surfaces use /api/projects/hierarchy, which is intentionally
    // left role-based so admins can still manage all projects.
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userProjectIds = await getUserProjectIds(authUser.employeeId)
    // Include projects the user is assigned to, plus their sub-projects
    const assignedSet = new Set(userProjectIds)
    projects = projects.filter(p =>
      assignedSet.has(p.projectId) ||
      (p.parentProjectId && assignedSet.has(p.parentProjectId))
    )

    return NextResponse.json(projects, { status: 200 })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects
 * 
 * Create a new project
 * 
 * Request body:
 * {
 *   projectName: string (required)
 *   parentProjectId?: string (optional, for sub-projects)
 *   description?: string (optional)
 *   status?: 'Active' | 'Inactive' (default: 'Active')
 *   createdBy: string (required, employee ID)
 * }
 * 
 * Permissions: Only admin and top_management can create projects
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.projectName || !body.createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: projectName, createdBy' },
        { status: 400 }
      )
    }

    // TODO: Add permission check here
    // For now, we'll trust the frontend to only allow admin/top_management
    // In production, you should verify the user's role from session/token

    // Prepare project data
    const projectData: Omit<Project, 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deletedBy'> = {
      projectName: body.projectName,
      parentProjectId: body.parentProjectId || undefined,
      description: body.description || undefined,
      status: body.status || 'Active',
      createdBy: body.createdBy,
      releaseEnabled: body.releaseEnabled ?? false,
      releaseChecklist: body.releaseChecklist ?? null
    }

    // Create project (validation happens in the database layer)
    const newProject = await createProject(projectData, body.createdBy)

    return NextResponse.json(newProject, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    
    // Return specific error messages
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

