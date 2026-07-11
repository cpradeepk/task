// Server-side HTML sanitization for user-authored rich text (e.g. requirement
// sections). RichTextEditor emits raw HTML; sanitize it on write before it is
// persisted so stored content can never carry active markup.
//
// isomorphic-dompurify works in both Node (server) and the browser, unlike the
// bare `dompurify` (which needs a DOM). Keep the allow-list aligned with what
// the Tiptap StarterKit + Link extension can produce.
import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
  'h2', 'h3', 'ul', 'ol', 'li', 'a', 'hr', 'span',
]

const ALLOWED_ATTR = ['href', 'target', 'rel']

export function sanitizeRequirementHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force safe link behaviour; block javascript: and data: URLs.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  })
}
