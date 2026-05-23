/**
 * Semantic status / priority / severity color system.
 *
 * Universally understood meanings:
 *   Green  → success / done / resolved / low risk
 *   Red    → urgent / error / overdue / critical
 *   Amber  → warning / in-progress / approaching deadline
 *   Blue   → info / upcoming / new
 *   Gray   → neutral / on hold / cancelled
 *
 * IMPORTANT (accessibility): never rely on color alone. Every badge using
 * this system should also include the matching icon name returned here.
 */

import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  Pause,
  Circle,
  RefreshCw,
  Ban,
  Loader,
} from 'lucide-react'

export type SemanticTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

export interface BadgeStyle {
  tone: SemanticTone
  /** Tailwind classes for background + text + border (works in light + dark mode). */
  className: string
  icon: LucideIcon
  label: string
}

const TONE_CLASSES: Record<SemanticTone, string> = {
  success: 'bg-success-100 text-success-700 border-success-500/40 dark:bg-success-500/15 dark:text-success-300 dark:border-success-500/40',
  danger:  'bg-danger-100 text-danger-700 border-danger-500/40 dark:bg-danger-500/15 dark:text-danger-300 dark:border-danger-500/40',
  warning: 'bg-warning-100 text-warning-700 border-warning-500/40 dark:bg-warning-500/15 dark:text-warning-300 dark:border-warning-500/40',
  info:    'bg-info-100 text-info-700 border-info-500/40 dark:bg-info-500/15 dark:text-info-300 dark:border-info-500/40',
  neutral: 'bg-neutral-100 text-neutral-700 border-neutral-500/40 dark:bg-neutral-500/15 dark:text-neutral-300 dark:border-neutral-500/40',
}

function style(tone: SemanticTone, icon: LucideIcon, label: string): BadgeStyle {
  return { tone, className: TONE_CLASSES[tone], icon, label }
}

/**
 * Bug status → semantic style
 */
export function getBugStatusStyle(status: string | null | undefined): BadgeStyle {
  switch (status) {
    case 'New':         return style('info', Circle, 'New')
    case 'In Progress': return style('warning', Loader, 'In Progress')
    case 'Resolved':    return style('success', CheckCircle2, 'Resolved')
    case 'Closed':      return style('neutral', Ban, 'Closed')
    case 'Reopened':    return style('danger', RefreshCw, 'Reopened')
    default:            return style('neutral', Circle, status || '—')
  }
}

/**
 * Bug severity → semantic style
 */
export function getBugSeverityStyle(severity: string | null | undefined): BadgeStyle {
  switch (severity) {
    case 'Critical': return style('danger', AlertOctagon, 'Critical')
    case 'Major':    return style('warning', AlertTriangle, 'Major')
    case 'Minor':    return style('info', Info, 'Minor')
    default:         return style('neutral', Circle, severity || '—')
  }
}

/**
 * Bug priority → semantic style
 */
export function getBugPriorityStyle(priority: string | null | undefined): BadgeStyle {
  switch (priority) {
    case 'High':   return style('danger', AlertOctagon, 'High')
    case 'Medium': return style('warning', AlertTriangle, 'Medium')
    case 'Low':    return style('success', CheckCircle2, 'Low')
    default:       return style('neutral', Circle, priority || '—')
  }
}

/**
 * Task status → semantic style
 */
export function getTaskStatusStyle(status: string | null | undefined): BadgeStyle {
  switch (status) {
    case 'Yet to Start': return style('info', Circle, 'Yet to Start')
    case 'In Progress':  return style('warning', Loader, 'In Progress')
    case 'Delayed':      return style('danger', AlertTriangle, 'Delayed')
    case 'Done':         return style('success', CheckCircle2, 'Done')
    case 'Cancel':       return style('neutral', Ban, 'Cancelled')
    case 'Hold':         return style('neutral', Pause, 'On Hold')
    case 'ReOpened':     return style('danger', RefreshCw, 'Reopened')
    case 'Stop':         return style('danger', Ban, 'Stopped')
    default:             return style('neutral', Circle, status || '—')
  }
}

/**
 * Task priority (Eisenhower Matrix) → semantic style
 */
export function getTaskPriorityStyle(priority: string | null | undefined): BadgeStyle {
  switch (priority) {
    case 'U&I':   return style('danger', AlertOctagon, 'Urgent & Important')
    case 'NU&I':  return style('warning', AlertTriangle, 'Important')
    case 'U&NI':  return style('warning', AlertTriangle, 'Urgent')
    case 'NU&NI': return style('info', Info, 'Low Priority')
    default:      return style('neutral', Circle, priority || '—')
  }
}

/**
 * Bug type → semantic style (purposely distinct from status — uses a different
 * dimension, so it doesn't conflict with the urgency semantics).
 */
export function getBugTypeStyle(type: string | null | undefined): BadgeStyle {
  switch (type) {
    case 'bug':      return style('danger', AlertOctagon, 'Bug')
    case 'testcase': return style('info', Info, 'Test Case')
    case 'feature':  return style('success', CheckCircle2, 'Feature')
    case 'other':    return style('neutral', Circle, 'Other')
    default:         return style('neutral', Circle, type || '—')
  }
}
