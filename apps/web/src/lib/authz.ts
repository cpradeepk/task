/**
 * Authorization — the single place authority is decided.
 *
 * Server-side only. Do not add 'use client'.
 *
 * Authority comes from three independent tiers. Higher tiers do not silently
 * grant lower-tier powers except where stated:
 *
 *   platform   users.is_platform_admin       manage companies; cross-company support.
 *   company    user_companies.company_role   'company_admin' may manage users,
 *                                            projects, feed topics and settings —
 *                                            ONLY within that company.
 *   project    project_users.role            'manager' | 'team_leader' | 'member'.
 *
 * Orthogonal to all three is the reporting chain (users.manager_id), which is
 * transitive: a manager can see and edit the work of everyone beneath them,
 * however many levels down.
 *
 * Before this module, authorization was ad-hoc string comparisons
 * (`role === 'admin' || role === 'top_management' || employeeId === 'AM-0001'`)
 * duplicated across pages and routes, with most API routes enforcing nothing at
 * all. Route handlers should call these helpers rather than re-deriving rules.
 */

import { getCompanyRole, isPlatformAdmin as dbIsPlatformAdmin, type CompanyRole } from './db/companies'
import { getProjectRole, isUserAssignedToProject, type ProjectRole } from './db/project-users'
import { isInManagerChain } from './db/users'
import { getProjectById } from './db/projects'

export interface Actor {
  employeeId: string
  /** Global users.role — legacy, retained for the admin/top_management shortcuts. */
  role?: string
  /** Company the current session is acting in. */
  companyId?: string | null
  isPlatformAdmin?: boolean
}

/** Legacy global roles that behave as company admins until fully migrated. */
const LEGACY_ADMIN_ROLES = ['admin', 'top_management']

function hasLegacyAdminRole(actor: Actor): boolean {
  return !!actor.role && LEGACY_ADMIN_ROLES.includes(actor.role)
}

export async function isPlatformAdmin(actor: Actor): Promise<boolean> {
  if (actor.isPlatformAdmin !== undefined) return actor.isPlatformAdmin
  return dbIsPlatformAdmin(actor.employeeId)
}

/** Is the actor a member of this company at all? */
export async function isCompanyMember(actor: Actor, companyId: string): Promise<boolean> {
  if (await isPlatformAdmin(actor)) return true
  return (await getCompanyRole(actor.employeeId, companyId)) !== null
}

/**
 * May the actor administer this company — add users, edit projects, feed topics
 * and settings? True for a company_admin of THAT company, and for platform
 * admins. Deliberately false for a company_admin of a different company.
 */
export async function canAdminCompany(actor: Actor, companyId: string): Promise<boolean> {
  if (await isPlatformAdmin(actor)) return true
  const companyRole: CompanyRole | null = await getCompanyRole(actor.employeeId, companyId)
  if (companyRole === 'company_admin') return true
  // Until every deployment has migrated off the global roles, an admin /
  // top_management user still administers a company they belong to.
  return hasLegacyAdminRole(actor) && companyRole !== null
}

/** May the actor create users in this company? */
export async function canManageUsers(actor: Actor, companyId: string): Promise<boolean> {
  return canAdminCompany(actor, companyId)
}

/** May the actor create, edit or archive this project? */
export async function canManageProject(actor: Actor, projectId: string): Promise<boolean> {
  const project = await getProjectById(projectId)
  if (!project) return false

  const companyId = (project as { companyId?: string }).companyId
  if (companyId && (await canAdminCompany(actor, companyId))) return true

  // A project manager runs their own project.
  return (await getProjectRole(projectId, actor.employeeId)) === 'manager'
}

/** May the actor see this project at all? */
export async function canViewProject(actor: Actor, projectId: string): Promise<boolean> {
  const project = await getProjectById(projectId)
  if (!project) return false

  const companyId = (project as { companyId?: string }).companyId
  if (companyId && (await canAdminCompany(actor, companyId))) return true

  return isUserAssignedToProject(projectId, actor.employeeId)
}

/**
 * May the actor edit a work item (task, bug, requirement) that belongs to
 * `ownerEmployeeId` on `projectId`?
 *
 * Yes when any of these hold:
 *   - it is their own item;
 *   - they manage or lead that project;
 *   - the owner reports to them, at any depth;
 *   - they administer the company the project belongs to.
 */
export async function canEditWorkItem(
  actor: Actor,
  options: { projectId?: string | null; ownerEmployeeId?: string | null }
): Promise<boolean> {
  const { projectId, ownerEmployeeId } = options

  if (ownerEmployeeId && ownerEmployeeId === actor.employeeId) return true

  if (projectId) {
    const projectRole: ProjectRole | null = await getProjectRole(projectId, actor.employeeId)
    if (projectRole === 'manager' || projectRole === 'team_leader') return true

    const project = await getProjectById(projectId)
    const companyId = (project as { companyId?: string } | null)?.companyId
    if (companyId && (await canAdminCompany(actor, companyId))) return true
  } else if (hasLegacyAdminRole(actor) || (await isPlatformAdmin(actor))) {
    // No project context to scope by — fall back to global authority.
    return true
  }

  if (ownerEmployeeId && (await isInManagerChain(actor.employeeId, ownerEmployeeId))) return true

  return false
}

/**
 * May the actor see another user's records (tasks, attendance, leave)?
 * Themselves, anyone reporting to them at any depth, or anyone in a company
 * they administer.
 */
export async function canViewUser(actor: Actor, targetEmployeeId: string): Promise<boolean> {
  if (targetEmployeeId === actor.employeeId) return true
  if (await isPlatformAdmin(actor)) return true
  if (actor.companyId && (await canAdminCompany(actor, actor.companyId))) return true
  return isInManagerChain(actor.employeeId, targetEmployeeId)
}

/** May the actor approve leave / WFH / attendance for this employee? */
export async function canApproveFor(actor: Actor, targetEmployeeId: string): Promise<boolean> {
  if (targetEmployeeId === actor.employeeId) return false // never self-approve
  return canViewUser(actor, targetEmployeeId)
}

/** Only platform admins create or reconfigure companies. */
export async function canManageCompanies(actor: Actor): Promise<boolean> {
  return isPlatformAdmin(actor)
}
