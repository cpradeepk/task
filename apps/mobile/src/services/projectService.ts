/**
 * Project Service
 * API calls for project and subproject management
 * Updated: GraphQL with REST fallback
 */

import { get, ApiResponse } from './apiClient'
import { API_ENDPOINTS } from '../config/api'
import { executeGraphQLWithFallback } from './graphqlClient'
import { QUERIES } from './graphqlQueries'

export interface Project {
  projectId: string
  projectName: string
  description?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Subproject {
  subprojectId: string
  subprojectName: string
  projectId: string
  description?: string
  createdBy: string
  createdAt: string
  updatedAt: string
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

