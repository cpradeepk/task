/**
 * API Configuration
 * Centralized API endpoint configuration for the mobile app
 */

/**
 * API Base URL configuration.
 * Auto-toggles or matches the production API target.
 * 
 * @constant
 * @type {string}
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

/**
 * Centralized registry of all REST and GraphQL API endpoints.
 * Includes static paths as well as dynamic path-builder functions.
 * 
 * @constant
 * @type {object}
 */
export const API_ENDPOINTS = {
  /**
   * GraphQL endpoint (used by Apollo Client)
   */
  GRAPHQL: '/api/graphql',

  /**
   * Authentication endpoints
   */
  LOGIN: '/api/auth/login',

  /**
   * User management endpoints
   */
  USERS: '/api/users',
  /**
   * Generates endpoint to fetch or modify a specific user by employee ID.
   * @param {string} employeeId - Unique identifier of the employee
   * @returns {string} Relative API path
   */
  USER_BY_ID: (employeeId: string) => `/api/users/${employeeId}`,

  /**
   * Bug reporting and tracking endpoints
   */
  BUGS: '/api/bugs',
  /**
   * Generates endpoint to fetch, modify, or delete a specific bug.
   * @param {string} bugId - Unique identifier of the bug
   * @returns {string} Relative API path
   */
  BUG_BY_ID: (bugId: string) => `/api/bugs/${bugId}`,
  /**
   * Generates endpoint to fetch or post comments on a specific bug.
   * @param {string} bugId - Unique identifier of the bug
   * @returns {string} Relative API path
   */
  BUG_COMMENTS: (bugId: string) => `/api/bugs/${bugId}/comments`,

  /**
   * Bug checklist/subtask endpoints
   */
  BUG_SUBTASKS: '/api/bugs/subtasks',
  /**
   * Generates endpoint to update or delete a specific bug subtask.
   * @param {number} id - Subtask ID
   * @returns {string} Relative API path
   */
  BUG_SUBTASK_BY_ID: (id: number) => `/api/bugs/subtasks/${id}`,

  /**
   * Project management endpoints
   */
  PROJECTS: '/api/projects',
  /**
   * Fetches hierarchical parent-child relationships of active projects
   */
  PROJECT_HIERARCHY: '/api/projects/hierarchy',

  /**
   * Application settings and dropdown configuration values
   */
  SETTINGS: '/api/settings',

  /**
   * Task management endpoints
   */
  TASKS: '/api/tasks',
  /**
   * Generates endpoint to fetch, update, or delete a specific task.
   * @param {string} taskId - Unique identifier of the task
   * @returns {string} Relative API path
   */
  TASK_BY_ID: (taskId: string) => `/api/tasks/${taskId}`,
  /**
   * Generates endpoint to fetch all tasks assigned to a specific employee.
   * @param {string} employeeId - Unique identifier of the employee
   * @returns {string} Relative API path
   */
  TASKS_BY_EMPLOYEE: (employeeId: string) => `/api/tasks/user/${employeeId}`,

  /**
   * Task checklist/subtask endpoints
   */
  TASK_SUBTASKS: '/api/subtasks',
  /**
   * Generates endpoint to update or delete a specific task subtask.
   * @param {number} id - Subtask ID
   * @returns {string} Relative API path
   */
  TASK_SUBTASK_BY_ID: (id: number) => `/api/subtasks/${id}`,

  /**
   * Time tracking and synchronization endpoints
   */
  TIME_TRACKING_SYNC: '/api/time-tracking/sync',

  /**
   * File upload and S3 presigned URL generation endpoints
   */
  UPLOAD_PRESIGNED_URL: '/api/upload/presigned-url',
}

/**
 * Constructs a fully qualified absolute API URL from a relative endpoint path.
 * Automatically prepends the active `API_BASE_URL`.
 * 
 * @param {string} endpoint - The relative endpoint path (e.g. from `API_ENDPOINTS`)
 * @returns {string} The complete absolute URL (e.g. 'https://task.amtariksha.com/api/tasks')
 * 
 * @example
 * const url = buildApiUrl(API_ENDPOINTS.USERS);
 * // returns 'https://task.amtariksha.com/api/users'
 */
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`
}

