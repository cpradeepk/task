'use client'

/**
 * Requirements list for a project (or subproject — a subproject is a projects row).
 * Mirrors the credentials sub-page: client page, GraphQL data, 401→/, 403→forbidden.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DOMPurify from 'dompurify'
import RichTextEditor from '@/components/RichTextEditor'
import { getRequirementStatusStyle } from '@/lib/statusColors'
import { formatDateTimeIST } from '@/lib/datetime-utils'
import { Plus, ArrowLeft, ChevronDown } from 'lucide-react'

async function gql(query: string, variables: any) {
  // Send the localStorage token: the auth cookie expires independently of the
  // web session, so cookie-only requests can 401 while the app looks signed in.
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  })
  const result = await res.json()
  if (result.errors) throw new Error(result.errors[0]?.message || 'Request failed')
  return result.data
}

const GET_REQUIREMENTS = `
  query GetRequirements($projectId: String!, $includeSubprojects: Boolean) {
    requirements(projectId: $projectId, includeSubprojects: $includeSubprojects) {
      requirementId title status subprojectId reviewerId updatedAt
      sections { id }
    }
  }
`

const CREATE_REQUIREMENT = `
  mutation CreateRequirement($input: CreateRequirementInput!) {
    createRequirement(input: $input) { requirementId }
  }
`
const GET_BASELINES = `
  query GetBaselines($projectId: String!) {
    requirementBaselines(projectId: $projectId) {
      id versionLabel releaseNote frozenByName createdAt snapshotJson
    }
  }
`
const GET_EDIT_ACCESS = `
  query GetEditAccess($projectId: String!) {
    requirementEditAccess(projectId: $projectId)
  }
`
const GET_REQ_SECTIONS = `
  query GetReqSections($requirementId: ID!) {
    requirement(requirementId: $requirementId) {
      status
      sections { id heading label contentHtml displayOrder lockVersion }
    }
  }
`
const UPDATE_SECTION = `
  mutation UpdateSection($sectionId: ID!, $input: UpdateRequirementSectionInput!) {
    updateRequirementSection(sectionId: $sectionId, input: $input) { id lockVersion }
  }
`
const SUBMIT_REQUIREMENT = `
  mutation Submit($requirementId: ID!) {
    submitRequirementForReview(requirementId: $requirementId) { status }
  }
`
const APPROVE_REQUIREMENT = `
  mutation Approve($requirementId: ID!, $note: String) {
    approveRequirement(requirementId: $requirementId, note: $note) { status }
  }
`
const REJECT_REQUIREMENT = `
  mutation Reject($requirementId: ID!, $note: String!) {
    rejectRequirement(requirementId: $requirementId, note: $note) { status }
  }
`
const SPLIT_REQUIREMENT = `
  mutation Split($requirementId: ID!) {
    splitRequirementIntoSections(requirementId: $requirementId) { requirementId }
  }
`
const CREATE_BASELINE = `
  mutation Freeze($projectId: String!, $versionLabel: String, $releaseNote: String) {
    createRequirementBaseline(projectId: $projectId, versionLabel: $versionLabel, releaseNote: $releaseNote) { id versionLabel }
  }
`

interface RequirementRow {
  requirementId: string
  title: string
  status: string
  subprojectId?: string
  reviewerId?: string
  updatedAt: string
  sections: { id: string }[]
}

export default function RequirementsListPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = String(params.projectId)

  const [requirements, setRequirements] = useState<RequirementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [includeSubprojects, setIncludeSubprojects] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [baselines, setBaselines] = useState<any[]>([])
  const [viewing, setViewing] = useState<any | null>(null)
  const [freezing, setFreezing] = useState(false)
  // View is member-level; mutating controls need the per-user edit permission.
  const [canEdit, setCanEdit] = useState(false)
  // Accordion: which requirement rows are expanded + their lazily-loaded sections.
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [sectionsCache, setSectionsCache] = useState<Record<string, any[]>>({})
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({})
  // Inline single-field editing: per-requirement editor draft, freshest status,
  // and per-requirement busy markers for save/status-action requests.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [statusCache, setStatusCache] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [splittingId, setSplittingId] = useState<string | null>(null)

  const loadBaselines = useCallback(async () => {
    try {
      const data = await gql(GET_BASELINES, { projectId })
      setBaselines(data.requirementBaselines || [])
    } catch { /* non-fatal */ }
  }, [projectId])

  const loadEditAccess = useCallback(async () => {
    try {
      const data = await gql(GET_EDIT_ACCESS, { projectId })
      setCanEdit(Boolean(data.requirementEditAccess))
    } catch { setCanEdit(false) }
  }, [projectId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await gql(GET_REQUIREMENTS, { projectId, includeSubprojects })
      setRequirements(data.requirements || [])
      setForbidden(false)
    } catch (err: any) {
      if (/UNAUTHENTICATED/i.test(err.message)) { router.push('/'); return }
      if (/FORBIDDEN/i.test(err.message)) { setForbidden(true); return }
      console.error('Failed to load requirements:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, includeSubprojects, router])

  useEffect(() => { load(); loadBaselines(); loadEditAccess() }, [load, loadBaselines, loadEditAccess])

  const freeze = async () => {
    const releaseNote = prompt('Release note for this version (what changed):')
    if (releaseNote === null) return
    const versionLabel = prompt('Version label (blank = auto minor bump, e.g. 1.0 → 1.1):') || undefined
    setFreezing(true)
    try {
      const data = await gql(CREATE_BASELINE, { projectId, versionLabel, releaseNote: releaseNote || null })
      alert(`Frozen as v${data.createRequirementBaseline.versionLabel}. Any unapproved requirements were approved as part of the freeze.`)
      await load()
      await loadBaselines()
    } catch (err: any) {
      alert(err.message || 'Failed to freeze')
    } finally {
      setFreezing(false)
    }
  }

  const viewVersion = (b: any) => {
    try { setViewing({ ...b, items: JSON.parse(b.snapshotJson || '[]') }) }
    catch { setViewing({ ...b, items: [] }) }
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const data = await gql(CREATE_REQUIREMENT, { input: { projectId, title: newTitle.trim() } })
      setNewTitle('')
      router.push(`/projects/${projectId}/requirements/${data.createRequirement.requirementId}`)
    } catch (err: any) {
      alert(err.message || 'Failed to create requirement')
    } finally {
      setCreating(false)
    }
  }

  // Lazily (re)load a requirement's sections + status. `resetDraft` forces the
  // editor draft back to the server's first-section content (used after a
  // CONFLICT reload); otherwise the draft is only seeded when first missing.
  const fetchSections = useCallback(async (requirementId: string, resetDraft: boolean) => {
    setLoadingSections((prev) => ({ ...prev, [requirementId]: true }))
    try {
      const data = await gql(GET_REQ_SECTIONS, { requirementId })
      const req = data.requirement
      const sections = (req?.sections || [])
        .slice()
        .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
      setSectionsCache((prev) => ({ ...prev, [requirementId]: sections }))
      if (req?.status) setStatusCache((prev) => ({ ...prev, [requirementId]: req.status }))
      const firstHtml: string = sections[0]?.contentHtml ?? ''
      setDrafts((prev) =>
        resetDraft || prev[requirementId] === undefined
          ? { ...prev, [requirementId]: firstHtml }
          : prev
      )
    } catch {
      setSectionsCache((prev) => ({ ...prev, [requirementId]: [] }))
    } finally {
      setLoadingSections((prev) => ({ ...prev, [requirementId]: false }))
    }
  }, [])

  const toggleExpand = (requirementId: string) => {
    const willExpand = !expandedIds[requirementId]
    setExpandedIds((prev) => ({ ...prev, [requirementId]: willExpand }))
    if (willExpand && !sectionsCache[requirementId]) {
      fetchSections(requirementId, false)
    }
  }

  const handleSave = async (r: RequirementRow) => {
    const first = sectionsCache[r.requirementId]?.[0]
    if (!first) return
    setSavingId(r.requirementId)
    setSavedId(null)
    try {
      await gql(UPDATE_SECTION, {
        sectionId: first.id,
        input: {
          heading: first.heading,
          label: first.label,
          contentHtml: drafts[r.requirementId] ?? first.contentHtml ?? '',
          lockVersion: first.lockVersion,
        },
      })
      await fetchSections(r.requirementId, false)
      setSavedId(r.requirementId)
      setTimeout(() => setSavedId((cur) => (cur === r.requirementId ? null : cur)), 2000)
    } catch (err: any) {
      if (typeof err?.message === 'string' && err.message.startsWith('CONFLICT')) {
        alert('This requirement was updated elsewhere. Reloading.')
        await fetchSections(r.requirementId, true)
      } else {
        alert(err?.message || 'Something went wrong')
      }
    } finally {
      setSavingId(null)
    }
  }

  const runStatusAction = async (requirementId: string, mutation: string, variables: any) => {
    setActingId(requirementId)
    try {
      await gql(mutation, variables)
      await fetchSections(requirementId, false)
      await load()
    } catch (err: any) {
      alert(err?.message || 'Something went wrong')
    } finally {
      setActingId(null)
    }
  }

  const handleSubmit = (requirementId: string) =>
    runStatusAction(requirementId, SUBMIT_REQUIREMENT, { requirementId })

  const handleApprove = (requirementId: string) =>
    runStatusAction(requirementId, APPROVE_REQUIREMENT, { requirementId, note: null })

  const handleReject = (requirementId: string) => {
    const note = window.prompt('Reason for rejection:')
    if (note === null || !note.trim()) return
    return runStatusAction(requirementId, REJECT_REQUIREMENT, { requirementId, note: note.trim() })
  }

  // Save the latest draft, then ask the AI to reorganize the body into sections.
  const handleSplit = async (r: RequirementRow) => {
    if (!confirm('Split this requirement into structured sections using AI? Your current text is saved first, then reorganized.')) return
    setSplittingId(r.requirementId)
    try {
      const first = sectionsCache[r.requirementId]?.[0]
      const draft = drafts[r.requirementId]
      if (first && draft !== undefined && draft !== first.contentHtml) {
        await gql(UPDATE_SECTION, {
          sectionId: first.id,
          input: { heading: first.heading, label: first.label, contentHtml: draft, lockVersion: first.lockVersion },
        })
      }
      await gql(SPLIT_REQUIREMENT, { requirementId: r.requirementId })
      await fetchSections(r.requirementId, true)
      await load()
    } catch (err: any) {
      alert(err?.message || 'AI split failed. Please try again.')
    } finally {
      setSplittingId(null)
    }
  }

  if (forbidden) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <p className="text-gray-600">You don&apos;t have access to this project&apos;s requirements.</p>
        <button onClick={() => router.push(`/projects/${projectId}`)} className="mt-4 text-indigo-600 hover:underline">
          Back to project
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/projects/${projectId}`)} className="text-gray-500 hover:text-gray-800">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Requirements</h1>
        <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={includeSubprojects} onChange={(e) => setIncludeSubprojects(e.target.checked)} />
          Include subprojects
        </label>
      </div>

      {/* Versioning: freeze + load a frozen version */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {canEdit && (
          <button
            onClick={freeze}
            disabled={freezing}
            className="px-3 py-1.5 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-900 disabled:opacity-50"
          >
            {freezing ? 'Freezing…' : 'Freeze version'}
          </button>
        )}
        {baselines.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => { const b = baselines.find((x) => String(x.id) === e.target.value); if (b) viewVersion(b) }}
            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Load a frozen version…</option>
            {baselines.map((b) => (
              <option key={b.id} value={b.id}>v{b.versionLabel} · {formatDateTimeIST(b.createdAt)}</option>
            ))}
          </select>
        )}
        <span className="text-xs text-gray-400">{baselines.length} frozen version(s)</span>
      </div>

      {canEdit && (
        <div className="flex gap-2 mb-6">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            placeholder="New requirement title…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newTitle.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : requirements.length === 0 ? (
        <p className="text-gray-500">{canEdit ? 'No requirements yet. Add one above.' : 'No requirements yet.'}</p>
      ) : (
        <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
          {requirements.map((r) => {
            const freshStatus = statusCache[r.requirementId] ?? r.status
            const s = getRequirementStatusStyle(freshStatus)
            const isOpen = !!expandedIds[r.requirementId]
            const sections = sectionsCache[r.requirementId]
            const isLoadingSecs = !!loadingSections[r.requirementId]
            const first = sections?.[0]
            const isSaving = savingId === r.requirementId
            const isActing = actingId === r.requirementId
            return (
              <div key={r.requirementId}>
                <button
                  onClick={() => toggleExpand(r.requirementId)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? 'Collapse requirement' : 'Expand requirement'}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                >
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                  <span className="font-mono text-xs text-gray-400 shrink-0">{r.requirementId}</span>
                  <span className="flex-1 text-sm text-gray-800 truncate">{r.title}</span>
                  {r.subprojectId && (
                    <span className="text-xs text-gray-400 hidden sm:inline">{r.subprojectId}</span>
                  )}
                  <span className="text-xs text-gray-400 hidden sm:inline">{r.sections.length} section(s)</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.className}`}>{s.label}</span>
                  <span className="text-xs text-gray-400 w-32 text-right hidden md:inline">{formatDateTimeIST(r.updatedAt)}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:pl-10 bg-gray-50/60 border-t border-gray-100">
                    {isLoadingSecs && !sections ? (
                      <p className="text-xs text-gray-400 py-3">Loading sections…</p>
                    ) : (
                      <div className="space-y-4 py-3">
                        {/* Inline status actions, driven by the freshest status */}
                        {canEdit && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Status: <span className="font-medium text-gray-700">{s.label}</span>
                            </span>
                            {(freshStatus === 'Draft' || freshStatus === 'Rejected') && (
                              <button
                                onClick={() => handleSubmit(r.requirementId)}
                                disabled={isActing}
                                className="px-2.5 py-1 bg-indigo-600 text-white rounded-md text-xs hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {isActing ? 'Working…' : 'Submit for Review'}
                              </button>
                            )}
                            {freshStatus === 'In Review' && (
                              <>
                                <button
                                  onClick={() => handleApprove(r.requirementId)}
                                  disabled={isActing}
                                  className="px-2.5 py-1 bg-green-600 text-white rounded-md text-xs hover:bg-green-700 disabled:opacity-50"
                                >
                                  {isActing ? 'Working…' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleReject(r.requirementId)}
                                  disabled={isActing}
                                  className="px-2.5 py-1 bg-red-600 text-white rounded-md text-xs hover:bg-red-700 disabled:opacity-50"
                                >
                                  {isActing ? 'Working…' : 'Reject'}
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {!sections || sections.length === 0 ? (
                          <p className="text-xs text-gray-400">No sections yet.</p>
                        ) : canEdit && first ? (
                          <>
                            {/* Editable primary body (first section) */}
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">
                                {first.heading} <span className="font-normal text-gray-400">· {first.label}</span>
                              </p>
                              <div className="bg-white border border-gray-200 rounded-md">
                                <RichTextEditor
                                  key={`${r.requirementId}-${first.lockVersion}`}
                                  content={drafts[r.requirementId] ?? first.contentHtml ?? ''}
                                  onChange={(html) =>
                                    setDrafts((prev) => ({ ...prev, [r.requirementId]: html }))
                                  }
                                  placeholder="Describe the requirement…"
                                />
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => handleSave(r)}
                                  disabled={isSaving}
                                  className="px-3 py-1.5 bg-gray-800 text-white rounded-md text-xs hover:bg-gray-900 disabled:opacity-50"
                                >
                                  {isSaving ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                  onClick={() => handleSplit(r)}
                                  disabled={splittingId === r.requirementId || isSaving}
                                  title="Use AI to reorganize this text into structured sections"
                                  className="px-3 py-1.5 border border-indigo-300 text-indigo-700 rounded-md text-xs hover:bg-indigo-50 disabled:opacity-50 inline-flex items-center gap-1"
                                >
                                  {splittingId === r.requirementId ? 'Splitting…' : '✨ Split with AI'}
                                </button>
                                {savedId === r.requirementId && (
                                  <span className="text-xs text-green-600">Saved</span>
                                )}
                              </div>
                            </div>

                            {/* Legacy: additional sections stay read-only */}
                            {sections.length > 1 && (
                              <div className="space-y-3">
                                <p className="text-xs text-amber-600">
                                  This requirement has additional sections — open the full editor to edit them.
                                </p>
                                {sections.slice(1).map((sec: any) => (
                                  <div key={sec.id}>
                                    <p className="text-xs font-semibold text-gray-600">
                                      {sec.heading} <span className="font-normal text-gray-400">· {sec.label}</span>
                                    </p>
                                    {sec.contentHtml ? (
                                      <div
                                        className="prose prose-sm max-w-none text-gray-600 mt-1"
                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sec.contentHtml) }}
                                      />
                                    ) : (
                                      <p className="text-xs text-gray-300 italic mt-1">Empty</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          /* Read-only: no edit permission — render all sections */
                          <div className="space-y-3">
                            {sections.map((sec: any) => (
                              <div key={sec.id}>
                                <p className="text-xs font-semibold text-gray-600">
                                  {sec.heading} <span className="font-normal text-gray-400">· {sec.label}</span>
                                </p>
                                {sec.contentHtml ? (
                                  <div
                                    className="prose prose-sm max-w-none text-gray-600 mt-1"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sec.contentHtml) }}
                                  />
                                ) : (
                                  <p className="text-xs text-gray-300 italic mt-1">Empty</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => router.push(`/projects/${projectId}/requirements/${r.requirementId}`)}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Open full editor →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold">Frozen version v{viewing.versionLabel}</h2>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              Frozen by {viewing.frozenByName} · {formatDateTimeIST(viewing.createdAt)} · read-only
            </p>
            {viewing.releaseNote && (
              <p className="text-sm text-gray-600 mb-4 bg-gray-50 border border-gray-200 rounded p-2">
                <strong>Release note:</strong> {viewing.releaseNote}
              </p>
            )}
            <div className="space-y-4">
              {viewing.items.map((it: any) => (
                <div key={it.requirementId} className="border border-gray-200 rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-gray-400">{it.requirementId}</span>
                    <span className="text-sm font-medium text-gray-800">{it.title}</span>
                    <span className="ml-auto text-xs text-gray-400">{it.status}</span>
                  </div>
                  {(it.sections || []).map((s: any, i: number) => (
                    <div key={i} className="mb-2">
                      <p className="text-xs font-medium text-gray-500">{s.heading} · {s.label}</p>
                      <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(s.contentHtml || '') }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
