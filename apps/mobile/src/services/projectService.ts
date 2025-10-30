/**
 * Project Service
 * API calls for project and subproject management
 */

import { get, ApiResponse } from './apiClient'
import { API_ENDPOINTS } from '../config/api'

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
 * Get all projects
 */
export const getAllProjects = async (): Promise<ApiResponse<Project[]>> => {
  return get<Project[]>(API_ENDPOINTS.PROJECTS)
}

/**
 * Get project hierarchy (projects with their subprojects)
 */
export const getProjectHierarchy = async (): Promise<
  ApiResponse<ProjectHierarchy[]>
> => {
  return get<ProjectHierarchy[]>(API_ENDPOINTS.PROJECT_HIERARCHY)
}

