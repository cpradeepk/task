/**
 * Requirement helpers — status/label styling and HTML⇄plain-text conversion.
 *
 * The web editor stores rich HTML (Tiptap). Mobile has no HTML renderer, so we
 * show sections as plain text and, when a section is edited on mobile, convert
 * the edited plain text back to simple, server-sanitizable HTML. Rich
 * formatting authored on the web is therefore viewed (not rendered) on mobile;
 * saving a section on mobile rewrites that section's HTML from the plain text.
 */

export const REQUIREMENT_STATUSES = [
  'Draft',
  'In Review',
  'Approved',
  'Rejected',
  'Implemented',
  'Verified',
  'Deprecated',
] as const

export const SECTION_LABELS = [
  'Functional',
  'Non-Functional',
  'Constraint',
  'Acceptance Criteria',
  'Note',
] as const

export interface BadgeStyle {
  bg: string
  text: string
}

/**
 * Fixed pastel badge palette — mirrors the existing mobile badge approach
 * (ProjectDetailsScreen) which uses light backgrounds that read well in both
 * light and dark themes.
 */
export function getRequirementStatusStyle(status: string): BadgeStyle {
  switch (status) {
    case 'Draft':
      return { bg: '#F1F3F4', text: '#5F6368' }
    case 'In Review':
      return { bg: '#FEF7E0', text: '#B06000' }
    case 'Approved':
      return { bg: '#E6F4EA', text: '#137333' }
    case 'Rejected':
      return { bg: '#FCE8E6', text: '#C5221F' }
    case 'Implemented':
      return { bg: '#E8F0FE', text: '#1967D2' }
    case 'Verified':
      return { bg: '#E4F7EC', text: '#0B8043' }
    case 'Deprecated':
      return { bg: '#F1F3F4', text: '#80868B' }
    default:
      return { bg: '#F1F3F4', text: '#5F6368' }
  }
}

export function getSectionLabelStyle(label: string): BadgeStyle {
  switch (label) {
    case 'Functional':
      return { bg: '#E8F0FE', text: '#1967D2' }
    case 'Non-Functional':
      return { bg: '#F3E8FD', text: '#8430CE' }
    case 'Constraint':
      return { bg: '#FEF7E0', text: '#B06000' }
    case 'Acceptance Criteria':
      return { bg: '#E6F4EA', text: '#137333' }
    case 'Note':
      return { bg: '#F1F3F4', text: '#5F6368' }
    default:
      return { bg: '#F1F3F4', text: '#5F6368' }
  }
}

/** Decode the handful of HTML entities that survive tag-stripping. */
function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
}

/**
 * Convert stored section HTML to readable plain text for display/editing.
 * Block-level closers and <br> become newlines; list items are bulleted.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return ''
  const withBreaks = html
    .replace(/\r\n/g, '\n')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, '\n')
  const stripped = withBreaks.replace(/<[^>]+>/g, '')
  return decodeEntities(stripped)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/^\s+|\s+$/g, '')
}

/** Escape text before wrapping in HTML tags. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Convert edited plain text back to simple HTML for persistence. Blank lines
 * split paragraphs; single newlines become <br>. Output is minimal and is
 * re-sanitized server-side on write.
 */
export function plainTextToHtml(text: string): string {
  if (!text || !text.trim()) return ''
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** Short preview of a section's text for list/collapsed rows. */
export function previewText(html: string, max = 140): string {
  const text = htmlToPlainText(html).replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}
