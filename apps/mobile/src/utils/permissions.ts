import { User } from '../services/userService'

// Define all available tabs in the application
// Order here determines order in the User Edit modal's permission grid
export const AVAILABLE_TABS = [
    { key: 'home', label: 'Home' },
    { key: 'feed', label: 'Feed' },
    { key: 'attendance_dashboard', label: 'Attendance Dashboard' },
    { key: 'projects', label: 'Projects' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'bugs', label: 'Development' },
    { key: 'your_work', label: 'Your Work' },
    { key: 'team_tasks', label: 'Team Tasks' },
    { key: 'user_management', label: 'User Management' },
    { key: 'feed_topics', label: 'Feed Topics' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'settings', label: 'Settings' },
    { key: 'deleted_items', label: 'Deleted Items' },
    { key: 'reports', label: 'Reports' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'leaves', label: 'Leaves' },
    { key: 'wfh', label: 'WFH' }
]

// Define default permissions for each role
// Migration 040 reconciles existing user records with these keys.
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    'amtarikshian': [
        'home', 'feed', 'tasks', 'bugs', 'your_work',
        'attendance', 'leaves', 'wfh'
    ],
    'management': [
        'home', 'feed', 'tasks', 'bugs', 'your_work', 'team_tasks',
        'attendance', 'leaves', 'wfh', 'user_management', 'projects'
    ],
    'top_management': [
        'home', 'feed', 'tasks', 'bugs', 'your_work', 'team_tasks',
        'attendance', 'leaves', 'wfh', 'user_management', 'settings',
        'reports', 'projects', 'approvals', 'attendance_dashboard'
    ],
    'admin': [
        'home', 'feed', 'tasks', 'bugs', 'your_work', 'team_tasks',
        'attendance', 'leaves', 'wfh', 'user_management', 'settings',
        'reports', 'projects', 'approvals', 'attendance_dashboard',
        'feed_topics', 'deleted_items'
    ]
}

/**
 * Check if a user has access to a specific tab
 * Prioritizes user-specific tabPermissions over role-based defaults
 */
export function hasTabAccess(user: User | null | undefined, tab: string): boolean {
    if (!user) return false

    // Check for user-specific overrides first
    if (user.tabPermissions && user.tabPermissions.length > 0) {
        return user.tabPermissions.includes(tab)
    }

    // Fallback to role-based permissions
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || []
    return rolePermissions.includes(tab)
}

/**
 * Get all tabs accessible to a user
 */
export function getUserAccessibleTabs(user: User | null | undefined): string[] {
    if (!user) return []

    // Return user-specific overrides if they exist
    if (user.tabPermissions && user.tabPermissions.length > 0) {
        return [...user.tabPermissions]
    }

    // Return role-based permissions
    return DEFAULT_ROLE_PERMISSIONS[user.role] || []
}

/**
 * Check if a user can manage (create/edit) projects
 */
export function canManageProjects(user: User | null | undefined): boolean {
    if (!user) return false
    const role = user.role?.toLowerCase()
    return role === 'admin' || role === 'top_management' || role === 'management'
}

/**
 * Check if a user can delete projects
 */
export function canDeleteProjects(user: User | null | undefined): boolean {
    if (!user) return false
    const role = user.role?.toLowerCase()
    return role === 'admin' || role === 'top_management'
}
