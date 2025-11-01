/**
 * API Configuration
 * Centralized API endpoint configuration for the mobile app
 */

// Production API URL
export const API_BASE_URL = 'https://task.amtariksha.com'

// API Endpoints
export const API_ENDPOINTS = {
  // GraphQL
  GRAPHQL: '/api/graphql',

  // Auth
  LOGIN: '/api/auth/login',

  // Users
  USERS: '/api/users',
  USER_BY_ID: (employeeId: string) => `/api/users/${employeeId}`,

  // Bugs
  BUGS: '/api/bugs',
  BUG_BY_ID: (bugId: string) => `/api/bugs/${bugId}`,
  BUG_COMMENTS: (bugId: string) => `/api/bugs/${bugId}/comments`,

  // Bug Subtasks
  BUG_SUBTASKS: '/api/bug-subtasks',
  BUG_SUBTASK_BY_ID: (id: number) => `/api/bug-subtasks/${id}`,

  // Projects
  PROJECTS: '/api/projects',
  PROJECT_HIERARCHY: '/api/projects/hierarchy',

  // Settings
  SETTINGS: '/api/settings',

  // Tasks
  TASKS: '/api/tasks',
  TASK_BY_ID: (taskId: string) => `/api/tasks/${taskId}`,
  TASKS_BY_EMPLOYEE: (employeeId: string) => `/api/tasks/user/${employeeId}`,

  // Task Subtasks
  TASK_SUBTASKS: '/api/subtasks',
  TASK_SUBTASK_BY_ID: (id: number) => `/api/subtasks/${id}`,

  // Time Tracking
  TIME_TRACKING_SYNC: '/api/time-tracking/sync',

  // Upload
  UPLOAD_PRESIGNED_URL: '/api/upload/presigned-url',
}

/**
 * Build full API URL
 */
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`
}

