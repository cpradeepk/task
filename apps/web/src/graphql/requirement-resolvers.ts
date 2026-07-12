// GraphQL resolvers for the Requirements module (Phase 1: CRUD + sections + history).
// Merged into resolvers.ts like notification-resolvers.
import * as reqDb from '@/lib/db/requirements'
import { generateSequentialRequirementId, generateSequentialBugId } from '@/lib/data'
import { isUserAssignedToProject } from '@/lib/db/project-users'
import { createBug, getLatestBugId } from '@/lib/db/bugs'
import { createActivityLog } from '@/lib/db/activityLog'
import { createNotification } from '@/lib/notification-helper'

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

// Standard document structure seeded into every new requirement (ordered).
const DEFAULT_SECTION_SEEDS: Array<{ heading: string; label: string }> = [
  { heading: 'Overview', label: 'Note' },
  { heading: 'Scope', label: 'Note' },
  { heading: 'Functional Requirements', label: 'Functional' },
  { heading: 'Non-Functional Requirements', label: 'Non-Functional' },
  { heading: 'Constraints & Assumptions', label: 'Constraint' },
  { heading: 'Acceptance Criteria', label: 'Acceptance Criteria' },
]

const requirementLink = (requirementId: string, projectId: string) =>
  `/projects/${projectId}/requirements/${requirementId}`

// FR-4 eligibility: reviewer or privileged role; and NOT the author or last editor
// (separation of duties).
async function assertCanApprove(req: reqDb.Requirement, user: { employeeId: string; role: string }) {
  const isReviewerOrPriv = req.reviewerId === user.employeeId || PRIVILEGED_ROLES.includes(user.role)
  if (!isReviewerOrPriv) throw new Error('FORBIDDEN: You are not allowed to review this requirement.')
  if (req.createdBy === user.employeeId) throw new Error('FORBIDDEN: You cannot approve your own requirement.')
  const lastEditor = await reqDb.getLastSectionEditor(req.requirementId)
  if (lastEditor && lastEditor === user.employeeId) {
    throw new Error('FORBIDDEN: You cannot approve a requirement you last edited.')
  }
}

// Fire-and-forget activity + reviewer notification when a post-approval edit
// sends a requirement back to review (FR-5). Safe to call after any section edit.
async function handlePostEditReReview(req: reqDb.Requirement, actor: { employeeId: string; name: string }) {
  const reverted = await reqDb.revertToReviewIfApproved(req.requirementId)
  if (!reverted) return
  await createActivityLog({
    entityType: 'requirement', entityId: req.requirementId, userId: actor.employeeId,
    actionType: 'status_changed', oldValue: req.status, newValue: 'In Review',
    description: `Approved requirement modified — sent back to review by ${actor.name}`,
    isComment: false,
  }).catch(() => {})
  if (req.reviewerId && req.reviewerId !== actor.employeeId) {
    await createNotification({
      userId: req.reviewerId, actorId: actor.employeeId,
      notificationType: 'requirement_updated_after_approval',
      title: 'Requirement needs re-approval',
      message: `Approved requirement ${req.requirementId} was modified and needs re-approval.`,
      linkUrl: requirementLink(req.requirementId, req.projectId),
      metadata: { requirementId: req.requirementId },
    }).catch(() => {})
  }
}

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

  requirementBaselines: async (_: any, { projectId }: any, context: any) => {
    await requireProjectMember(context, projectId)
    return reqDb.getBaselines(projectId)
  },

  requirementBaseline: async (_: any, { id }: any, context: any) => {
    const b = await reqDb.getBaselineById(Number(id))
    if (!b) return null
    await requireProjectMember(context, b.projectId)
    return b
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
        const created = await reqDb.createRequirement({
          requirementId,
          projectId: input.projectId,
          subprojectId: input.subprojectId || undefined,
          title: input.title,
          createdBy: user.employeeId,
          reviewerId: input.reviewerId || undefined,
        })
        // Seed the standard document structure so every requirement starts
        // with a consistent index of sections instead of a blank page.
        for (const seed of DEFAULT_SECTION_SEEDS) {
          await reqDb.createSection({
            requirementId,
            heading: seed.heading,
            label: seed.label,
            contentHtml: '',
            editorId: user.employeeId,
            editorName: user.name,
          })
        }
        return created
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
    const section = await reqDb.createSection({
      requirementId: input.requirementId,
      heading: input.heading,
      label: input.label,
      contentHtml: input.contentHtml,
      editorId: user.employeeId,
      editorName: user.name,
    })
    await handlePostEditReReview(req, user)
    return section
  },

  updateRequirementSection: async (_: any, { sectionId, input }: any, context: any) => {
    const section = await reqDb.getSectionById(Number(sectionId))
    if (!section) throw new Error('Section not found')
    const req = await reqDb.getRequirementById(section.requirementId)
    if (!req) throw new Error('Requirement not found')
    const user = await requireProjectMember(context, req.projectId)
    const updated = await reqDb.updateSection(Number(sectionId), {
      heading: input.heading,
      label: input.label,
      contentHtml: input.contentHtml,
      lockVersion: input.lockVersion,
      editorId: user.employeeId,
      editorName: user.name,
    })
    await handlePostEditReReview(req, user)
    return updated
  },

  deleteRequirementSection: async (_: any, { sectionId }: any, context: any) => {
    const section = await reqDb.getSectionById(Number(sectionId))
    if (!section) return false
    const req = await reqDb.getRequirementById(section.requirementId)
    if (!req) return false
    const user = await requireProjectMember(context, req.projectId)
    const ok = await reqDb.softDeleteSection(Number(sectionId), user.employeeId)
    if (ok) await handlePostEditReReview(req, user)
    return ok
  },

  reorderRequirementSections: async (_: any, { requirementId, sectionIds }: any, context: any) => {
    const req = await reqDb.getRequirementById(requirementId)
    if (!req) throw new Error('Requirement not found')
    const user = await requireProjectMember(context, req.projectId)
    await reqDb.reorderSections(requirementId, (sectionIds as any[]).map(Number))
    await handlePostEditReReview(req, user)
    return true
  },

  restoreRequirementSectionRevision: async (_: any, { sectionId, revisionId }: any, context: any) => {
    const section = await reqDb.getSectionById(Number(sectionId))
    if (!section) throw new Error('Section not found')
    const req = await reqDb.getRequirementById(section.requirementId)
    if (!req) throw new Error('Requirement not found')
    const user = await requireProjectMember(context, req.projectId)
    const restored = await reqDb.restoreSectionRevision(Number(sectionId), Number(revisionId), user.employeeId, user.name)
    await handlePostEditReReview(req, user)
    return restored
  },

  submitRequirementForReview: async (_: any, { requirementId }: any, context: any) => {
    const req = await reqDb.getRequirementById(requirementId)
    if (!req) throw new Error('Requirement not found')
    const user = await requireProjectMember(context, req.projectId)
    if (!['Draft', 'Rejected'].includes(req.status)) {
      throw new Error(`FORBIDDEN: Cannot submit a ${req.status} requirement for review.`)
    }
    await reqDb.setRequirementStatus(requirementId, 'In Review', null)
    await createActivityLog({
      entityType: 'requirement', entityId: requirementId, userId: user.employeeId,
      actionType: 'status_changed', oldValue: req.status, newValue: 'In Review',
      description: `Submitted for review by ${user.name}`, isComment: false,
    }).catch(() => {})
    if (req.reviewerId && req.reviewerId !== user.employeeId) {
      await createNotification({
        userId: req.reviewerId, actorId: user.employeeId, notificationType: 'requirement_review_requested',
        title: 'Requirement review requested', message: `${req.requirementId} is ready for your review.`,
        linkUrl: requirementLink(requirementId, req.projectId), metadata: { requirementId },
      }).catch(() => {})
    }
    return reqDb.getRequirementById(requirementId)
  },

  approveRequirement: async (_: any, { requirementId, note }: any, context: any) => {
    const req = await reqDb.getRequirementById(requirementId)
    if (!req) throw new Error('Requirement not found')
    const user = await requireProjectMember(context, req.projectId)
    await assertCanApprove(req, user)
    if (req.status !== 'In Review') throw new Error('FORBIDDEN: Only an in-review requirement can be approved.')
    const hash = await reqDb.computeRequirementContentHash(requirementId)
    const approvalId = await reqDb.insertApproval({
      requirementId, approverId: user.employeeId, approverName: user.name,
      decision: 'Approved', note, approvedContentHash: hash,
    })
    await reqDb.setRequirementStatus(requirementId, 'Approved', approvalId)
    await createActivityLog({
      entityType: 'requirement', entityId: requirementId, userId: user.employeeId,
      actionType: 'status_changed', oldValue: req.status, newValue: 'Approved',
      description: `Approved by ${user.name}${note ? ': ' + note : ''}`, isComment: false,
    }).catch(() => {})
    if (req.createdBy !== user.employeeId) {
      await createNotification({
        userId: req.createdBy, actorId: user.employeeId, notificationType: 'requirement_approved',
        title: 'Requirement approved', message: `${req.requirementId} was approved by ${user.name}.`,
        linkUrl: requirementLink(requirementId, req.projectId), metadata: { requirementId },
      }).catch(() => {})
    }
    return reqDb.getRequirementById(requirementId)
  },

  rejectRequirement: async (_: any, { requirementId, note }: any, context: any) => {
    const req = await reqDb.getRequirementById(requirementId)
    if (!req) throw new Error('Requirement not found')
    const user = await requireProjectMember(context, req.projectId)
    await assertCanApprove(req, user)
    if (!note || !note.trim()) throw new Error('A rejection note is required.')
    if (req.status !== 'In Review') throw new Error('FORBIDDEN: Only an in-review requirement can be rejected.')
    const hash = await reqDb.computeRequirementContentHash(requirementId)
    await reqDb.insertApproval({
      requirementId, approverId: user.employeeId, approverName: user.name,
      decision: 'Rejected', note, approvedContentHash: hash,
    })
    await reqDb.setRequirementStatus(requirementId, 'Rejected', null)
    await createActivityLog({
      entityType: 'requirement', entityId: requirementId, userId: user.employeeId,
      actionType: 'status_changed', oldValue: req.status, newValue: 'Rejected',
      description: `Rejected by ${user.name}: ${note}`, isComment: false,
    }).catch(() => {})
    if (req.createdBy !== user.employeeId) {
      await createNotification({
        userId: req.createdBy, actorId: user.employeeId, notificationType: 'requirement_rejected',
        title: 'Requirement rejected', message: `${req.requirementId} was rejected: ${note}`,
        linkUrl: requirementLink(requirementId, req.projectId), metadata: { requirementId },
      }).catch(() => {})
    }
    return reqDb.getRequirementById(requirementId)
  },

  updateRequirementStatus: async (_: any, { requirementId, status }: any, context: any) => {
    const req = await reqDb.getRequirementById(requirementId)
    if (!req) throw new Error('Requirement not found')
    const user = await requireProjectMember(context, req.projectId)
    const reviewerOrPriv = PRIVILEGED_ROLES.includes(user.role) || req.reviewerId === user.employeeId
    if (status === 'Verified') {
      if (req.status !== 'Implemented' || !reviewerOrPriv) {
        throw new Error('FORBIDDEN: Only reviewer/management can verify an implemented requirement.')
      }
    } else if (status === 'Deprecated') {
      if (!(PRIVILEGED_ROLES.includes(user.role) || (req.createdBy === user.employeeId && req.status === 'Draft'))) {
        throw new Error('FORBIDDEN: Cannot deprecate this requirement.')
      }
    } else {
      throw new Error(`FORBIDDEN: Unsupported status transition to ${status}.`)
    }
    await reqDb.setRequirementStatus(requirementId, status, status === 'Verified' ? req.currentApprovalId ?? null : null)
    await createActivityLog({
      entityType: 'requirement', entityId: requirementId, userId: user.employeeId,
      actionType: 'status_changed', oldValue: req.status, newValue: status,
      description: `Status changed to ${status} by ${user.name}`, isComment: false,
    }).catch(() => {})
    return reqDb.getRequirementById(requirementId)
  },

  // Freeze the whole project's requirements doc to a new version (bulk-approves
  // stragglers per user decision). Any project member may freeze.
  createRequirementBaseline: async (_: any, { projectId, versionLabel, releaseNote }: any, context: any) => {
    const user = await requireProjectMember(context, projectId)
    return reqDb.createBaseline({
      projectId, versionLabel: versionLabel || undefined, releaseNote: releaseNote || undefined,
      frozenBy: user.employeeId, frozenByName: user.name,
    })
  },

  // Create a DEV feature (bugs.type='feature') from an approved requirement,
  // pre-filled from its sections, scoped to the same project/subproject, linked
  // both ways; the requirement auto-advances to Implemented.
  createDevItemFromRequirement: async (_: any, { requirementId, input }: any, context: any) => {
    const req = await reqDb.getRequirementById(requirementId)
    if (!req) throw new Error('Requirement not found')
    const user = await requireProjectMember(context, req.projectId)
    if (req.status !== 'Approved') {
      throw new Error('FORBIDDEN: DEV items can only be created from an approved requirement.')
    }
    const sections = await reqDb.getSections(requirementId)
    const description = sections.map((s) => `<h3>${s.heading}</h3>${s.contentHtml}`).join('\n') ||
      `<p>Implements requirement ${req.requirementId}</p>`

    let bug: any = null
    for (let attempt = 1; attempt <= 5; attempt++) {
      const latest = await getLatestBugId()
      const bugId = generateSequentialBugId(latest)
      try {
        bug = await createBug({
          bugId, title: req.title, description,
          severity: 'Minor', priority: 'Low', status: 'Open', category: 'Other',
          platform: 'Web', environment: 'Production',
          assignedTo: input?.assignedTo || undefined, assignedBy: user.employeeId, reportedBy: user.employeeId,
          reopenedCount: 0, type: 'feature',
          projectId: req.projectId, subprojectId: req.subprojectId || undefined,
        } as any)
        break
      } catch (err: any) {
        const dup = err?.code === '23505' || /duplicate key|unique constraint/i.test(err?.message || '')
        if (dup && attempt < 5) continue
        throw err
      }
    }
    if (!bug) throw new Error('Failed to create DEV item')

    await reqDb.insertDevLink(requirementId, bug.bugId, 'implements', user.employeeId)
    await reqDb.setRequirementStatus(requirementId, 'Implemented', req.currentApprovalId ?? null)
    await createActivityLog({
      entityType: 'requirement', entityId: requirementId, userId: user.employeeId,
      actionType: 'dev_item_created', newValue: bug.bugId,
      description: `Created DEV item ${bug.bugId} from requirement`, isComment: false,
    }).catch(() => {})
    if (input?.assignedTo && input.assignedTo !== user.employeeId) {
      await createNotification({
        userId: input.assignedTo, actorId: user.employeeId, notificationType: 'bug_assigned', bugId: bug.bugId,
        title: 'DEV item assigned', message: `${bug.bugId} (${req.title}) was assigned to you.`,
        linkUrl: `/bugs/${bug.bugId}`, metadata: { requirementId },
      }).catch(() => {})
    }
    if (req.createdBy !== user.employeeId) {
      await createNotification({
        userId: req.createdBy, actorId: user.employeeId, notificationType: 'requirement_dev_item_created',
        title: 'DEV item created', message: `${bug.bugId} was created from your requirement ${req.requirementId}.`,
        linkUrl: requirementLink(requirementId, req.projectId), metadata: { requirementId, bugId: bug.bugId },
      }).catch(() => {})
    }
    return bug
  },

  // Roll ONE requirement's working copy back to its content in a chosen version.
  // Creates new revisions and sends the requirement back into review (FR-5).
  rollbackRequirementToVersion: async (_: any, { requirementId, baselineId }: any, context: any) => {
    const req = await reqDb.getRequirementById(requirementId)
    if (!req) throw new Error('Requirement not found')
    const user = await requireProjectMember(context, req.projectId)
    await reqDb.rollbackRequirementToBaseline(requirementId, Number(baselineId), user.employeeId, user.name)
    await createActivityLog({
      entityType: 'requirement', entityId: requirementId, userId: user.employeeId,
      actionType: 'rolled_back', description: `Rolled back to a previous version by ${user.name}`, isComment: false,
    }).catch(() => {})
    await handlePostEditReReview(req, user)
    return reqDb.getRequirementById(requirementId)
  },
}

export const requirementFieldResolvers = {
  Requirement: {
    id: (r: any) => r.requirementId,
    sections: (r: any) => reqDb.getSections(r.requirementId),
    approvals: async (r: any) => {
      const list = await reqDb.getApprovals(r.requirementId)
      return list.map((a) => ({ ...a, isCurrent: a.id === r.currentApprovalId }))
    },
    devLinks: (r: any) => reqDb.getDevLinks(r.requirementId),
    createdByUser: (r: any, _: any, { loaders }: any) =>
      r.createdBy ? loaders.user.load(r.createdBy) : null,
    reviewerUser: (r: any, _: any, { loaders }: any) =>
      r.reviewerId ? loaders.user.load(r.reviewerId) : null,
  },
  RequirementSection: {
    revisionCount: (s: any) => reqDb.getRevisionCount(s.id),
  },
  RequirementBaseline: {
    // Expose the frozen doc snapshot as a JSON string; the client parses it.
    snapshotJson: (b: any) => JSON.stringify(b.snapshot ?? []),
  },
}
