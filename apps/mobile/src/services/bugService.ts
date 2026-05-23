/**
 * Bug Service
 * API calls for bug management
 * Updated: GraphQL with REST fallback
 */

import { get, post, patch, del, ApiResponse } from './apiClient'
import { API_ENDPOINTS } from '../config/api'
import { executeGraphQLWithFallback } from './graphqlClient'
import { QUERIES } from './graphqlQueries'

export interface Bug {
  bugId: string
  title: string
  description: string
  severity: string
  priority: string
  status: string
  category: string
  platform: string
  reportedBy: string
  assignedTo: string
  projectId: string
  subprojectId: string
  environment?: string
  browser?: string
  device?: string
  relatedBugs?: string
  attachments?: string
  videoUrl?: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  closedAt?: string
  timerTotalTime?: number
  actualHours?: number
  // Additional fields surfaced by the web schema
  type?: 'testcase' | 'feature' | 'bug' | 'other' | null
  expectedBehavior?: string | null
  actualBehavior?: string | null
  serverLogs?: string | null
  frontendLogs?: string | null
  developmentPrompt?: string | null
  parentDevId?: string | null
  feature?: string | null
}

export interface BugComment {
  id: number
  bugId: string
  userId: string
  comment: string
  createdAt: string
}

export interface BugSubTask {
  id: number
  parentBugId: string
  description: string
  assignedTo: string
  status: 'Not Started' | 'In Progress' | 'Completed'
  isCompleted: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

/**
 * Get all bugs (GraphQL with REST fallback)
 */
export const getAllBugs = async (): Promise<ApiResponse<Bug[]>> => {
  return executeGraphQLWithFallback<Bug[]>(
    QUERIES.GET_BUGS,
    {},
    () => get<Bug[]>(API_ENDPOINTS.BUGS),
    'BugService.getAllBugs'
  ).then(response => {
    if (response.success && response.data) {
      // GraphQL returns bugs directly, REST returns { data: bugs }
      const bugs = Array.isArray(response.data) ? response.data : (response.data as any).bugs || []
      return { success: true, data: bugs }
    }
    return response
  })
}

/**
 * Get bug by ID (GraphQL with REST fallback)
 */
export const getBugById = async (bugId: string): Promise<ApiResponse<Bug>> => {
  return executeGraphQLWithFallback<Bug>(
    QUERIES.GET_BUG,
    { bugId },
    () => get<Bug>(API_ENDPOINTS.BUG_BY_ID(bugId)),
    'BugService.getBugById'
  ).then(response => {
    if (response.success && response.data) {
      // GraphQL returns bug directly, REST returns { data: bug }
      const bug = (response.data as any).bug || response.data
      return { success: true, data: bug }
    }
    return response
  })
}

/**
 * Create new bug
 */
export const createBug = async (bugData: Partial<Bug>): Promise<ApiResponse<Bug>> => {
  return post<Bug>(API_ENDPOINTS.BUGS, bugData)
}

/**
 * Update bug
 */
export const updateBug = async (
  bugId: string,
  updates: Partial<Bug>
): Promise<ApiResponse<Bug>> => {
  return patch<Bug>(API_ENDPOINTS.BUG_BY_ID(bugId), updates)
}

/**
 * Get bug comments
 */
export const getBugComments = async (
  bugId: string
): Promise<ApiResponse<BugComment[]>> => {
  return get<BugComment[]>(API_ENDPOINTS.BUG_COMMENTS(bugId))
}

/**
 * Add bug comment
 */
export const addBugComment = async (
  bugId: string,
  comment: string,
  userId: string
): Promise<ApiResponse<BugComment>> => {
  return post<BugComment>(API_ENDPOINTS.BUG_COMMENTS(bugId), {
    comment,
    userId,
  })
}

/**
 * Get bug subtasks
 */
export const getBugSubtasks = async (
  parentBugId: string
): Promise<ApiResponse<{ data: BugSubTask[]; stats: any }>> => {
  return get(`${API_ENDPOINTS.BUG_SUBTASKS}?parentBugId=${parentBugId}`)
}

/**
 * Create bug subtask
 */
export const createBugSubtask = async (
  subtaskData: Partial<BugSubTask>
): Promise<ApiResponse<BugSubTask>> => {
  return post<BugSubTask>(API_ENDPOINTS.BUG_SUBTASKS, subtaskData)
}

/**
 * Update bug subtask
 */
export const updateBugSubtask = async (
  id: number,
  updates: Partial<BugSubTask>
): Promise<ApiResponse<BugSubTask>> => {
  return patch<BugSubTask>(API_ENDPOINTS.BUG_SUBTASK_BY_ID(id), updates)
}

/**
 * Delete bug subtask
 */
export const deleteBugSubtask = async (
  id: number,
  deletedBy: string
): Promise<ApiResponse<void>> => {
  return del(`${API_ENDPOINTS.BUG_SUBTASK_BY_ID(id)}?deletedBy=${deletedBy}`)
}

/**
 * Sync timer time
 */
export const syncTimerTime = async (
  bugId: string,
  timerTotalTime: number
): Promise<ApiResponse<void>> => {
  return post(API_ENDPOINTS.TIME_TRACKING_SYNC, {
    itemId: bugId,
    itemType: 'bug',
    timerTotalTime,
  })
}

