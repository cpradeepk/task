'use client'

/**
 * Requirements list for a project (or subproject — a subproject is a projects row).
 * Mirrors the credentials sub-page: client page, GraphQL data, 401→/, 403→forbidden.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DOMPurify from 'dompurify'
import { getRequirementStatusStyle } from '@/lib/statusColors'
import { formatDateTimeIST } from '@/lib/datetime-utils'
import { Plus, ArrowLeft } from 'lucide-react'

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
            const s = getRequirementStatusStyle(r.status)
            return (
              <button
                key={r.requirementId}
                onClick={() => router.push(`/projects/${projectId}/requirements/${r.requirementId}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
              >
                <span className="font-mono text-xs text-gray-400">{r.requirementId}</span>
                <span className="flex-1 text-sm text-gray-800 truncate">{r.title}</span>
                {r.subprojectId && (
                  <span className="text-xs text-gray-400">{r.subprojectId}</span>
                )}
                <span className="text-xs text-gray-400">{r.sections.length} section(s)</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.className}`}>{s.label}</span>
                <span className="text-xs text-gray-400 w-32 text-right">{formatDateTimeIST(r.updatedAt)}</span>
              </button>
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
