'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, Send, Paperclip, Image as ImageIcon, Loader2 } from 'lucide-react'
import LoadingButton from '@/components/ui/LoadingButton'

interface CreatePostModalProps {
    isOpen: boolean
    onClose: () => void
    onPostCreated: () => void
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
    const [content, setContent] = useState('')
    const [title, setTitle] = useState('')
    const [topics, setTopics] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setContent('')
            setTitle('')
            setTopics([])
            setError('')
        }
    }, [isOpen])

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) return

        setIsLoading(true)
        setError('')

        try {
            const response = await fetch('/api/feed/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    content,
                    topics,
                    // Attachments would go here
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to create post')
            }

            onPostCreated()
            onClose()
        } catch (err) {
            setError('Failed to create post. Please try again.')
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop z-[100000] overflow-hidden"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Create New Post</h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Title (Optional)
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="input-field"
                                placeholder="Give your post a title..."
                            />
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Content *
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                                className="input-field h-full min-h-[200px] resize-none"
                                placeholder="What's on your mind?"
                            />
                        </div>

                        {/* Topics and Attachments placeholders */}
                        <div className="border-t pt-4">
                            <p className="text-sm text-gray-500 mb-2">Add to your post</p>
                            <div className="flex space-x-2">
                                <button type="button" className="p-2 text-gray-500 hover:bg-gray-100 rounded-md">
                                    <ImageIcon className="h-5 w-5" />
                                </button>
                                <button type="button" className="p-2 text-gray-500 hover:bg-gray-100 rounded-md">
                                    <Paperclip className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-secondary mr-3"
                            >
                                Cancel
                            </button>
                            <LoadingButton
                                type="submit"
                                isLoading={isLoading}
                                loadingText="Posting..."
                                variant="primary"
                                className="flex items-center space-x-2"
                            >
                                <Send className="h-4 w-4" />
                                <span>Post</span>
                            </LoadingButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
