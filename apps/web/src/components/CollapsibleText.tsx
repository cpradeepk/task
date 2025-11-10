'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface CollapsibleTextProps {
  content: string
  /** Maximum characters to show in preview (default: 300) */
  maxCharacters?: number
  /** Maximum lines to show in preview (default: 5) */
  maxLines?: number
  /** Show title above content (optional) */
  title?: string
  /** Text size class (default: 'text-gray-700') */
  textClassName?: string
  /** Button position: 'right' | 'left' (default: 'right') */
  buttonPosition?: 'right' | 'left'
  /** Show gradient overlay when collapsed (default: true) */
  showGradient?: boolean
  /** Gradient background color (default: 'white') */
  gradientColor?: string
  /** Persist expanded state in localStorage (default: false) */
  persistState?: boolean
  /** Unique key for localStorage (required if persistState=true) */
  storageKey?: string
  /** Render HTML content safely (default: false) */
  renderHtml?: boolean
  /** Custom render function for the expand/collapse button (optional) */
  renderButton?: (props: { isExpanded: boolean; needsCollapse: boolean; toggleExpanded: () => void }) => React.ReactNode
}

/**
 * CollapsibleText Component
 * 
 * A reusable component for displaying long text content with expand/collapse functionality.
 * 
 * Features:
 * - Smart collapse logic: Only shows expand/collapse UI when content exceeds thresholds
 * - Preview mode: Shows first N lines or N characters (whichever is shorter)
 * - Fade-out gradient overlay when collapsed
 * - Configurable expand/collapse button position
 * - Smooth transitions
 * - Optional state persistence in localStorage
 * - Maintains whitespace-pre-wrap for formatted text
 * 
 * @example
 * // Basic usage
 * <CollapsibleText content={longText} />
 * 
 * @example
 * // With custom thresholds and title
 * <CollapsibleText 
 *   content={description}
 *   title="Description"
 *   maxCharacters={500}
 *   maxLines={10}
 * />
 * 
 * @example
 * // With persistent state
 * <CollapsibleText 
 *   content={comment}
 *   persistState={true}
 *   storageKey="comment-123-expanded"
 * />
 */
export default function CollapsibleText({
  content,
  maxCharacters = 300,
  maxLines = 5,
  title,
  textClassName = 'text-gray-700',
  buttonPosition = 'right',
  showGradient = true,
  gradientColor = 'white',
  persistState = false,
  storageKey,
  renderHtml = false,
  renderButton
}: CollapsibleTextProps) {
  // Load initial state from localStorage if persistence is enabled
  const getInitialState = (): boolean => {
    if (!persistState || !storageKey) return false
    
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      return saved === 'true'
    }
    return false
  }

  const [isExpanded, setIsExpanded] = useState(getInitialState)

  // Save state to localStorage when it changes
  const toggleExpanded = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    
    if (persistState && storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(newState))
    }
  }

  // Check if content is long enough to need collapsing
  const lines = content.split('\n')
  const needsCollapse = content.length > maxCharacters || lines.length > maxLines

  // Get preview content
  const getPreviewContent = () => {
    if (!needsCollapse) return content

    // Take first N lines or first N characters, whichever is shorter
    const linePreview = lines.slice(0, maxLines).join('\n')
    if (linePreview.length <= maxCharacters) {
      return linePreview
    }
    return content.substring(0, maxCharacters)
  }

  const previewContent = getPreviewContent()
  const hiddenLinesCount = lines.length - maxLines

  // Determine button alignment class
  const buttonAlignClass = buttonPosition === 'left' ? 'justify-start' : 'justify-end'

  return (
    <div>
      {/* Title and Expand/Collapse Button (only if renderButton is not provided) */}
      {!renderButton && (title || needsCollapse) && (
        <div className={`flex items-center ${buttonAlignClass} mb-2 ${title ? 'justify-between' : ''}`}>
          {title && <h3 className="font-medium text-gray-900">{title}</h3>}
          {needsCollapse && (
            <button
              onClick={toggleExpanded}
              className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors"
              aria-label={isExpanded ? 'Show less' : 'Show more'}
            >
              {isExpanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Show more </span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Custom button render (if provided) */}
      {renderButton && renderButton({ isExpanded, needsCollapse, toggleExpanded })}

      {/* Content */}
      <div className="relative">
        {renderHtml ? (
          <div
            className={`prose prose-sm max-w-none ${textClassName}`}
            dangerouslySetInnerHTML={{
              __html: isExpanded || !needsCollapse ? content : previewContent
            }}
          />
        ) : (
          <p className={`${textClassName} whitespace-pre-wrap break-words`}>
            {isExpanded || !needsCollapse ? content : previewContent}
          </p>
        )}

        {/* Gradient Overlay */}
        {!isExpanded && needsCollapse && showGradient && (
          <div
            className={`absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-${gradientColor} to-transparent pointer-events-none`}
            style={{ background: `linear-gradient(to top, ${gradientColor}, transparent)` }}
          />
        )}
      </div>
    </div>
  )
}

