import { User } from './types'

// Define all available tabs in the application
// Define all available tabs in the application
export const AVAILABLE_TABS = [
    { key: 'home', label: 'Home' },
    { key: 'feed', label: 'Feed' },
    { key: 'attendance_dashboard', label: 'Attendance Dashboard' }, // New for Admin
    { key: 'projects', label: 'Projects' },
    { key: 'master_tasks', label: 'Master Tasks' },
    { key: 'master_development', label: 'Master Development' },
    { key: 'user_management', label: 'User Management' },
    { key: 'feed_topics', label: 'Feed Topics' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'settings', label: 'Settings' },
    { key: 'deleted_items', label: 'Deleted Items' },
    { key: 'reports', label: 'Reports' },
    { key: 'users', label: 'Users' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'leaves', label: 'Leaves' },
    { key: 'wfh', label: 'WFH' }
]

// Define default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    'amtarikshian': ['home', 'feed', 'tasks', 'bugs', 'attendance', 'leaves', 'wfh'],
    'management': ['home', 'feed', 'tasks', 'bugs', 'attendance', 'leaves', 'wfh', 'users'],
    'top_management': ['home', 'feed', 'tasks', 'bugs', 'attendance', 'leaves', 'wfh', 'users', 'settings', 'reports', 'projects'],
    'admin': ['home', 'feed', 'tasks', 'bugs', 'attendance', 'users', 'leaves', 'wfh', 'settings', 'attendance_dashboard', 'projects', 'master_tasks', 'master_development', 'user_management', 'feed_topics', 'approvals', 'deleted_items', 'reports']
}

/**
 * Check if a user has access to a specific tab
 * Prioritizes user-specific tabPermissions over role-based defaults
 */
export function hasTabAccess(user: User | null | undefined, tab: string): boolean {
    if (!user) return false

    // System admins have access to everything
    if (user.isSystemAdmin === 1) return true

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

    // System admins have access to all tabs
    if (user.isSystemAdmin === 1) return AVAILABLE_TABS.map(t => t.key)

    // Return user-specific overrides if they exist
    if (user.tabPermissions && user.tabPermissions.length > 0) {
        return [...user.tabPermissions]
    }

    // Return role-based permissions
    return DEFAULT_ROLE_PERMISSIONS[user.role] || []
}
