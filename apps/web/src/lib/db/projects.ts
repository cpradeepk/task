/**
 * MySQL Projects Service
 *
 * This file handles all database operations for the project management system.
 * It provides CRUD operations for projects and sub-projects with 2-level hierarchy support.
 *
 * IMPORTANT: Server-side only - do not use 'use client' directive
 * This file uses MySQL2 library which only works on the server.
 *
 * Key Features:
 * - 2-level hierarchy support (Main Project → Sub-Project)
 * - Soft delete functionality (mark as deleted, not physical delete)
 * - Automatic project ID generation (PRJ-001, PRJ-002, etc.)
 * - Circular reference prevention
 * - Audit trail (created_by, deleted_by, timestamps)
 */

import { query, queryOne, withRetry } from './config'
import { Project } from '../types'
/**
 * ProjectRow Interface
 *
 * Represents a project record as it comes from the MySQL database.
 * Database columns use snake_case naming (e.g., project_id, parent_project_id).
 */
interface ProjectRow  {
  id: number
  project_id: string
  project_name: string
  parent_project_id: string | null
  description: string | null
  status: string
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

/**
 * Convert database row to Project object
 * Handles snake_case to camelCase conversion and type casting
 */
function rowToProject(row: ProjectRow): Project {
  return {
    projectId: row.project_id,
    projectName: row.project_name,
    parentProjectId: row.parent_project_id || undefined,
    description: row.description || undefined,
    status: row.status as Project['status'],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
    deletedBy: row.deleted_by || undefined
  }
}

/**
 * Get all projects
 * @param includeDeleted - If true, includes soft-deleted projects (admin only)
 */
export async function getAllProjects(includeDeleted = false): Promise<Project[]> {
  return withRetry(async () => {
    const sql = includeDeleted
      ? 'SELECT * FROM projects ORDER BY parent_project_id IS NOT NULL, project_id'
      : 'SELECT * FROM projects WHERE status != $1 ORDER BY parent_project_id IS NOT NULL, project_id'
    
    const params = includeDeleted ? [] : ['Deleted']
    const rows = await query<ProjectRow[]>(sql, params)
    return rows.map(rowToProject)
  })
}

/**
 * Get only active projects
 */
export async function getActiveProjects(): Promise<Project[]> {
  return withRetry(async () => {
    const rows = await query<ProjectRow[]>(
      'SELECT * FROM projects WHERE status = $1 ORDER BY parent_project_id IS NOT NULL, project_id',
      ['Active']
    )
    return rows.map(rowToProject)
  })
}

/**
 * Get project by ID
 * @param projectId - The project ID to fetch
 * @param includeDeleted - If true, can fetch deleted projects (admin only)
 */
export async function getProjectById(project_id: string, includeDeleted = false): Promise<Project | null> {
  return withRetry(async () => {
    const sql = includeDeleted
      ? 'SELECT * FROM projects WHERE project_id = $1'
      : 'SELECT * FROM projects WHERE project_id = $1 AND status != $2'

    const params = includeDeleted ? [project_id] : [project_id, 'Deleted']
    const row = await queryOne<ProjectRow>(sql, params)
    return row ? rowToProject(row) : null
  })
}

/**
 * Get sub-projects of a parent project
 * @param parentProjectId - The parent project ID
 */
export async function getSubProjects(parentProjectId: string): Promise<Project[]> {
  return withRetry(async () => {
    const rows = await query<ProjectRow[]>(
      'SELECT * FROM projects WHERE parent_project_id = $1 AND status != $2 ORDER BY project_id',
      [parentProjectId, 'Deleted']
    )
    return rows.map(rowToProject)
  })
}

/**
 * Get main projects (projects without parent)
 */
export async function getMainProjects(): Promise<Project[]> {
  return withRetry(async () => {
    const rows = await query<ProjectRow[]>(
      'SELECT * FROM projects WHERE parent_project_id IS NULL AND status != $1 ORDER BY project_id',
      ['Deleted']
    )
    return rows.map(rowToProject)
  })
}

/**
 * Get project hierarchy as a tree structure
 * @param includeDeleted - If true, includes deleted projects (admin only)
 */
export async function getProjectHierarchy(includeDeleted = false): Promise<Project[]> {
  return withRetry(async () => {
    // Get all projects
    const allProjects = await getAllProjects(includeDeleted)
    
    // Separate main projects and sub-projects
    const mainProjects = allProjects.filter(p => !p.parentProjectId)
    const subProjects = allProjects.filter(p => p.parentProjectId)
    
    // Build hierarchy (main projects with their sub-projects)
    return mainProjects.map(mainProject => ({
      ...mainProject,
      // Note: We're not adding a 'children' property here to keep the interface simple
      // Frontend can build the tree structure using parentProjectId
    }))
  })
}

/**
 * Generate next project ID (PRJ-001, PRJ-002, etc.)
 */
export async function getNextProjectId(): Promise<string> {
  return withRetry(async () => {
    const row = await queryOne<{ max_id: string | null }>(
      'SELECT MAX(CAST(SUBSTRING(project_id FROM 5) AS INTEGER)) as max_id FROM projects WHERE project_id LIKE $1',
      ['PRJ-%']
    )
    
    const nextNumber = row && row.max_id ? parseInt(row.max_id) + 1 : 1
    return `PRJ-${String(nextNumber).padStart(3, '0')}`
  })
}

/**
 * Validate project hierarchy
 * Ensures that:
 * 1. Parent project exists
 * 2. Parent project is not a sub-project (2-level max)
 * 3. No circular references
 */
export async function validateHierarchy(parentProjectId: string | null): Promise<{ valid: boolean; error?: string }> {
  if (!parentProjectId) {
    return { valid: true } // Main project, no validation needed
  }
  
  return withRetry(async () => {
    // Check if parent exists
    const parent = await getProjectById(parentProjectId)
    if (!parent) {
      return { valid: false, error: 'Parent project does not exist' }
    }
    
    // Check if parent is already a sub-project (would create 3-level hierarchy)
    if (parent.parentProjectId) {
      return { valid: false, error: 'Cannot create sub-project of a sub-project (2-level maximum)' }
    }
    
    return { valid: true }
  })
}

/**
 * Create a new project
 * @param project - Project data (without project_id, it will be auto-generated)
 * @param createdBy - Employee ID of creator
 */
export async function createProject(
  project: Omit<Project, 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deletedBy'>,
  createdBy: string
): Promise<Project> {
  return withRetry(async () => {
    // Validate hierarchy if parent is specified
    if (project.parentProjectId) {
      const validation = await validateHierarchy(project.parentProjectId)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }
    
    // Generate next project ID
    const project_id = await getNextProjectId()

    // Insert project
    await query<any>(
      `INSERT INTO projects (
        project_id, project_name, parent_project_id, description, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        project_id,
        project.projectName,
        project.parentProjectId || null,
        project.description || null,
        project.status || 'Active',
        createdBy
      ]
    )

    // Retrieve and return the created project
    const createdProject = await getProjectById(project_id, true)
    if (!createdProject) {
      throw new Error('Failed to retrieve created project')
    }
    return createdProject
  })
}

/**
 * Update project
 * @param projectId - Project ID to update
 * @param updates - Fields to update
 * @param updatedBy - Employee ID of who is updating
 */
export async function updateProject(
  projectId: string,
  updates: Partial<Omit<Project, 'projectId' | 'createdAt' | 'updatedAt' | 'createdBy'>>,
  updatedBy: string
): Promise<Project> {
  return withRetry(async () => {
    // Validate hierarchy if parent is being changed
    if (updates.parentProjectId !== undefined) {
      const validation = await validateHierarchy(updates.parentProjectId || null)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }

    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    // Build dynamic UPDATE query
    if (updates.projectName !== undefined) {
      fields.push(`project_name = $${paramIndex++}`)
      values.push(updates.projectName)
    }
    if (updates.parentProjectId !== undefined) {
      fields.push(`parent_project_id = $${paramIndex++}`)
      values.push(updates.parentProjectId || null)
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`)
      values.push(updates.description || null)
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`)
      values.push(updates.status)
    }

    if (fields.length === 0) {
      // No updates, just return current project
      const project = await getProjectById(projectId, true)
      if (!project) throw new Error('Project not found')
      return project
    }

    values.push(projectId)
    await query(
      `UPDATE projects SET ${fields.join(', ')} WHERE project_id = $${paramIndex}`,
      values
    )

    const updatedProject = await getProjectById(projectId, true)
    if (!updatedProject) {
      throw new Error('Failed to retrieve updated project')
    }
    return updatedProject
  })
}

/**
 * Soft delete project
 * Marks project as deleted instead of physically removing it
 * @param projectId - Project ID to delete
 * @param deletedBy - Employee ID of who is deleting
 */
export async function softDeleteProject(project_id: string, deletedBy: string): Promise<boolean> {
  return withRetry(async () => {
    // Check if project has sub-projects
    const subProjects = await getSubProjects(project_id)
    if (subProjects.length > 0) {
      throw new Error('Cannot delete project with sub-projects. Delete sub-projects first.')
    }

    const result = await query<any>(
      `UPDATE projects
       SET status = 'Deleted', deleted_at = NOW(), deleted_by = $1
       WHERE project_id = $2`,
      [deletedBy, project_id]
    )

    return result.affectedRows > 0
  })
}

/**
 * Restore soft-deleted project (admin only)
 * @param projectId - Project ID to restore
 */
export async function restoreProject(project_id: string): Promise<boolean> {
  return withRetry(async () => {
    const result = await query<any>(
      `UPDATE projects
       SET status = 'Active', deleted_at = NULL, deleted_by = NULL
       WHERE project_id = $1`,
      [project_id]
    )

    return result.affectedRows > 0
  })
}

