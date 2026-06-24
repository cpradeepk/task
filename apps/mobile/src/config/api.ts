/**
 * API Configuration
 * Centralized API endpoint configuration for the mobile app
 */

// API URL auto-toggled based on build type (local dev vs production release).
// The production base URL has been updated to 'https://task.amtariksha.com'
// because the previous host ('https://task.karmayog.com') is inactive/dead.
// By default, __DEV__ is also pointed to the live server for testing stability;
// you can toggle the __DEV__ line to 'http://localhost:3000' to test against a local server
// running via ADB port forwarding (adb reverse tcp:3000 tcp:3000).
export const API_BASE_URL = __DEV__
  ? 'https://task.amtariksha.com' 
  : 'https://task.amtariksha.com'

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
  BUG_SUBTASKS: '/api/bugs/subtasks',
  BUG_SUBTASK_BY_ID: (id: number) => `/api/bugs/subtasks/${id}`,

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

