'use client'

/**
 * BugGridView Component
 *
 * Excel-like editable grid for bugs/test cases with:
 *   - Inline editing (click cell → dropdown/input → blur or Enter saves)
 *   - Per-row expand to show description + nested subtasks
 *   - "+" comment button per row → quick composer modal
 *
 * Column order (left → right):
 *   View | Project | Title (with expand) | Type | Status | Severity |
 *   Category | Assigned | Reported By | Comment
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bug, User, Project } from '@/lib/types'
import { updateBug, addBugComment } from '@/lib/bugService'
import { getCurrentUser } from '@/lib/auth'
import {
  Eye,
  MessageSquarePlus,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  Circle as CircleIcon,
} from 'lucide-react'
import {
  getBugStatusStyle,
  getBugSeverityStyle,
  getBugTypeStyle,
  type BadgeStyle,
} from '@/lib/statusColors'

interface SettingItem { value: string; icon?: string }

interface BugGridViewProps {
  bugs: Bug[]
  users: User[]
  projects: Array<Pick<Project, 'projectId' | 'projectName'>>
  settingsData: { bugStatuses: SettingItem[] }
  onBugsChange: (updater: (prev: Bug[]) => Bug[]) => void
}

const SEVERITY_OPTIONS: Bug['severity'][] = ['Critical', 'Major', 'Minor']
const CATEGORY_OPTIONS: Bug['category'][] = [
  'UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other'
]
const TYPE_OPTIONS: Array<Exclude<Bug['type'], null | undefined>> = ['testcase', 'feature', 'bug', 'other']

type EditableField =
  | 'title' | 'type' | 'status' | 'severity' | 'category' | 'assignedTo' | 'projectId'

type EditingCell = { bugId: string; field: EditableField } | null

// Status/severity/type colors now come from the shared semantic system
// (see @/lib/statusColors). Every badge pairs color with an icon so
// colorblind users aren't relying on color alone.

const TOTAL_COLUMNS = 10

export default function BugGridView({
  bugs,
  users,
  projects,
  settingsData,
  onBugsChange
}: BugGridViewProps) {
  const router = useRouter()
  const [editing, setEditing] = useState<EditingCell>(null)
  const [draftValue, setDraftValue] = useState<string>('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [commentingBugId, setCommentingBugId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  // Per-bug expansion + subtasks cache
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [subtasksByParent, setSubtasksByParent] = useState<Record<string, Bug[]>>({})
  const [loadingSubtasksFor, setLoadingSubtasksFor] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement) inputRef.current.select()
    }
  }, [editing])

  const userMap = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach(u => { map[u.employeeId] = u.name })
    return map
  }, [users])

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {}
    projects.forEach(p => { map[p.projectId] = p.projectName })
    return map
  }, [projects])

  const statusOptions = settingsData.bugStatuses.length > 0
    ? settingsData.bugStatuses.map(s => s.value)
    : ['New', 'In Progress', 'Resolved', 'Closed', 'Reopened']

  const startEdit = (bugId: string, field: EditableField, currentValue: string) => {
    setEditing({ bugId, field })
    setDraftValue(currentValue ?? '')
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraftValue('')
  }

  const applyUpdateToRow = useCallback((bugId: string, field: EditableField, newValue: string | null) => {
    onBugsChange(prev => prev.map(b => b.bugId === bugId ? { ...b, [field]: newValue } : b))
    // Also update inside subtasksByParent if relevant
    setSubtasksByParent(prev => {
      const next: Record<string, Bug[]> = {}
      for (const [parentId, list] of Object.entries(prev)) {
        next[parentId] = list.map(b => b.bugId === bugId ? { ...b, [field]: newValue } : b)
      }
      return next
    })
  }, [onBugsChange])

  const saveEdit = async (bug: Bug) => {
    if (!editing) return
    const field = editing.field
    const newValue = draftValue.trim() === '' && field !== 'title' ? null : draftValue
    if (((bug as any)[field] ?? '') === (newValue ?? '')) {
      cancelEdit()
      return
    }

    setSavingId(bug.bugId)
    const previousValue = (bug as any)[field]
    applyUpdateToRow(bug.bugId, field, newValue)

    try {
      const success = await updateBug(bug.bugId, { [field]: newValue } as Partial<Bug>)
      if (!success) {
        applyUpdateToRow(bug.bugId, field, previousValue)
        alert(`Failed to update ${field}`)
      }
    } catch (err) {
      console.error('Failed to save edit:', err)
      applyUpdateToRow(bug.bugId, field, previousValue)
      alert(`Failed to update ${field}`)
    } finally {
      setSavingId(null)
      cancelEdit()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, bug: Bug) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit(bug)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const handlePostComment = async () => {
    if (!commentingBugId || !commentText.trim()) return
    const currentUser = getCurrentUser()
    if (!currentUser) {
      alert('Not authenticated')
      return
    }
    setPostingComment(true)
    try {
      const success = await addBugComment(commentingBugId, currentUser.employeeId, commentText.trim())
      if (success) {
        setCommentingBugId(null)
        setCommentText('')
      } else {
        alert('Failed to post comment')
      }
    } catch (err) {
      console.error('Failed to post comment:', err)
      alert('Failed to post comment')
    } finally {
      setPostingComment(false)
    }
  }

  const toggleExpand = async (bug: Bug) => {
    const isOpen = !!expanded[bug.bugId]
    setExpanded(prev => ({ ...prev, [bug.bugId]: !isOpen }))
    if (!isOpen && !subtasksByParent[bug.bugId]) {
      // Lazy-load subtasks the first time we open this row
      setLoadingSubtasksFor(prev => {
        const n = new Set(prev); n.add(bug.bugId); return n
      })
      try {
        const res = await fetch(`/api/bugs/subtasks?parentDevId=${encodeURIComponent(bug.bugId)}`)
        if (res.ok) {
          const json = await res.json()
          const list: Bug[] = json.data || json.bugs || []
          setSubtasksByParent(prev => ({ ...prev, [bug.bugId]: list }))
        } else {
          setSubtasksByParent(prev => ({ ...prev, [bug.bugId]: [] }))
        }
      } catch (err) {
        console.error('Failed to load subtasks for', bug.bugId, err)
        setSubtasksByParent(prev => ({ ...prev, [bug.bugId]: [] }))
      } finally {
        setLoadingSubtasksFor(prev => {
          const n = new Set(prev); n.delete(bug.bugId); return n
        })
      }
    }
  }

  const renderEditableBadge = (
    bug: Bug,
    field: EditableField,
    value: string | null | undefined,
    options: string[],
    styleResolver: (v: string | null | undefined) => BadgeStyle,
    placeholder = '—'
  ) => {
    const isEditing = editing?.bugId === bug.bugId && editing.field === field
    if (isEditing) {
      return (
        <select
          ref={el => { inputRef.current = el }}
          value={draftValue}
          onChange={e => setDraftValue(e.target.value)}
          onBlur={() => saveEdit(bug)}
          onKeyDown={e => handleKeyDown(e, bug)}
          className="w-full px-2 py-1 text-xs border-2 border-primary rounded focus:outline-none bg-white"
        >
          <option value="">—</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }
    if (!value) {
      return (
        <button
          type="button"
          onClick={() => startEdit(bug.bugId, field, '')}
          className="px-2 py-1 text-xs font-medium rounded border w-full text-left hover:ring-2 hover:ring-primary/40 transition bg-neutral-50 text-neutral-500 border-dashed border-neutral-300"
          title="Click to edit"
        >
          {placeholder}
        </button>
      )
    }
    const s = styleResolver(value)
    const Icon = s.icon
    return (
      <button
        type="button"
        onClick={() => startEdit(bug.bugId, field, value ?? '')}
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border w-full text-left hover:ring-2 hover:ring-primary/40 transition ${s.className}`}
        title={`${s.label} (click to edit)`}
      >
        <Icon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
        <span className="truncate">{value}</span>
      </button>
    )
  }

  const renderDescriptionAccordion = (bug: Bug) => {
    const noContent =
      !bug.description &&
      !bug.expectedBehavior &&
      !bug.actualBehavior &&
      !bug.startDate &&
      !bug.endDate
    return (
      <div className="px-6 py-4 bg-primary-50/30 border-t border-primary-100">
        {noContent ? (
          <p className="text-sm text-gray-500 italic">No description.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
            {bug.description && (
              <div className="lg:col-span-2">
                <h4 className="font-semibold text-gray-900 mb-1">Steps to Reproduce</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{bug.description}</p>
              </div>
            )}
            <div className="text-sm">
              <span className="font-semibold text-gray-900">Start Date: </span>
              <span className="text-gray-700">{bug.startDate || 'Not set'}</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold text-gray-900">End Date: </span>
              <span className="text-gray-700">{bug.endDate || 'Not set'}</span>
            </div>
            {bug.expectedBehavior && (
              <div className="lg:col-span-2">
                <h4 className="font-semibold text-gray-900 mb-1">Expected Behavior</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{bug.expectedBehavior}</p>
              </div>
            )}
            {bug.actualBehavior && (
              <div className="lg:col-span-2">
                <h4 className="font-semibold text-gray-900 mb-1">Actual Behavior</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{bug.actualBehavior}</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderRow = (bug: Bug, depth = 0) => {
    const isSaving = savingId === bug.bugId
    const isEditingTitle = editing?.bugId === bug.bugId && editing.field === 'title'
    const isOpen = !!expanded[bug.bugId]
    const isSubtaskRow = depth > 0

    return (
      <tr
        key={bug.bugId}
        className={`border-b border-gray-100 hover:bg-primary-50/30 transition ${
          isSubtaskRow ? 'bg-gray-50/60' : ''
        }`}
      >
        {/* View action (first column, requested) */}
        <td className="px-3 py-2 w-12">
          <div className="flex items-center gap-1">
            {isSubtaskRow && (
              <span
                className="text-gray-400 select-none"
                title="Subtask"
                style={{ marginLeft: (depth - 1) * 16 }}
              >
                ↳
              </span>
            )}
            <button
              type="button"
              onClick={() => router.push(`/bugs/${bug.bugId}`)}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition"
              title="Open detail"
            >
              <Eye className="h-4 w-4" />
            </button>
            {isSaving && <Loader2 className="h-3.5 w-3.5 text-primary-600 animate-spin" />}
          </div>
        </td>

        {/* Project (second column, requested) */}
        <td className="px-3 py-2 w-40">
          {editing?.bugId === bug.bugId && editing.field === 'projectId' ? (
            <select
              ref={el => { inputRef.current = el }}
              value={draftValue}
              onChange={e => setDraftValue(e.target.value)}
              onBlur={() => saveEdit(bug)}
              onKeyDown={e => handleKeyDown(e, bug)}
              className="w-full px-2 py-1 text-xs border-2 border-primary rounded focus:outline-none"
            >
              <option value="">—</option>
              {projects.map(p => (
                <option key={p.projectId} value={p.projectId}>{p.projectName}</option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              onClick={() => startEdit(bug.bugId, 'projectId', bug.projectId ?? '')}
              className="text-left w-full text-xs text-gray-700 truncate hover:text-primary-700"
              title={bug.projectId ? projectMap[bug.projectId] : 'Set project'}
            >
              {bug.projectId ? (projectMap[bug.projectId] || bug.projectId) : (
                <span className="text-gray-400 italic">no project</span>
              )}
            </button>
          )}
        </td>

        {/* Title with expand chevron (third column) */}
        <td className="px-3 py-2 min-w-[280px]">
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <input
                ref={el => { inputRef.current = el }}
                type="text"
                value={draftValue}
                onChange={e => setDraftValue(e.target.value)}
                onBlur={() => saveEdit(bug)}
                onKeyDown={e => handleKeyDown(e, bug)}
                className="flex-1 px-2 py-1 text-sm border-2 border-primary rounded focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => startEdit(bug.bugId, 'title', bug.title)}
                className="text-left flex-1 text-sm text-gray-900 hover:text-primary-700 truncate"
                title={bug.title}
              >
                {bug.title}
              </button>
            )}
            {/* Right-aligned expand chevron */}
            {!isSubtaskRow && (
              <button
                type="button"
                onClick={() => toggleExpand(bug)}
                className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition"
                aria-expanded={isOpen}
                title={isOpen ? 'Collapse' : 'Expand description & subtasks'}
              >
                {isOpen
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
          </div>
        </td>

        {/* Type */}
        <td className="px-3 py-2 w-28">
          {renderEditableBadge(bug, 'type', bug.type, TYPE_OPTIONS as string[], getBugTypeStyle, 'set type')}
        </td>

        {/* Status */}
        <td className="px-3 py-2 w-32">
          {renderEditableBadge(bug, 'status', bug.status, statusOptions, getBugStatusStyle)}
        </td>

        {/* Severity */}
        <td className="px-3 py-2 w-28">
          {renderEditableBadge(bug, 'severity', bug.severity, SEVERITY_OPTIONS, getBugSeverityStyle)}
        </td>

        {/* Category — uses neutral-info tone (no urgency semantics) */}
        <td className="px-3 py-2 w-32">
          {renderEditableBadge(
            bug, 'category', bug.category, CATEGORY_OPTIONS,
            () => ({
              tone: 'info' as const,
              className: 'bg-info-100 text-info-700 border-info-500/40',
              icon: CircleIcon,
              label: bug.category || '—',
            })
          )}
        </td>

        {/* Assigned To */}
        <td className="px-3 py-2 w-40">
          {editing?.bugId === bug.bugId && editing.field === 'assignedTo' ? (
            <select
              ref={el => { inputRef.current = el }}
              value={draftValue}
              onChange={e => setDraftValue(e.target.value)}
              onBlur={() => saveEdit(bug)}
              onKeyDown={e => handleKeyDown(e, bug)}
              className="w-full px-2 py-1 text-xs border-2 border-primary rounded focus:outline-none"
            >
              <option value="">— Unassigned —</option>
              {users.map(u => (
                <option key={u.employeeId} value={u.employeeId}>
                  {u.name} ({u.employeeId})
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              onClick={() => startEdit(bug.bugId, 'assignedTo', bug.assignedTo ?? '')}
              className="text-left w-full text-xs text-gray-700 truncate hover:text-primary-700"
            >
              {bug.assignedTo ? (userMap[bug.assignedTo] || bug.assignedTo) : (
                <span className="text-gray-400 italic">unassigned</span>
              )}
            </button>
          )}
        </td>

        {/* Reported By (read-only) */}
        <td className="px-3 py-2 w-32 text-xs text-gray-600 truncate">
          {userMap[bug.reportedBy] || bug.reportedBy}
        </td>

        {/* Comment (last column) */}
        <td className="px-3 py-2 w-16">
          <button
            type="button"
            onClick={() => setCommentingBugId(bug.bugId)}
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-primary-100 hover:text-primary-700 transition"
            title="Add comment"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        </td>
      </tr>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
              <th className="px-3 py-2.5 w-12">View</th>
              <th className="px-3 py-2.5 w-40">Project</th>
              <th className="px-3 py-2.5 min-w-[280px]">Title</th>
              <th className="px-3 py-2.5 w-28">Type</th>
              <th className="px-3 py-2.5 w-32">Status</th>
              <th className="px-3 py-2.5 w-28">Severity</th>
              <th className="px-3 py-2.5 w-32">Category</th>
              <th className="px-3 py-2.5 w-40">Assigned</th>
              <th className="px-3 py-2.5 w-32">Reported By</th>
              <th className="px-3 py-2.5 w-16">Comment</th>
            </tr>
          </thead>
          <tbody>
            {bugs.map((bug) => {
              const isOpen = !!expanded[bug.bugId]
              const subtasks = subtasksByParent[bug.bugId] || []
              const isLoadingSubs = loadingSubtasksFor.has(bug.bugId)
              return (
                <React.Fragment key={bug.bugId}>
                  {renderRow(bug, 0)}
                  {isOpen && (
                    <>
                      {/* Description accordion */}
                      <tr>
                        <td colSpan={TOTAL_COLUMNS} className="p-0">
                          {renderDescriptionAccordion(bug)}
                        </td>
                      </tr>
                      {/* Subtask loading */}
                      {isLoadingSubs && (
                        <tr>
                          <td colSpan={TOTAL_COLUMNS} className="px-6 py-3 text-xs text-gray-500 bg-gray-50/40">
                            <Loader2 className="inline h-3.5 w-3.5 animate-spin mr-2" />
                            Loading subtasks...
                          </td>
                        </tr>
                      )}
                      {/* Subtask rows (nested) */}
                      {!isLoadingSubs && subtasks.length > 0 && subtasks.map(st => renderRow(st, 1))}
                      {!isLoadingSubs && subtasks.length === 0 && (
                        <tr>
                          <td colSpan={TOTAL_COLUMNS} className="px-6 py-2 text-xs text-gray-400 italic bg-gray-50/40">
                            No subtasks.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {bugs.length === 0 && (
        <div className="text-center py-12 text-sm text-gray-500">
          No bugs match the current filters.
        </div>
      )}

      {/* Comment composer */}
      {commentingBugId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
          onClick={() => !postingComment && setCommentingBugId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Add comment to <span className="font-mono text-gray-600">{commentingBugId.slice(-6)}</span>
              </h3>
              <button
                onClick={() => setCommentingBugId(null)}
                className="text-gray-400 hover:text-gray-600"
                disabled={postingComment}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Write your comment..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setCommentingBugId(null)}
                disabled={postingComment}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePostComment}
                disabled={postingComment || !commentText.trim()}
                className="px-3 py-1.5 text-sm text-black bg-primary hover:bg-primary-600 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {postingComment ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
