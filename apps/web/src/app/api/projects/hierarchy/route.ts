/**
 * Project Hierarchy API Route
 * 
 * GET /api/projects/hierarchy - Get projects in hierarchical structure
 * 
 * Returns projects organized by parent-child relationships
 * Useful for displaying project trees in the UI
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllProjects } from '@/lib/db/projects'
import { Project } from '@/lib/types'

/**
 * ProjectNode Interface
 * 
 * Represents a project with its sub-projects in a tree structure
 */
interface ProjectNode extends Project {
  children?: ProjectNode[]
}

/**
 * GET /api/projects/hierarchy
 * 
 * Query parameters:
 * - includeDeleted: 'true' | 'false' (default: 'false', admin only)
 * 
 * Returns a hierarchical structure of projects:
 * [
 *   {
 *     projectId: 'PRJ-001',
 *     projectName: 'Main Project',
 *     children: [
 *       { projectId: 'PRJ-002', projectName: 'Sub Project 1', children: [] },
 *       { projectId: 'PRJ-003', projectName: 'Sub Project 2', children: [] }
 *     ]
 *   }
 * ]
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    // Get all projects
    const allProjects = await getAllProjects(includeDeleted)

    // Build hierarchy
    const hierarchy = buildHierarchy(allProjects)

    return NextResponse.json(hierarchy, { status: 200 })
  } catch (error) {
    console.error('Error fetching project hierarchy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project hierarchy' },
      { status: 500 }
    )
  }
}

/**
 * Build hierarchical structure from flat project list
 * 
 * @param projects - Flat list of all projects
 * @returns Hierarchical tree structure
 */
function buildHierarchy(projects: Project[]): ProjectNode[] {
  // Create a map for quick lookup
  const projectMap = new Map<string, ProjectNode>()
  
  // Initialize all projects as nodes
  projects.forEach(project => {
    projectMap.set(project.projectId, {
      ...project,
      children: []
    })
  })

  // Build the tree
  const rootProjects: ProjectNode[] = []

  projects.forEach(project => {
    const node = projectMap.get(project.projectId)!
    
    if (project.parentProjectId) {
      // This is a sub-project, add it to its parent's children
      const parent = projectMap.get(project.parentProjectId)
      if (parent) {
        parent.children!.push(node)
      } else {
        // Parent not found (shouldn't happen with proper data), treat as root
        rootProjects.push(node)
      }
    } else {
      // This is a main project (no parent)
      rootProjects.push(node)
    }
  })

  return rootProjects
}

