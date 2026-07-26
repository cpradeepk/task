/**
 * Human-facing labels for the `bugs.type` discriminator.
 *
 * The development module stores features, bugs and releases in the same `bugs`
 * table, separated only by `type` (CHECK: 'feature' | 'bug' | 'other' | 'release',
 * or NULL for older rows — see migration 056). The UI already branches on this,
 * but the notification and email layers did not, so a feature request was
 * announced as "🐛 Bug Assigned". Everything user-facing should go through here.
 */

export type WorkItemType = 'feature' | 'bug' | 'other' | 'release' | null | undefined

interface WorkItemLabels {
  /** Singular noun, title case: "Feature Request". */
  noun: string
  /** Emoji used in email subjects. */
  emoji: string
  /** Label for the free-text field that differs per type. */
  descriptionLabel: string
}

const LABELS: Record<string, WorkItemLabels> = {
  feature: { noun: 'Feature Request', emoji: '✨', descriptionLabel: 'Feature Description' },
  bug: { noun: 'Bug Report', emoji: '🐛', descriptionLabel: 'Steps to Reproduce' },
  release: { noun: 'Release', emoji: '🚀', descriptionLabel: 'Release Notes' },
  other: { noun: 'Work Item', emoji: '📋', descriptionLabel: 'Description' },
}

// Rows created before `type` existed are NULL and have always been treated as bugs.
const FALLBACK = LABELS.bug

export function workItemLabels(type: WorkItemType): WorkItemLabels {
  if (!type) return FALLBACK
  return LABELS[type] || FALLBACK
}

/** e.g. "Feature Request" — use in subjects, headings and notification text. */
export function workItemNoun(type: WorkItemType): string {
  return workItemLabels(type).noun
}

/** e.g. "✨ Feature Request Assigned: Dark mode (DEV-12)" */
export function workItemSubject(
  type: WorkItemType,
  action: 'Assigned' | 'Created',
  title: string,
  id: string
): string {
  const { noun, emoji } = workItemLabels(type)
  return `${emoji} ${noun} ${action}: ${title} (${id})`
}
