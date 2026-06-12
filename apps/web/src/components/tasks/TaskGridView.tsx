'use client'

/**
 * TaskGridView Component
 *
 * Excel-like editable grid for tasks with:
 *   - Inline editing (click cell → dropdown/input → blur or Enter saves)
 *   - Per-row expand to show description + dates + nested subtasks
 *   - "+" comment button per row → quick composer modal (posts to activity log)
 *
 * Column order (left → right):
 *   View | Project | Name (with expand) | Status | Priority |
 *   Assigned | Assigned By | Start | End | Comment
 *
 * Multi-assignee note: clicking the Assigned cell opens a single-select
 * dropdown that REPLACES the array with one assignee. To manage multiple
 * assignees, use the detail page (View icon).
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Task, User, Project } from '@/lib/types'
import { updateTask } from '@/lib/taskService'
import { getCurrentUser } from '@/lib/auth'
import {
  Eye,
  MessageSquarePlus,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import {
  getTaskStatusStyle,
  getTaskPriorityStyle,
  type BadgeStyle,
} from '@/lib/statusColors'

interface SettingItem { value: string; icon?: string }

interface TaskGridViewProps {
  tasks: Task[]
  users: User[]
  projects: Array<Pick<Project, 'projectId' | 'projectName'>>
  settingsData: {
    taskStatuses: SettingItem[]
    taskPriorities: SettingItem[]
  }
  onTasksChange: (updater: (prev: Task[]) => Task[]) => void
}

type EditableField =
  | 'name' | 'status' | 'priority' | 'assignedTo' | 'projectId'
  | 'startDate' | 'endDate'

type EditingCell = { taskId: string; field: EditableField } | null

const DEFAULT_STATUS_OPTIONS: Task['status'][] = [
  'Yet to Start', 'In Progress', 'Delayed', 'Done', 'Cancel', 'Hold', 'ReOpened', 'Stop'
]
const DEFAULT_PRIORITY_OPTIONS: Task['priority'][] = ['U&I', 'NU&I', 'U&NI', 'NU&NI']

// Status/priority styles come from the shared semantic system
// (@/lib/statusColors). Every badge pairs color with an icon so colorblind
// users aren't relying on color alone.

const TOTAL_COLUMNS = 10

export default function TaskGridView({
  tasks,
  users,
  projects,
  settingsData,
  onTasksChange
}: TaskGridViewProps) {
  const router = useRouter()
  const [editing, setEditing] = useState<EditingCell>(null)
  const [draftValue, setDraftValue] = useState<string>('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [commentingTaskId, setCommentingTaskId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  // Per-task expansion + subtasks cache
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [subtasksByParent, setSubtasksByParent] = useState<Record<string, Task[]>>({})
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

  const statusOptions = settingsData.taskStatuses.length > 0
    ? settingsData.taskStatuses.map(s => s.value)
    : DEFAULT_STATUS_OPTIONS
  const priorityOptions = settingsData.taskPriorities.length > 0
    ? settingsData.taskPriorities.map(s => s.value)
    : DEFAULT_PRIORITY_OPTIONS

  const startEdit = (taskId: string, field: EditableField, currentValue: string) => {
    setEditing({ taskId, field })
    setDraftValue(currentValue ?? '')
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraftValue('')
  }

  const applyUpdateToRow = useCallback(
    (taskId: string, field: EditableField, newValue: string | string[] | null) => {
      onTasksChange(prev => prev.map(t => t.taskId === taskId ? { ...t, [field]: newValue } : t))
      setSubtasksByParent(prev => {
        const next: Record<string, Task[]> = {}
        for (const [parentId, list] of Object.entries(prev)) {
          next[parentId] = list.map(t => t.taskId === taskId ? { ...t, [field]: newValue } : t)
        }
        return next
      })
    }, [onTasksChange]
  )

  const saveEdit = async (task: Task) => {
    if (!editing) return
    const field = editing.field

    // For assignedTo: convert single-select value to array (or null for unassigned)
    let newValue: string | string[] | null = draftValue
    if (field === 'assignedTo') {
      newValue = draftValue ? [draftValue] : []
    } else if (draftValue.trim() === '' && field !== 'name') {
      newValue = null
    }

    // No-op short circuit
    const prev = (task as any)[field]
    const same = field === 'assignedTo'
      ? JSON.stringify(prev ?? []) === JSON.stringify(newValue ?? [])
      : (prev ?? '') === (newValue ?? '')
    if (same) {
      cancelEdit()
      return
    }

    setSavingId(task.taskId)
    const previousValue = prev
    applyUpdateToRow(task.taskId, field, newValue)

    try {
      await updateTask(task.taskId, { [field]: newValue } as Partial<Task>)
    } catch (err) {
      console.error('Failed to save edit:', err)
      applyUpdateToRow(task.taskId, field, previousValue)
      alert(`Failed to update ${field}`)
    } finally {
      setSavingId(null)
      cancelEdit()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, task: Task) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit(task)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const handlePostComment = async () => {
    if (!commentingTaskId || !commentText.trim()) return
    const currentUser = getCurrentUser()
    if (!currentUser) {
      alert('Not authenticated')
      return
    }
    setPostingComment(true)
    try {
      const res = await fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'task',
          entityId: commentingTaskId,
          actionType: 'comment',
          description: commentText.trim(),
          isComment: true
        })
      })
      if (res.ok) {
        setCommentingTaskId(null)
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

  const toggleExpand = async (task: Task) => {
    const isOpen = !!expanded[task.taskId]
    setExpanded(prev => ({ ...prev, [task.taskId]: !isOpen }))
    if (!isOpen && !subtasksByParent[task.taskId]) {
      setLoadingSubtasksFor(prev => {
        const n = new Set(prev); n.add(task.taskId); return n
      })
      try {
        const res = await fetch(`/api/tasks/subtasks?parentTaskId=${encodeURIComponent(task.taskId)}`)
        if (res.ok) {
          const json = await res.json()
          const list: Task[] = json.data || json.tasks || []
          setSubtasksByParent(prev => ({ ...prev, [task.taskId]: list }))
        } else {
          setSubtasksByParent(prev => ({ ...prev, [task.taskId]: [] }))
        }
      } catch (err) {
        console.error('Failed to load subtasks for', task.taskId, err)
        setSubtasksByParent(prev => ({ ...prev, [task.taskId]: [] }))
      } finally {
        setLoadingSubtasksFor(prev => {
          const n = new Set(prev); n.delete(task.taskId); return n
        })
      }
    }
  }

  const renderEditableBadge = (
    task: Task,
    field: EditableField,
    value: string | null | undefined,
    options: string[],
    styleResolver: (v: string | null | undefined) => BadgeStyle,
    optionLabelFn: (v: string) => string = v => v,
    placeholder = '—'
  ) => {
    const isEditing = editing?.taskId === task.taskId && editing.field === field
    if (isEditing) {
      return (
        <select
          ref={el => { inputRef.current = el }}
          value={draftValue}
          onChange={e => setDraftValue(e.target.value)}
          onBlur={() => saveEdit(task)}
          onKeyDown={e => handleKeyDown(e, task)}
          className="w-full px-2 py-1 text-xs border-2 border-primary rounded focus:outline-none bg-white"
        >
          <option value="">—</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{optionLabelFn(opt)}</option>
          ))}
        </select>
      )
    }
    if (!value) {
      return (
        <button
          type="button"
          onClick={() => startEdit(task.taskId, field, '')}
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
        onClick={() => startEdit(task.taskId, field, value ?? '')}
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border w-full text-left hover:ring-2 hover:ring-primary/40 transition ${s.className}`}
        title={`${s.label} (click to edit)`}
      >
        <Icon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
        <span className="truncate">{s.label}</span>
      </button>
    )
  }

  const renderAssigneesDisplay = (assignees: string[] | undefined) => {
    const list = assignees || []
    if (list.length === 0) return <span className="text-gray-400 italic">unassigned</span>
    const names = list.map(id => userMap[id] || id)
    if (names.length === 1) return <span className="truncate">{names[0]}</span>
    return (
      <span className="truncate" title={names.join(', ')}>
        {names[0]} <span className="text-gray-500">+{names.length - 1}</span>
      </span>
    )
  }

  const renderDescriptionAccordion = (task: Task) => {
    const hasContent = task.description || task.remarks || task.difficulties
    return (
      <div className="px-6 py-4 bg-primary-50/30 border-t border-primary-100">
        {!hasContent ? (
          <p className="text-sm text-gray-500 italic">No description.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
            {task.description && (
              <div className="lg:col-span-2">
                <h4 className="font-semibold text-gray-900 mb-1">Description</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
            {typeof task.estimatedHours === 'number' && (
              <div>
                <span className="font-semibold text-gray-900">Estimated Hours: </span>
                <span className="text-gray-700">{task.estimatedHours}</span>
              </div>
            )}
            {typeof task.actualHours === 'number' && (
              <div>
                <span className="font-semibold text-gray-900">Actual Hours: </span>
                <span className="text-gray-700">{task.actualHours}</span>
              </div>
            )}
            {task.remarks && (
              <div className="lg:col-span-2">
                <h4 className="font-semibold text-gray-900 mb-1">Remarks</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{task.remarks}</p>
              </div>
            )}
            {task.difficulties && (
              <div className="lg:col-span-2">
                <h4 className="font-semibold text-gray-900 mb-1">Difficulties</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{task.difficulties}</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderRow = (task: Task, depth = 0) => {
    const isSaving = savingId === task.taskId
    const isEditingName = editing?.taskId === task.taskId && editing.field === 'name'
    const isOpen = !!expanded[task.taskId]
    const isSubtaskRow = depth > 0
    const firstAssignee = (task.assignedTo && task.assignedTo[0]) || ''

    return (
      <tr
        key={task.taskId}
        className={`border-b border-gray-100 hover:bg-primary-50/30 transition ${
          isSubtaskRow ? 'bg-gray-50/60' : ''
        }`}
      >
        {/* View */}
        <td className="px-3 py-2 w-12">
          <div className="flex items-center gap-1">
            {isSubtaskRow && (
              <span
                className="text-gray-400 select-none"
                title="Subtask"
                style={{ marginLeft: (depth - 1) * 16 }}
              >↳</span>
            )}
            <button
              type="button"
              onClick={() => router.push(`/tasks/${task.taskId}`)}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition"
              title="Open detail"
            >
              <Eye className="h-4 w-4" />
            </button>
            {isSaving && <Loader2 className="h-3.5 w-3.5 text-primary-600 animate-spin" />}
          </div>
        </td>

        {/* Project */}
        <td className="px-3 py-2 w-40">
          {editing?.taskId === task.taskId && editing.field === 'projectId' ? (
            <select
              ref={el => { inputRef.current = el }}
              value={draftValue}
              onChange={e => setDraftValue(e.target.value)}
              onBlur={() => saveEdit(task)}
              onKeyDown={e => handleKeyDown(e, task)}
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
              onClick={() => startEdit(task.taskId, 'projectId', task.projectId ?? '')}
              className="text-left w-full text-xs text-gray-700 truncate hover:text-primary-700"
              title={task.projectId ? projectMap[task.projectId] : 'Set project'}
            >
              {task.projectId ? (projectMap[task.projectId] || task.projectId) : (
                <span className="text-gray-400 italic">no project</span>
              )}
            </button>
          )}
        </td>

        {/* Name (title) with expand chevron */}
        <td className="px-3 py-2 min-w-[280px]">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <input
                ref={el => { inputRef.current = el }}
                type="text"
                value={draftValue}
                onChange={e => setDraftValue(e.target.value)}
                onBlur={() => saveEdit(task)}
                onKeyDown={e => handleKeyDown(e, task)}
                className="flex-1 px-2 py-1 text-sm border-2 border-primary rounded focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => startEdit(task.taskId, 'name', task.name)}
                className="text-left flex-1 text-sm text-gray-900 hover:text-primary-700 truncate"
                title={task.name}
              >
                {task.name}
              </button>
            )}
            {!isSubtaskRow && (
              <button
                type="button"
                onClick={() => toggleExpand(task)}
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

        {/* Status */}
        <td className="px-3 py-2 w-32">
          {renderEditableBadge(task, 'status', task.status, statusOptions, getTaskStatusStyle)}
        </td>

        {/* Priority */}
        <td className="px-3 py-2 w-32">
          {renderEditableBadge(
            task,
            'priority',
            task.priority,
            priorityOptions,
            getTaskPriorityStyle
          )}
        </td>

        {/* Assigned (multi → single edit) */}
        <td className="px-3 py-2 w-40">
          {editing?.taskId === task.taskId && editing.field === 'assignedTo' ? (
            <select
              ref={el => { inputRef.current = el }}
              value={draftValue}
              onChange={e => setDraftValue(e.target.value)}
              onBlur={() => saveEdit(task)}
              onKeyDown={e => handleKeyDown(e, task)}
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
              onClick={() => startEdit(task.taskId, 'assignedTo', firstAssignee)}
              className="text-left w-full text-xs text-gray-700 truncate hover:text-primary-700"
              title={(task.assignedTo || []).map(id => userMap[id] || id).join(', ') || 'unassigned'}
            >
              {renderAssigneesDisplay(task.assignedTo)}
            </button>
          )}
        </td>

        {/* Assigned By */}
        <td className="px-3 py-2 w-32 text-xs text-gray-600 truncate">
          {userMap[task.assignedBy] || task.assignedBy}
        </td>

        {/* Start Date */}
        <td className="px-3 py-2 w-32">
          {editing?.taskId === task.taskId && editing.field === 'startDate' ? (
            <input
              ref={el => { inputRef.current = el }}
              type="date"
              value={draftValue ? draftValue.split('T')[0] : ''}
              onChange={e => setDraftValue(e.target.value)}
              onBlur={() => saveEdit(task)}
              onKeyDown={e => handleKeyDown(e, task)}
              className="w-full px-2 py-1 text-xs border-2 border-primary rounded focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => startEdit(task.taskId, 'startDate', task.startDate ?? '')}
              className="text-left w-full text-xs text-gray-700 truncate hover:text-primary-700"
            >
              {task.startDate
                ? new Date(task.startDate).toLocaleDateString()
                : <span className="text-gray-400 italic">not set</span>}
            </button>
          )}
        </td>

        {/* End Date */}
        <td className="px-3 py-2 w-32">
          {editing?.taskId === task.taskId && editing.field === 'endDate' ? (
            <input
              ref={el => { inputRef.current = el }}
              type="date"
              value={draftValue ? draftValue.split('T')[0] : ''}
              onChange={e => setDraftValue(e.target.value)}
              onBlur={() => saveEdit(task)}
              onKeyDown={e => handleKeyDown(e, task)}
              className="w-full px-2 py-1 text-xs border-2 border-primary rounded focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => startEdit(task.taskId, 'endDate', task.endDate ?? '')}
              className="text-left w-full text-xs text-gray-700 truncate hover:text-primary-700"
            >
              {task.endDate
                ? new Date(task.endDate).toLocaleDateString()
                : <span className="text-gray-400 italic">not set</span>}
            </button>
          )}
        </td>

        {/* Comment */}
        <td className="px-3 py-2 w-16">
          <button
            type="button"
            onClick={() => setCommentingTaskId(task.taskId)}
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
              <th className="px-3 py-2.5 min-w-[280px]">Name</th>
              <th className="px-3 py-2.5 w-32">Status</th>
              <th className="px-3 py-2.5 w-32">Priority</th>
              <th className="px-3 py-2.5 w-40">Assigned</th>
              <th className="px-3 py-2.5 w-32">Assigned By</th>
              <th className="px-3 py-2.5 w-32">Start</th>
              <th className="px-3 py-2.5 w-32">End</th>
              <th className="px-3 py-2.5 w-16">Comment</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => {
              const isOpen = !!expanded[task.taskId]
              const subtasks = subtasksByParent[task.taskId] || []
              const isLoadingSubs = loadingSubtasksFor.has(task.taskId)
              return (
                <React.Fragment key={task.taskId}>
                  {renderRow(task, 0)}
                  {isOpen && (
                    <>
                      <tr>
                        <td colSpan={TOTAL_COLUMNS} className="p-0">
                          {renderDescriptionAccordion(task)}
                        </td>
                      </tr>
                      {isLoadingSubs && (
                        <tr>
                          <td colSpan={TOTAL_COLUMNS} className="px-6 py-3 text-xs text-gray-500 bg-gray-50/40">
                            <Loader2 className="inline h-3.5 w-3.5 animate-spin mr-2" />
                            Loading subtasks...
                          </td>
                        </tr>
                      )}
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

      {tasks.length === 0 && (
        <div className="text-center py-12 text-sm text-gray-500">
          No tasks match the current filters.
        </div>
      )}

      {/* Comment composer */}
      {commentingTaskId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
          onClick={() => !postingComment && setCommentingTaskId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Add comment to <span className="font-mono text-gray-600">{commentingTaskId}</span>
              </h3>
              <button
                onClick={() => setCommentingTaskId(null)}
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
                onClick={() => setCommentingTaskId(null)}
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
