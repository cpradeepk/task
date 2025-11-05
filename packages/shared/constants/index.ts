// Shared constants for web and mobile apps

// ============ User Roles ============
export const USER_ROLES = {
  ADMIN: 'admin',
  TOP_MANAGEMENT: 'top_management',
  MANAGEMENT: 'management',
  EMPLOYEE: 'employee'
} as const

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  'admin': 'Administrator',
  'top_management': 'Top Management',
  'management': 'Management',
  'employee': 'Employee'
}

// ============ Task Status ============
export const TASK_STATUSES = [
  'Yet to Start',
  'In Progress',
  'Done',
  'Delayed',
  'Hold',
  'Cancel',
  'ReOpened',
  'Stop'
] as const

export const TASK_STATUS_COLORS: Record<string, string> = {
  'Yet to Start': '#9CA3AF',
  'In Progress': '#3B82F6',
  'Done': '#10B981',
  'Delayed': '#EF4444',
  'Hold': '#F59E0B',
  'Cancel': '#6B7280',
  'ReOpened': '#EF4444',
  'Stop': '#6B7280'
}

// ============ Task Priority ============
export const TASK_PRIORITIES = [
  'U&I',    // Urgent & Important
  'NU&I',   // Not Urgent & Important
  'U&NI',   // Urgent & Not Important
  'NU&NI'   // Not Urgent & Not Important
] as const

export const PRIORITY_DISPLAY_NAMES: Record<string, string> = {
  'U&I': 'Urgent & Important',
  'NU&I': 'Not Urgent & Important',
  'NI&U': 'Not Important & Urgent',
  'NU&NI': 'Not Urgent & Not Important'
}

export const PRIORITY_COLORS: Record<string, string> = {
  'U&I': '#EF4444',
  'NU&I': '#F59E0B',
  'U&NI': '#FBBF24',
  'NU&NI': '#10B981'
}

// ============ Bug Status ============
export const BUG_STATUSES = [
  'New',
  'In Progress',
  'Resolved',
  'Closed',
  'Reopened'
] as const

export const BUG_STATUS_COLORS: Record<string, string> = {
  'New': '#3B82F6',
  'In Progress': '#F59E0B',
  'Resolved': '#10B981',
  'Closed': '#6B7280',
  'Reopened': '#EF4444'
}

// ============ Bug Severity ============
export const BUG_SEVERITIES = [
  'Critical',
  'Major',
  'Minor'
] as const

export const SEVERITY_COLORS: Record<string, string> = {
  'Critical': '#EF4444',
  'Major': '#F59E0B',
  'Minor': '#FBBF24'
}

// ============ Leave Status ============
export const LEAVE_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled'
] as const

export const LEAVE_STATUS_COLORS: Record<string, string> = {
  'Pending': '#F59E0B',
  'Approved': '#10B981',
  'Rejected': '#EF4444',
  'Cancelled': '#6B7280'
}

// ============ Leave Types ============
export const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Earned Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Unpaid Leave'
] as const

// ============ WFH Status ============
export const WFH_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled'
] as const

export const WFH_STATUS_COLORS: Record<string, string> = {
  'Pending': '#F59E0B',
  'Approved': '#10B981',
  'Rejected': '#EF4444',
  'Cancelled': '#6B7280'
}

// ============ User Status ============
export const USER_STATUSES = [
  'active',
  'inactive'
] as const

export const USER_STATUS_COLORS: Record<string, string> = {
  'active': '#10B981',
  'inactive': '#6B7280'
}

// ============ Date Formats ============
export const DATE_FORMATS = {
  SHORT: 'DD/MM/YYYY',
  LONG: 'DD MMM YYYY',
  FULL: 'DD MMM YYYY, HH:mm',
  ISO: 'YYYY-MM-DD'
} as const

// ============ API Endpoints ============
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login'
  },
  USERS: {
    LIST: '/api/users',
    GET: (id: string) => `/api/users/${id}`,
    CREATE: '/api/users',
    UPDATE: (id: string) => `/api/users/${id}`,
    TEAM: (managerId: string) => `/api/users/team/${managerId}`
  },
  TASKS: {
    LIST: '/api/tasks',
    GET: (id: string) => `/api/tasks/${id}`,
    CREATE: '/api/tasks',
    UPDATE: (id: string) => `/api/tasks/${id}`,
    DELETE: (id: string) => `/api/tasks/${id}`,
    USER: (employeeId: string) => `/api/tasks/user/${employeeId}`,
    SUPPORT: '/api/tasks/support'
  },
  BUGS: {
    LIST: '/api/bugs',
    GET: (id: string) => `/api/bugs/${id}`,
    CREATE: '/api/bugs',
    UPDATE: (id: string) => `/api/bugs/${id}`,
    DELETE: (id: string) => `/api/bugs/${id}`,
    COMMENTS: (id: string) => `/api/bugs/${id}/comments`
  },
  LEAVES: {
    LIST: '/api/leaves',
    CREATE: '/api/leaves',
    UPDATE: (id: string) => `/api/leaves/${id}`,
    USER: (employeeId: string) => `/api/leaves/user/${employeeId}`,
    APPROVE: '/api/leaves/approve',
    REJECT: '/api/leaves/reject'
  },
  WFH: {
    LIST: '/api/wfh',
    CREATE: '/api/wfh',
    UPDATE: (id: string) => `/api/wfh/${id}`,
    USER: (employeeId: string) => `/api/wfh/user/${employeeId}`,
    APPROVE: '/api/wfh/approve',
    REJECT: '/api/wfh/reject'
  },
  PROJECTS: {
    LIST: '/api/projects',
    GET: (id: string) => `/api/projects/${id}`,
    CREATE: '/api/projects',
    UPDATE: (id: string) => `/api/projects/${id}`,
    DELETE: (id: string) => `/api/projects/${id}`,
    HIERARCHY: '/api/projects/hierarchy'
  }
} as const

// ============ Pagination ============
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100
} as const

// ============ Validation Rules ============
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_NAME_LENGTH: 255,
  MAX_EMAIL_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 5000
} as const

// ============ Error Messages ============
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid employee ID or password',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.'
} as const

// ============ Success Messages ============
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  CREATE_SUCCESS: 'Created successfully',
  UPDATE_SUCCESS: 'Updated successfully',
  DELETE_SUCCESS: 'Deleted successfully',
  APPROVE_SUCCESS: 'Approved successfully',
  REJECT_SUCCESS: 'Rejected successfully'
} as const
