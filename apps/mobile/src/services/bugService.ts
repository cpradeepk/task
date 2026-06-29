/**
 * Bug Service
 * API calls for bug management
 * Updated: GraphQL with REST fallback
 */

import { get, post, patch, del, ApiResponse } from './apiClient'
import { API_ENDPOINTS } from '../config/api'
import { executeGraphQLWithFallback } from './graphqlClient'
import { QUERIES } from './graphqlQueries'
import { ReleaseState } from '../types'

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
  
  actualHours?: number
  // Additional fields surfaced by the web schema
  type?: 'testcase' | 'feature' | 'bug' | 'other' | 'release' | null
  releaseState?: ReleaseState | null
  expectedBehavior?: string | null
  actualBehavior?: string | null
  serverLogs?: string | null
  frontendLogs?: string | null
  developmentPrompt?: string | null
  parentDevId?: string | null
  feature?: string | null
  startDate?: string
  endDate?: string
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
      let bug = (response.data as any).bug
      if (bug === undefined) {
        bug = response.data
      }
      
      // If bug is explicitly null (e.g. not found), return success: false or data: null
      if (bug === null) {
        return { success: false, error: 'Bug not found' }
      }
      
      return { success: true, data: bug }
    }
    return response
  })
}

/**
 * Get bug by ID over REST only.
 *
 * The GraphQL GET_BUG selection set does NOT include `releaseState`, and
 * `executeGraphQLWithFallback` only falls back to REST when GraphQL throws —
 * not when it returns a successful-but-incomplete payload. So for release
 * work-items (and anywhere we need `releaseState`) we must bypass GraphQL and
 * read the full record from the REST route, which maps `release_state`.
 */
export const getBugByIdRest = async (bugId: string): Promise<ApiResponse<Bug>> => {
  const response = await get<Bug>(API_ENDPOINTS.BUG_BY_ID(bugId))
  if (response.success && response.data) {
    // REST returns { data: bug }; some shapes nest under `bug`.
    const bug = (response.data as any).bug ?? response.data
    if (bug === null) {
      return { success: false, error: 'Bug not found' }
    }
    return { success: true, data: bug }
  }
  return response
}

/**
 * Create new bug
 */
export const createBug = async (bugData: Partial<Bug>): Promise<ApiResponse<Bug>> => {
  return post<Bug>(API_ENDPOINTS.BUGS, bugData)
}

/**
 * Persist a release work-item's checklist state (REST PATCH).
 *
 * Mirrors the web `PATCH /api/bugs/{bugId}` with `{ releaseState }`. We use REST
 * directly (not the UPDATE_BUG GraphQL mutation, which neither accepts nor
 * returns `releaseState`).
 */
export const updateBugReleaseState = async (
  bugId: string,
  releaseState: ReleaseState
): Promise<ApiResponse<Bug>> => {
  return patch<Bug>(API_ENDPOINTS.BUG_BY_ID(bugId), { releaseState })
}

/**
 * Fetch completed (Resolved/Closed) bugs since the last release for a
 * sub-project — used to pre-fill the "bugs solved in this release" list.
 */
export const getCompletedBugsForRelease = async (
  subprojectId: string
): Promise<ApiResponse<Bug[]>> => {
  const response = await get<Bug[]>(
    `${API_ENDPOINTS.BUGS_COMPLETED_FOR_RELEASE}?subprojectId=${encodeURIComponent(subprojectId)}`
  )
  if (response.success && response.data) {
    const bugs = Array.isArray(response.data)
      ? response.data
      : (response.data as any).data || []
    return { success: true, data: bugs }
  }
  return response
}

/**
 * Update bug
 */
export const updateBug = async (
  bugId: string,
  updates: Partial<Bug>
): Promise<ApiResponse<Bug>> => {
  const result = await executeGraphQLWithFallback<any>(
    QUERIES.UPDATE_BUG,
    { bugId, input: updates },
    async () => patch<Bug>(API_ENDPOINTS.BUG_BY_ID(bugId), updates)
  )
  
  if (result.success && result.data && result.data.updateBug) {
    return { success: true, data: result.data.updateBug }
  }
  return result as ApiResponse<Bug>
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
    commentText: comment,
    commentedBy: userId,
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
  
): Promise<ApiResponse<void>> => {
  return post(API_ENDPOINTS.TIME_TRACKING_SYNC, {
    itemId: bugId,
    itemType: 'bug',
    
  })
}

