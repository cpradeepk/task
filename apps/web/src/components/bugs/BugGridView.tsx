'use client'

/**
 * BugGridView Component
 *
 * Excel-like editable grid for bugs/test cases.
 * - Click any cell to inline-edit (dropdowns for enums, text input for title)
 * - Changes save immediately via updateBug (optimistic UI)
 * - "+ Comment" button opens an inline composer
 * - Sticky header, zebra rows, compact spacing
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Bug, User, Project } from '@/lib/types'
import { updateBug, addBugComment } from '@/lib/bugService'
import { getCurrentUser } from '@/lib/auth'
import { Eye, MessageSquarePlus, Check, X, Loader2 } from 'lucide-react'

interface SettingItem {
  value: string
  icon?: string
}

interface BugGridViewProps {
  bugs: Bug[]
  users: User[]
  projects: Array<Pick<Project, 'projectId' | 'projectName'>>
  settingsData: {
    bugStatuses: SettingItem[]
    bugSeverities?: SettingItem[]
    bugPriorities?: SettingItem[]
  }
  onBugsChange: (updater: (prev: Bug[]) => Bug[]) => void
}

const SEVERITY_OPTIONS: Bug['severity'][] = ['Critical', 'Major', 'Minor']
const PRIORITY_OPTIONS: Bug['priority'][] = ['High', 'Medium', 'Low']
const CATEGORY_OPTIONS: Bug['category'][] = [
  'UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other'
]
const TYPE_OPTIONS: Array<Exclude<Bug['type'], null | undefined>> = ['testcase', 'feature', 'bug', 'other']

type EditableField =
  | 'title' | 'type' | 'status' | 'priority' | 'severity'
  | 'category' | 'assignedTo' | 'projectId'

type EditingCell = {
  bugId: string
  field: EditableField
} | null

function getStatusColor(status: string): string {
  switch (status) {
    case 'New': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'Resolved': return 'bg-green-100 text-green-800 border-green-200'
    case 'Closed': return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'Reopened': return 'bg-orange-100 text-orange-800 border-orange-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getSeverityColor(sev: string): string {
  switch (sev) {
    case 'Critical': return 'bg-red-100 text-red-800 border-red-200'
    case 'Major': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'Minor': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getPriorityColor(pri: string): string {
  switch (pri) {
    case 'High': return 'bg-red-100 text-red-800 border-red-200'
    case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'Low': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getTypeColor(type: string | null | undefined): string {
  switch (type) {
    case 'bug': return 'bg-red-100 text-red-800 border-red-200'
    case 'testcase': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'feature': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'other': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-50 text-gray-500 border-gray-200'
  }
}

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

  // Focus input when editing starts
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
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

  const saveEdit = async (bug: Bug) => {
    if (!editing) return
    const field = editing.field
    const newValue = draftValue.trim() === '' && field !== 'title' ? null : draftValue

    // No-op if value didn't change
    if ((bug[field] ?? '') === (newValue ?? '')) {
      cancelEdit()
      return
    }

    setSavingId(bug.bugId)
    const previousValue = bug[field]

    // Optimistic update
    onBugsChange(prev => prev.map(b =>
      b.bugId === bug.bugId ? { ...b, [field]: newValue } : b
    ))

    try {
      const success = await updateBug(bug.bugId, { [field]: newValue } as Partial<Bug>)
      if (!success) {
        // Revert
        onBugsChange(prev => prev.map(b =>
          b.bugId === bug.bugId ? { ...b, [field]: previousValue } : b
        ))
        alert(`Failed to update ${field}`)
      }
    } catch (err) {
      console.error('Failed to save edit:', err)
      onBugsChange(prev => prev.map(b =>
        b.bugId === bug.bugId ? { ...b, [field]: previousValue } : b
      ))
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

  const renderEditableBadge = (
    bug: Bug,
    field: EditableField,
    value: string | null | undefined,
    options: string[],
    colorFn: (v: string) => string,
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
          className="w-full px-2 py-1 text-xs border-2 border-primary rounded focus:outline-none"
        >
          <option value="">—</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }
    return (
      <button
        type="button"
        onClick={() => startEdit(bug.bugId, field, value ?? '')}
        className={`px-2 py-1 text-xs font-medium rounded border w-full text-left hover:ring-2 hover:ring-primary/40 transition ${
          value ? colorFn(value) : 'bg-gray-50 text-gray-400 border-dashed border-gray-300'
        }`}
        title="Click to edit"
      >
        {value || placeholder}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
              <th className="px-3 py-2.5 w-16">ID</th>
              <th className="px-3 py-2.5 min-w-[280px]">Title</th>
              <th className="px-3 py-2.5 w-28">Type</th>
              <th className="px-3 py-2.5 w-32">Status</th>
              <th className="px-3 py-2.5 w-28">Priority</th>
              <th className="px-3 py-2.5 w-28">Severity</th>
              <th className="px-3 py-2.5 w-32">Category</th>
              <th className="px-3 py-2.5 w-40">Project</th>
              <th className="px-3 py-2.5 w-40">Assigned</th>
              <th className="px-3 py-2.5 w-32">Reported By</th>
              <th className="px-3 py-2.5 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bugs.map((bug, idx) => {
              const isSaving = savingId === bug.bugId
              const isEditingTitle = editing?.bugId === bug.bugId && editing.field === 'title'
              return (
                <tr
                  key={bug.bugId}
                  className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-primary-50/30 transition`}
                >
                  {/* ID */}
                  <td className="px-3 py-2 text-xs text-gray-500 font-mono whitespace-nowrap">
                    {bug.bugId.slice(-6)}
                  </td>

                  {/* Title — inline text edit */}
                  <td className="px-3 py-2">
                    {isEditingTitle ? (
                      <input
                        ref={el => { inputRef.current = el }}
                        type="text"
                        value={draftValue}
                        onChange={e => setDraftValue(e.target.value)}
                        onBlur={() => saveEdit(bug)}
                        onKeyDown={e => handleKeyDown(e, bug)}
                        className="w-full px-2 py-1 text-sm border-2 border-primary rounded focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(bug.bugId, 'title', bug.title)}
                        className="text-left w-full text-sm text-gray-900 hover:text-primary-700 truncate block max-w-md"
                        title={bug.title}
                      >
                        {bug.title}
                      </button>
                    )}
                  </td>

                  {/* Type */}
                  <td className="px-3 py-2">
                    {renderEditableBadge(bug, 'type', bug.type, TYPE_OPTIONS as string[], getTypeColor, 'set type')}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2">
                    {renderEditableBadge(bug, 'status', bug.status, statusOptions, getStatusColor)}
                  </td>

                  {/* Priority */}
                  <td className="px-3 py-2">
                    {renderEditableBadge(bug, 'priority', bug.priority, PRIORITY_OPTIONS, getPriorityColor)}
                  </td>

                  {/* Severity */}
                  <td className="px-3 py-2">
                    {renderEditableBadge(bug, 'severity', bug.severity, SEVERITY_OPTIONS, getSeverityColor)}
                  </td>

                  {/* Category */}
                  <td className="px-3 py-2">
                    {renderEditableBadge(
                      bug, 'category', bug.category, CATEGORY_OPTIONS,
                      () => 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    )}
                  </td>

                  {/* Project */}
                  <td className="px-3 py-2">
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

                  {/* Assigned To */}
                  <td className="px-3 py-2">
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
                  <td className="px-3 py-2 text-xs text-gray-600 truncate">
                    {userMap[bug.reportedBy] || bug.reportedBy}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      {isSaving && (
                        <Loader2 className="h-3.5 w-3.5 text-primary-600 animate-spin" />
                      )}
                      <button
                        type="button"
                        onClick={() => setCommentingBugId(bug.bugId)}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-primary-100 hover:text-primary-700 transition"
                        title="Add comment"
                      >
                        <MessageSquarePlus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/bugs/${bug.bugId}`)}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition"
                        title="Open detail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {bugs.length === 0 && (
        <div className="text-center py-12 text-sm text-gray-500">
          No bugs to display.
        </div>
      )}

      {/* Inline comment modal */}
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
