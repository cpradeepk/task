'use client'

import { useState, useEffect } from 'react'
import { X, Link as LinkIcon, Image as ImageIcon, FileText, Youtube, Upload, Loader2 } from 'lucide-react'
import { QUERIES, MUTATIONS } from '@/lib/graphql-queries'

// Helper function to execute GraphQL queries
async function executeGraphQLQuery(query: string, variables: any = {}) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })

  const result = await response.json()
  if (result.errors) {
    console.error('GraphQL errors:', result.errors)
    throw new Error(result.errors[0]?.message || 'GraphQL query failed')
  }
  return result.data
}

// Helper function to execute GraphQL mutations
async function executeGraphQLMutation(mutation: string, variables: any = {}) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: mutation, variables })
  })

  const result = await response.json()
  if (result.errors) {
    console.error('GraphQL errors:', result.errors)
    throw new Error(result.errors[0]?.message || 'GraphQL mutation failed')
  }
  return result.data
}

interface Topic {
  id: string
  topicName: string
  icon: string | null
}

interface PostCreatorProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated: () => void
}

type ContentType = 'text' | 'link' | 'image' | 'video' | 'pdf' | 'youtube'

// Helper function to extract YouTube video ID from URL
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

export default function PostCreator({ isOpen, onClose, onPostCreated }: PostCreatorProps) {
  const [contentType, setContentType] = useState<ContentType>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingPreview, setIsFetchingPreview] = useState(false)
  const [ogPreview, setOgPreview] = useState<any>(null)
  const [uploadedFile, setUploadedFile] = useState<{
    url: string
    name: string
    size: number
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchTopics()
    }
  }, [isOpen])

  const fetchTopics = async () => {
    try {
      console.log('🔵 [PostCreator] Fetching topics via GraphQL...')
      const data = await executeGraphQLQuery(QUERIES.GET_FEED_TOPICS, {
        includePersonal: true
      })

      // Filter out "Saved Posts"
      const filteredTopics = data.feedTopics.filter((t: any) => !t.isSaved)
      setTopics(filteredTopics)
      console.log('✅ [PostCreator] Topics fetched successfully:', filteredTopics.length)
    } catch (error) {
      console.error('❌ [PostCreator] Error fetching topics:', error)
    }
  }

  const fetchLinkPreview = async () => {
    if (!linkUrl) return

    setIsFetchingPreview(true)
    setOgPreview(null) // Clear previous preview
    try {
      const response = await fetch(`/api/feed/og-preview?url=${encodeURIComponent(linkUrl)}`)
      const data = await response.json()
      if (data.success) {
        setOgPreview(data.data)
        if (!title) setTitle(data.data.title || '')
      } else {
        // Show error message to user
        alert(`Failed to fetch preview: ${data.error}${data.details ? '\n' + data.details : ''}`)
      }
    } catch (error) {
      console.error('Error fetching link preview:', error)
      alert('Failed to fetch link preview. Please check your internet connection and try again.')
    } finally {
      setIsFetchingPreview(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes: Record<ContentType, string[]> = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/webm', 'video/quicktime'],
      pdf: ['application/pdf'],
      text: [],
      link: [],
      youtube: []
    }

    if (contentType !== 'text' && contentType !== 'link' && contentType !== 'youtube') {
      if (!validTypes[contentType].includes(file.type)) {
        alert(`Invalid file type for ${contentType}`)
        return
      }
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'feed')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        setUploadedFile({
          url: data.url,
          name: file.name,
          size: file.size
        })
      } else {
        alert('File upload failed: ' + data.error)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('File upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (selectedTopics.length === 0) {
      alert('Please select at least one topic')
      return
    }

    if (contentType === 'text' && !content) {
      alert('Please enter some content')
      return
    }

    if (contentType === 'link' && !linkUrl) {
      alert('Please enter a link URL')
      return
    }

    if ((contentType === 'image' || contentType === 'video' || contentType === 'pdf') && !uploadedFile) {
      alert('Please upload a file')
      return
    }

    if (contentType === 'youtube' && !youtubeUrl) {
      alert('Please enter a YouTube URL')
      return
    }

    setIsSubmitting(true)
    try {
      console.log('🔵 [PostCreator] Creating post via GraphQL...')

      // Prepare media URLs based on content type
      let mediaUrls: string[] = []
      if (uploadedFile) {
        mediaUrls = [uploadedFile.url]
      }

      // Convert YouTube URL to embed URL if needed
      let finalLinkUrl = linkUrl
      if (contentType === 'youtube' && youtubeUrl) {
        // Extract video ID from YouTube URL
        const videoId = extractYouTubeVideoId(youtubeUrl)
        if (videoId) {
          finalLinkUrl = `https://www.youtube.com/embed/${videoId}`
        } else {
          alert('Invalid YouTube URL. Please use a valid YouTube video URL.')
          setIsSubmitting(false)
          return
        }
      }

      const data = await executeGraphQLMutation(MUTATIONS.CREATE_FEED_POST, {
        input: {
          contentType,
          content: content || '',
          linkUrl: finalLinkUrl || null,
          linkTitle: ogPreview?.title || title || null,
          linkDescription: ogPreview?.description || null,
          linkImage: ogPreview?.image || null,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : null,
          topicIds: selectedTopics
        }
      })

      console.log('✅ [PostCreator] Post created successfully:', data.createFeedPost.postId)
      alert('Post created successfully! It will be visible after approval.')
      resetForm()
      onPostCreated()
      onClose()
    } catch (error) {
      console.error('❌ [PostCreator] Error creating post:', error)
      alert('Failed to create post: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setContentType('text')
    setTitle('')
    setContent('')
    setLinkUrl('')
    setYoutubeUrl('')
    setSelectedTopics([])
    setOgPreview(null)
    setUploadedFile(null)
  }

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Content Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setContentType('text')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${
                  contentType === 'text'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Text
              </button>
              <button
                onClick={() => setContentType('link')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${
                  contentType === 'link'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                Link
              </button>
              <button
                onClick={() => setContentType('image')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${
                  contentType === 'image'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Image
              </button>
              <button
                onClick={() => setContentType('youtube')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${
                  contentType === 'youtube'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Youtube className="w-4 h-4" />
                YouTube
              </button>
              <button
                onClick={() => setContentType('pdf')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${
                  contentType === 'pdf'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={() => setContentType('video')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${
                  contentType === 'video'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-4 h-4" />
                Video
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your post..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Content based on type */}
          {contentType === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {contentType === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link URL *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={fetchLinkPreview}
                    disabled={!linkUrl || isFetchingPreview}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    {isFetchingPreview ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Preview'}
                  </button>
                </div>
              </div>
              {ogPreview && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  {ogPreview.image && (
                    <img src={ogPreview.image} alt="Preview" className="w-full h-32 object-cover rounded mb-2" />
                  )}
                  <h4 className="font-semibold">{ogPreview.title}</h4>
                  {ogPreview.description && (
                    <p className="text-sm text-gray-600 mt-1">{ogPreview.description}</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {contentType === 'youtube' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube URL *
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {(contentType === 'image' || contentType === 'video' || contentType === 'pdf') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload {contentType.charAt(0).toUpperCase() + contentType.slice(1)} *
                </label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept={
                    contentType === 'image' ? 'image/*' :
                    contentType === 'video' ? 'video/*' :
                    'application/pdf'
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  disabled={isUploading}
                />
                {isUploading && (
                  <p className="text-sm text-blue-600 mt-2">Uploading...</p>
                )}
                {uploadedFile && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">✓ {uploadedFile.name} uploaded</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Topics */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topics * (Select at least one)
            </label>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedTopics.includes(topic.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {topic.icon} {topic.topicName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Posting...
              </>
            ) : (
              'Post'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

