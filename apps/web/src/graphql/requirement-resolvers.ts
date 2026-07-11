// GraphQL resolvers for the Requirements module (Phase 1: CRUD + sections + history).
// Merged into resolvers.ts like notification-resolvers.
import * as reqDb from '@/lib/db/requirements'
import { generateSequentialRequirementId } from '@/lib/data'
import { isUserAssignedToProject } from '@/lib/db/project-users'

// ── Auth guards (local; mirror requireUser in resolvers.ts) ──────────────────
function requireUser(context: any): { employeeId: string; role: string; name: string } {
  if (!context?.user?.employeeId) {
    throw new Error('UNAUTHENTICATED: You must be signed in.')
  }
  return context.user
}

// Project members (or admin/top_management) may access a project's requirements.
async function requireProjectMember(context: any, projectId: string): Promise<{ employeeId: string; role: string; name: string }> {
  const user = requireUser(context)
  if (user.role === 'admin' || user.role === 'top_management') return user
  const isMember = await isUserAssignedToProject(projectId, user.employeeId)
  if (!isMember) {
    throw new Error('FORBIDDEN: You are not a member of this project.')
  }
  return user
}

const PRIVILEGED_ROLES = ['admin', 'top_management', 'management']

export const requirementQueries = {
  requirements: async (_: any, { projectId, includeSubprojects, status, search }: any, context: any) => {
    await requireProjectMember(context, projectId)
    return reqDb.getRequirementsByProject(projectId, { includeSubprojects, status, search })
  },

  requirement: async (_: any, { requirementId }: any, context: any) => {
    const req = await reqDb.getRequirementById(requirementId)
    if (!req) return null
    await requireProjectMember(context, req.projectId)
    return req
  },

  requirementSectionRevisions: async (_: any, { sectionId }: any, context: any) => {
    requireUser(context)
    const section = await reqDb.getSectionById(Number(sectionId))
    if (!section) return []
    const req = await reqDb.getRequirementById(section.requirementId)
    if (req) await requireProjectMember(context, req.projectId)
    return reqDb.getSectionRevisions(Number(sectionId))
  },
}

export const requirementMutations = {
  createRequirement: async (_: any, { input }: any, context: any) => {
    const user = await requireProjectMember(context, input.projectId)
    // Sequential id with retry on unique-violation (read-latest+increment is not atomic).
    for (let attempt = 1; attempt <= 5; attempt++) {
      const latest = await reqDb.getLatestRequirementId()
      const requirementId = generateSequentialRequirementId(latest)
      try {
        return await reqDb.createRequirement({
          requirementId,
          projectId: input.projectId,
          subprojectId: input.subprojectId || undefined,
          title: input.title,
          createdBy: user.employeeId,
          reviewerId: input.reviewerId || undefined,
        })
      } catch (err: any) {
        const dup = err?.code === '23505' || /duplicate key|unique constraint/i.test(err?.message || '')
        if (dup && attempt < 5) continue
        throw err
      }
    }
    throw new Error('Failed to generate a unique requirement ID')
  },

  updateRequirement: async (_: any, { requirementId, input }: any, context: any) => {
    const req = await reqDb.getRequirementById(requirementId)
    if (!req) throw new Error('Requirement not found')
    await requireProjectMember(context, req.projectId)
    return reqDb.updateRequirement(requirementId, { title: input.title, reviewerId: input.reviewerId })
  },

  deleteRequirement: async (_: any, { requirementId }: any, context: any) => {
    const req = await reqDb.getRequirementById(requirementId)
    if (!req) return false
    const user = await requireProjectMember(context, req.projectId)
    // Only the author or a privileged role may delete.
    if (req.createdBy !== user.employeeId && !PRIVILEGED_ROLES.includes(user.role)) {
      throw new Error('FORBIDDEN: You cannot delete this requirement.')
    }
    return reqDb.softDeleteRequirement(requirementId, user.employeeId)
  },

  createRequirementSection: async (_: any, { input }: any, context: any) => {
    const req = await reqDb.getRequirementById(input.requirementId)
    if (!req) throw new Error('Requirement not found')
    const user = await requireProjectMember(context, req.projectId)
    return reqDb.createSection({
      requirementId: input.requirementId,
      heading: input.heading,
      label: input.label,
      contentHtml: input.contentHtml,
      editorId: user.employeeId,
      editorName: user.name,
    })
  },

  updateRequirementSection: async (_: any, { sectionId, input }: any, context: any) => {
    const section = await reqDb.getSectionById(Number(sectionId))
    if (!section) throw new Error('Section not found')
    const req = await reqDb.getRequirementById(section.requirementId)
    if (!req) throw new Error('Requirement not found')
    const user = await requireProjectMember(context, req.projectId)
    return reqDb.updateSection(Number(sectionId), {
      heading: input.heading,
      label: input.label,
      contentHtml: input.contentHtml,
      lockVersion: input.lockVersion,
      editorId: user.employeeId,
      editorName: user.name,
    })
  },

  deleteRequirementSection: async (_: any, { sectionId }: any, context: any) => {
    const section = await reqDb.getSectionById(Number(sectionId))
    if (!section) return false
    const req = await reqDb.getRequirementById(section.requirementId)
    if (!req) return false
    const user = await requireProjectMember(context, req.projectId)
    return reqDb.softDeleteSection(Number(sectionId), user.employeeId)
  },

  reorderRequirementSections: async (_: any, { requirementId, sectionIds }: any, context: any) => {
    const req = await reqDb.getRequirementById(requirementId)
    if (!req) throw new Error('Requirement not found')
    await requireProjectMember(context, req.projectId)
    await reqDb.reorderSections(requirementId, (sectionIds as any[]).map(Number))
    return true
  },

  restoreRequirementSectionRevision: async (_: any, { sectionId, revisionId }: any, context: any) => {
    const section = await reqDb.getSectionById(Number(sectionId))
    if (!section) throw new Error('Section not found')
    const req = await reqDb.getRequirementById(section.requirementId)
    if (!req) throw new Error('Requirement not found')
    const user = await requireProjectMember(context, req.projectId)
    return reqDb.restoreSectionRevision(Number(sectionId), Number(revisionId), user.employeeId, user.name)
  },
}

export const requirementFieldResolvers = {
  Requirement: {
    id: (r: any) => r.requirementId,
    sections: (r: any) => reqDb.getSections(r.requirementId),
    createdByUser: (r: any, _: any, { loaders }: any) =>
      r.createdBy ? loaders.user.load(r.createdBy) : null,
    reviewerUser: (r: any, _: any, { loaders }: any) =>
      r.reviewerId ? loaders.user.load(r.reviewerId) : null,
  },
  RequirementSection: {
    revisionCount: (s: any) => reqDb.getRevisionCount(s.id),
  },
}
