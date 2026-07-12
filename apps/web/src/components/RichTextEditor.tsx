'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Code, Heading1, Heading2, Heading3 } from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

export default function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = 'Write something...',
  minHeight = '120px'
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800'
        }
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content,
    immediatelyRender: false, // Fix SSR hydration mismatch in Next.js
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none p-4'
      }
    }
  })

  if (!editor) return null

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="border border-gray-300 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
      {/* Toolbar */}
      <div className="flex items-center space-x-1 p-2 bg-gray-50 dark:bg-neutral-900 border-b border-gray-300 dark:border-neutral-700 flex-wrap gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors ${
            editor.isActive('bold') ? 'bg-gray-300 dark:bg-neutral-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-300 dark:bg-neutral-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-neutral-700 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors ${
            editor.isActive('heading', { level: 1 }) ? 'bg-gray-300 dark:bg-neutral-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'
          }`}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-300 dark:bg-neutral-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'
          }`}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors ${
            editor.isActive('heading', { level: 3 }) ? 'bg-gray-300 dark:bg-neutral-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'
          }`}
          title="Heading 3 (sub-heading)"
        >
          <Heading3 className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-neutral-700 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-300 dark:bg-neutral-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'
          }`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors ${
            editor.isActive('orderedList') ? 'bg-gray-300 dark:bg-neutral-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-neutral-700 mx-1" />

        <button
          type="button"
          onClick={addLink}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors ${
            editor.isActive('link') ? 'bg-gray-300 dark:bg-neutral-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'
          }`}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors ${
            editor.isActive('codeBlock') ? 'bg-gray-300 dark:bg-neutral-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-neutral-400'
          }`}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

