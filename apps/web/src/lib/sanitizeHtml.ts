// Server-side HTML sanitization for user-authored rich text (e.g. requirement
// sections). RichTextEditor emits raw HTML; sanitize it on write before it is
// persisted so stored content can never carry active markup.
//
// Uses sanitize-html (pure JS, htmlparser2-based). Its predecessor here,
// isomorphic-dompurify, pulls in jsdom whose ESM-only deps crash Vercel's
// serverless require() at module load — which took down the whole /api/graphql
// route. Do not reintroduce jsdom into any server-side import path.
// Keep the allow-list aligned with what the Tiptap StarterKit + Link extension
// can produce.
import sanitizeHtmlLib from 'sanitize-html'

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
  'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'hr', 'span',
]

export function sanitizeRequirementHtml(html: string): string {
  if (!html) return ''
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    // Block javascript:, data: and other active schemes.
    allowedSchemes: ['https', 'http', 'mailto'],
    // Drop disallowed tags but keep their text content (DOMPurify-equivalent).
    disallowedTagsMode: 'discard',
  })
}
