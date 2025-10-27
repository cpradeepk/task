// Shared API client functions for web and mobile apps
// These functions handle all communication with the backend API

const API_BASE_URL = typeof window !== 'undefined' 
  ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface FetchOptions {
  token?: string
  method?: string
  body?: any
}

async function apiCall(endpoint: string, options: FetchOptions = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

// ============ Auth API ============
export async function login(employeeId: string, password: string) {
  return apiCall('/api/auth/login', {
    method: 'POST',
    body: { employeeId, password }
  })
}

// ============ Users API ============
export async function getUsers(token?: string) {
  return apiCall('/api/users', { token })
}

export async function getUserById(employeeId: string, token?: string) {
  return apiCall(`/api/users/${employeeId}`, { token })
}

export async function createUser(userData: any, token?: string) {
  return apiCall('/api/users', {
    method: 'POST',
    body: userData,
    token
  })
}

export async function updateUser(employeeId: string, userData: any, token?: string) {
  return apiCall(`/api/users/${employeeId}`, {
    method: 'PUT',
    body: userData,
    token
  })
}

export async function getTeamMembers(managerId: string, token?: string) {
  return apiCall(`/api/users/team/${managerId}`, { token })
}

// ============ Tasks API ============
export async function getTasks(token?: string) {
  return apiCall('/api/tasks', { token })
}

export async function getUserTasks(employeeId: string, token?: string) {
  return apiCall(`/api/tasks/user/${employeeId}`, { token })
}

export async function getTaskById(taskId: string, token?: string) {
  return apiCall(`/api/tasks/${taskId}`, { token })
}

export async function createTask(taskData: any, token?: string) {
  return apiCall('/api/tasks', {
    method: 'POST',
    body: taskData,
    token
  })
}

export async function updateTask(taskId: string, taskData: any, token?: string) {
  return apiCall(`/api/tasks/${taskId}`, {
    method: 'PUT',
    body: taskData,
    token
  })
}

export async function deleteTask(taskId: string, token?: string) {
  return apiCall(`/api/tasks/${taskId}`, {
    method: 'DELETE',
    token
  })
}

export async function getSupportTasks(token?: string) {
  return apiCall('/api/tasks/support', { token })
}

// ============ Bugs API ============
export async function getBugs(token?: string) {
  return apiCall('/api/bugs', { token })
}

export async function getBugById(bugId: string, token?: string) {
  return apiCall(`/api/bugs/${bugId}`, { token })
}

export async function createBug(bugData: any, token?: string) {
  return apiCall('/api/bugs', {
    method: 'POST',
    body: bugData,
    token
  })
}

export async function updateBug(bugId: string, bugData: any, token?: string) {
  return apiCall(`/api/bugs/${bugId}`, {
    method: 'PUT',
    body: bugData,
    token
  })
}

export async function deleteBug(bugId: string, token?: string) {
  return apiCall(`/api/bugs/${bugId}`, {
    method: 'DELETE',
    token
  })
}

export async function getBugComments(bugId: string, token?: string) {
  return apiCall(`/api/bugs/${bugId}/comments`, { token })
}

export async function addBugComment(bugId: string, comment: any, token?: string) {
  return apiCall(`/api/bugs/${bugId}/comments`, {
    method: 'POST',
    body: comment,
    token
  })
}

// ============ Leaves API ============
export async function getLeaves(token?: string) {
  return apiCall('/api/leaves', { token })
}

export async function getUserLeaves(employeeId: string, token?: string) {
  return apiCall(`/api/leaves/user/${employeeId}`, { token })
}

export async function createLeave(leaveData: any, token?: string) {
  return apiCall('/api/leaves', {
    method: 'POST',
    body: leaveData,
    token
  })
}

export async function updateLeave(leaveId: string, leaveData: any, token?: string) {
  return apiCall(`/api/leaves/${leaveId}`, {
    method: 'PUT',
    body: leaveData,
    token
  })
}

export async function approveLeave(leaveId: string, token?: string) {
  return apiCall('/api/leaves/approve', {
    method: 'POST',
    body: { leaveId },
    token
  })
}

export async function rejectLeave(leaveId: string, token?: string) {
  return apiCall('/api/leaves/reject', {
    method: 'POST',
    body: { leaveId },
    token
  })
}

// ============ WFH API ============
export async function getWFH(token?: string) {
  return apiCall('/api/wfh', { token })
}

export async function getUserWFH(employeeId: string, token?: string) {
  return apiCall(`/api/wfh/user/${employeeId}`, { token })
}

export async function createWFH(wfhData: any, token?: string) {
  return apiCall('/api/wfh', {
    method: 'POST',
    body: wfhData,
    token
  })
}

export async function updateWFH(wfhId: string, wfhData: any, token?: string) {
  return apiCall(`/api/wfh/${wfhId}`, {
    method: 'PUT',
    body: wfhData,
    token
  })
}

export async function approveWFH(wfhId: string, token?: string) {
  return apiCall('/api/wfh/approve', {
    method: 'POST',
    body: { wfhId },
    token
  })
}

export async function rejectWFH(wfhId: string, token?: string) {
  return apiCall('/api/wfh/reject', {
    method: 'POST',
    body: { wfhId },
    token
  })
}

// ============ Projects API ============
export async function getProjects(token?: string) {
  return apiCall('/api/projects', { token })
}

export async function getProjectById(projectId: string, token?: string) {
  return apiCall(`/api/projects/${projectId}`, { token })
}

export async function createProject(projectData: any, token?: string) {
  return apiCall('/api/projects', {
    method: 'POST',
    body: projectData,
    token
  })
}

export async function updateProject(projectId: string, projectData: any, token?: string) {
  return apiCall(`/api/projects/${projectId}`, {
    method: 'PUT',
    body: projectData,
    token
  })
}

export async function deleteProject(projectId: string, token?: string) {
  return apiCall(`/api/projects/${projectId}`, {
    method: 'DELETE',
    token
  })
}

export async function getProjectHierarchy(token?: string) {
  return apiCall('/api/projects/hierarchy', { token })
}

// ============ Settings API ============
export async function getSettings(token?: string) {
  return apiCall('/api/settings', { token })
}

export async function getSettingsByType(type: string, token?: string) {
  return apiCall(`/api/settings?type=${type}`, { token })
}

export async function createSetting(settingData: any, token?: string) {
  return apiCall('/api/settings', {
    method: 'POST',
    body: settingData,
    token
  })
}

export async function updateSetting(settingId: string, settingData: any, token?: string) {
  return apiCall(`/api/settings/${settingId}`, {
    method: 'PUT',
    body: settingData,
    token
  })
}
