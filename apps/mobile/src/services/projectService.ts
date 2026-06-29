/**
 * Project Service
 * API calls for project and subproject management
 * Updated: GraphQL with REST fallback
 */

import { get, put, ApiResponse } from './apiClient'
import { API_ENDPOINTS } from '../config/api'
import { executeGraphQLWithFallback } from './graphqlClient'
import { QUERIES } from './graphqlQueries'
import { ReleaseChecklistTemplate } from '../types'

export interface Project {
  projectId: string
  projectName: string
  description?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  releaseEnabled?: boolean
  releaseChecklist?: ReleaseChecklistTemplate | null
}

export interface Subproject {
  subprojectId: string
  subprojectName: string
  projectId: string
  description?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  releaseEnabled?: boolean
  releaseChecklist?: ReleaseChecklistTemplate | null
}

export interface ProjectHierarchy {
  projectId: string
  projectName: string
  subprojects: Subproject[]
}

/**
 * Get all projects (GraphQL with REST fallback)
 */
export const getAllProjects = async (): Promise<ApiResponse<Project[]>> => {
  return executeGraphQLWithFallback<Project[]>(
    QUERIES.GET_PROJECTS,
    {},
    () => get<Project[]>(API_ENDPOINTS.PROJECTS),
    'ProjectService.getAllProjects'
  ).then(response => {
    if (response.success && response.data) {
      // GraphQL returns projects directly, REST returns { data: projects }
      const projects = Array.isArray(response.data) ? response.data : (response.data as any).projects || []
      return { success: true, data: projects }
    }
    return response
  })
}

/**
 * Get project hierarchy (projects with their subprojects)
 */
export const getProjectHierarchy = async (): Promise<
  ApiResponse<ProjectHierarchy[]>
> => {
  return get<ProjectHierarchy[]>(API_ENDPOINTS.PROJECT_HIERARCHY)
}

/**
 * Get a single project/sub-project by ID over REST.
 *
 * Returns the full record including `releaseEnabled` / `releaseChecklist`,
 * which the hierarchy/list endpoints may not carry. Used by the create-bug
 * screen to read a sub-project's release config + checklist template, and by
 * the project detail screen.
 */
export const getProjectById = async (
  projectId: string
): Promise<ApiResponse<any>> => {
  const response = await get<any>(API_ENDPOINTS.PROJECT_BY_ID(projectId))
  if (response.success && response.data) {
    const project = (response.data as any).project ?? response.data
    return { success: true, data: project }
  }
  return response
}

/**
 * Update a project/sub-project (REST PUT). Used to persist release config
 * (releaseEnabled / releaseChecklist) and standard fields.
 */
export const updateProject = async (
  projectId: string,
  updates: Record<string, any>
): Promise<ApiResponse<any>> => {
  return put<any>(API_ENDPOINTS.PROJECT_BY_ID(projectId), updates)
}

