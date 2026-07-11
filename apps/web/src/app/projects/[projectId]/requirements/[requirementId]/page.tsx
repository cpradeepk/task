'use client'

/**
 * Requirement editor: ordered sections with rich-text bodies, explicit Save per
 * section (optimistic-locked → one revision per save), and per-section history.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DOMPurify from 'dompurify'
import RichTextEditor from '@/components/RichTextEditor'
import { getRequirementStatusStyle } from '@/lib/statusColors'
import { formatDateTimeIST } from '@/lib/datetime-utils'
import { ArrowLeft, Plus, Trash2, History, Save } from 'lucide-react'

async function gql(query: string, variables: any) {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const result = await res.json()
  if (result.errors) throw new Error(result.errors[0]?.message || 'Request failed')
  return result.data
}

const SECTION_LABELS = ['Functional', 'Non-Functional', 'Constraint', 'Acceptance Criteria', 'Note']

const GET_REQUIREMENT = `
  query GetRequirement($requirementId: ID!) {
    requirement(requirementId: $requirementId) {
      requirementId title status reviewerId subprojectId updatedAt
      createdByUser { name }
      sections { id heading label contentHtml displayOrder lockVersion revisionCount }
    }
  }
`
const CREATE_SECTION = `
  mutation CreateSection($input: CreateRequirementSectionInput!) {
    createRequirementSection(input: $input) { id }
  }
`
const UPDATE_SECTION = `
  mutation UpdateSection($sectionId: ID!, $input: UpdateRequirementSectionInput!) {
    updateRequirementSection(sectionId: $sectionId, input: $input) { id lockVersion }
  }
`
const DELETE_SECTION = `
  mutation DeleteSection($sectionId: ID!) { deleteRequirementSection(sectionId: $sectionId) }
`
const GET_REVISIONS = `
  query GetRevisions($sectionId: ID!) {
    requirementSectionRevisions(sectionId: $sectionId) {
      id editorName heading label contentHtml createdAt
    }
  }
`
const RESTORE_REVISION = `
  mutation Restore($sectionId: ID!, $revisionId: ID!) {
    restoreRequirementSectionRevision(sectionId: $sectionId, revisionId: $revisionId) { id }
  }
`

interface Section {
  id: string
  heading: string
  label: string
  contentHtml: string
  displayOrder: number
  lockVersion: number
  revisionCount: number
}

export default function RequirementEditorPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = String(params.projectId)
  const requirementId = String(params.requirementId)

  const [requirement, setRequirement] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  // Per-section local edit state keyed by id
  const [drafts, setDrafts] = useState<Record<string, Section>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [historyFor, setHistoryFor] = useState<string | null>(null)
  const [revisions, setRevisions] = useState<any[]>([])
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await gql(GET_REQUIREMENT, { requirementId })
      if (!data.requirement) { setForbidden(true); return }
      setRequirement(data.requirement)
      const d: Record<string, Section> = {}
      for (const s of data.requirement.sections) d[s.id] = { ...s }
      setDrafts(d)
      setForbidden(false)
    } catch (err: any) {
      if (/UNAUTHENTICATED/i.test(err.message)) { router.push('/'); return }
      if (/FORBIDDEN/i.test(err.message)) { setForbidden(true); return }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [requirementId, router])

  useEffect(() => { load() }, [load])

  const patchDraft = (id: string, patch: Partial<Section>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const saveSection = async (id: string) => {
    const d = drafts[id]
    setSavingId(id)
    try {
      await gql(UPDATE_SECTION, {
        sectionId: id,
        input: { heading: d.heading, label: d.label, contentHtml: d.contentHtml, lockVersion: d.lockVersion },
      })
      await load()
    } catch (err: any) {
      if (/CONFLICT/i.test(err.message)) {
        alert('This section was changed by someone else. Reloading the latest version.')
        await load()
      } else {
        alert(err.message || 'Failed to save')
      }
    } finally {
      setSavingId(null)
    }
  }

  const deleteSection = async (id: string) => {
    if (!confirm('Delete this section?')) return
    try {
      await gql(DELETE_SECTION, { sectionId: id })
      await load()
    } catch (err: any) {
      alert(err.message || 'Failed to delete')
    }
  }

  const addSection = async () => {
    setAdding(true)
    try {
      await gql(CREATE_SECTION, {
        input: { requirementId, heading: 'New section', label: 'Functional', contentHtml: '' },
      })
      await load()
    } catch (err: any) {
      alert(err.message || 'Failed to add section')
    } finally {
      setAdding(false)
    }
  }

  const openHistory = async (id: string) => {
    setHistoryFor(id)
    try {
      const data = await gql(GET_REVISIONS, { sectionId: id })
      setRevisions(data.requirementSectionRevisions || [])
    } catch (err: any) {
      alert(err.message || 'Failed to load history')
    }
  }

  const restore = async (sectionId: string, revisionId: string) => {
    if (!confirm('Restore this revision? A new revision will be created with this content.')) return
    try {
      await gql(RESTORE_REVISION, { sectionId, revisionId })
      setHistoryFor(null)
      await load()
    } catch (err: any) {
      alert(err.message || 'Failed to restore')
    }
  }

  if (forbidden) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <p className="text-gray-600">You don&apos;t have access to this requirement.</p>
        <button onClick={() => router.push(`/projects/${projectId}/requirements`)} className="mt-4 text-indigo-600 hover:underline">
          Back to requirements
        </button>
      </div>
    )
  }
  if (loading || !requirement) return <div className="max-w-4xl mx-auto p-6 text-gray-500">Loading…</div>

  const statusStyle = getRequirementStatusStyle(requirement.status)
  const sections = Object.values(drafts).sort((a, b) => a.displayOrder - b.displayOrder)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.push(`/projects/${projectId}/requirements`)} className="text-gray-500 hover:text-gray-800">
          <ArrowLeft size={20} />
        </button>
        <span className="font-mono text-xs text-gray-400">{requirement.requirementId}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.className}`}>{statusStyle.label}</span>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">{requirement.title}</h1>
      <p className="text-xs text-gray-400 mb-6">
        Created by {requirement.createdByUser?.name || requirement.requirementId} · updated {formatDateTimeIST(requirement.updatedAt)}
      </p>

      <div className="space-y-6">
        {sections.map((s) => (
          <div key={s.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                value={s.heading}
                onChange={(e) => patchDraft(s.id, { heading: e.target.value })}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-medium"
              />
              <select
                value={s.label}
                onChange={(e) => patchDraft(s.id, { label: e.target.value })}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {SECTION_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <button onClick={() => openHistory(s.id)} title="History" className="p-1.5 text-gray-500 hover:text-indigo-600">
                <History size={16} /><span className="sr-only">History</span>
              </button>
              <button onClick={() => deleteSection(s.id)} title="Delete" className="p-1.5 text-gray-500 hover:text-rose-600">
                <Trash2 size={16} />
              </button>
            </div>
            <RichTextEditor content={s.contentHtml} onChange={(html) => patchDraft(s.id, { contentHtml: html })} />
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => saveSection(s.id)}
                disabled={savingId === s.id}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Save size={14} /> {savingId === s.id ? 'Saving…' : 'Save'}
              </button>
              <span className="text-xs text-gray-400">{s.revisionCount} revision(s)</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addSection}
        disabled={adding}
        className="mt-6 px-4 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 flex items-center gap-1"
      >
        <Plus size={16} /> Add section
      </button>

      {historyFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setHistoryFor(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Section history</h2>
              <button onClick={() => setHistoryFor(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            {revisions.length === 0 ? (
              <p className="text-gray-500 text-sm">No revisions.</p>
            ) : (
              <div className="space-y-3">
                {revisions.map((rev) => (
                  <div key={rev.id} className="border border-gray-200 rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{rev.heading} <span className="text-gray-400">· {rev.label}</span></span>
                      <button onClick={() => restore(historyFor, rev.id)} className="text-xs text-indigo-600 hover:underline">Restore</button>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{rev.editorName} · {formatDateTimeIST(rev.createdAt)}</p>
                    <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rev.contentHtml || '') }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
