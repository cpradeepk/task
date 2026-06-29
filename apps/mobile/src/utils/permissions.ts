/**
 * Permission helpers (mobile)
 *
 * Mirrors apps/web/src/lib/permissions.ts so the mobile app grants the same
 * access. A user's explicit `tabPermissions` override the role defaults; when
 * absent we fall back to the role-based map (preserving prior behavior).
 */
import { User } from '../types'

/** Default tab access per role (kept in sync with the web app). */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  amtarikshian: [
    'home', 'feed', 'tasks', 'bugs', 'your_work',
    'attendance', 'leaves', 'wfh',
  ],
  management: [
    'home', 'feed', 'tasks', 'bugs', 'your_work', 'team_tasks',
    'attendance', 'leaves', 'wfh', 'user_management', 'projects',
  ],
  top_management: [
    'home', 'feed', 'tasks', 'bugs', 'your_work', 'team_tasks',
    'attendance', 'leaves', 'wfh', 'user_management', 'settings',
    'reports', 'projects', 'approvals', 'attendance_dashboard',
  ],
  admin: [
    'home', 'feed', 'tasks', 'bugs', 'your_work', 'team_tasks',
    'attendance', 'leaves', 'wfh', 'user_management', 'settings',
    'reports', 'projects', 'approvals', 'attendance_dashboard',
    'feed_topics', 'deleted_items',
  ],
}

/**
 * Whether a user has access to a given tab. Prioritizes user-specific
 * `tabPermissions` over role-based defaults.
 */
export function hasTabAccess(user: User | null | undefined, tab: string): boolean {
  if (!user) return false
  if (user.tabPermissions && user.tabPermissions.length > 0) {
    return user.tabPermissions.includes(tab)
  }
  const role = (user.role || '').toLowerCase()
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || []
  return rolePermissions.includes(tab)
}

/**
 * Can the user create/edit projects & sub-projects?
 * Granted to anyone with `projects` tab access (mirrors the web change), plus
 * admin / top_management and the AM-0001 super-user.
 */
export function canManageProjects(user: User | null | undefined): boolean {
  if (!user) return false
  const role = (user.role || '').toLowerCase()
  return (
    hasTabAccess(user, 'projects') ||
    role === 'admin' ||
    role === 'top_management' ||
    user.employeeId === 'AM-0001'
  )
}

/** Deleting projects remains admin-only. */
export function canDeleteProjects(user: User | null | undefined): boolean {
  return (user?.role || '').toLowerCase() === 'admin'
}
