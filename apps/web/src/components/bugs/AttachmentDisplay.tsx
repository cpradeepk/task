'use client'

import { FileText, Image as ImageIcon, Video, Download, ExternalLink, Code } from 'lucide-react'

interface AttachmentDisplayProps {
  url: string
  index: number
  onImageClick?: () => void
}

export default function AttachmentDisplay({ url, index, onImageClick }: AttachmentDisplayProps) {
  // Get file extension from URL
  const getFileExtension = (url: string): string => {
    const match = url.match(/\.([^.?]+)(\?|$)/)
    return match ? `.${match[1].toLowerCase()}` : ''
  }

  // Check if file is an image
  const isImage = (ext: string): boolean => {
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)
  }

  // Check if file is a video
  const isVideo = (ext: string): boolean => {
    return ['.mp4', '.mov', '.avi', '.webm'].includes(ext)
  }

  // Check if file is a document
  const isDocument = (ext: string): boolean => {
    return ['.md', '.txt', '.prd'].includes(ext)
  }

  // Check if file is a code file
  const isCodeFile = (ext: string): boolean => {
    return ['.json', '.js', '.jsx', '.ts', '.tsx', '.sql'].includes(ext)
  }

  // Get file icon and color
  const getFileIcon = (ext: string) => {
    if (isImage(ext)) {
      return { icon: <ImageIcon className="h-12 w-12" />, color: 'text-blue-500', bg: 'bg-blue-50' }
    }
    if (isVideo(ext)) {
      return { icon: <Video className="h-12 w-12" />, color: 'text-purple-500', bg: 'bg-purple-50' }
    }
    if (isDocument(ext)) {
      return { icon: <FileText className="h-12 w-12" />, color: 'text-gray-500', bg: 'bg-gray-50' }
    }
    if (isCodeFile(ext)) {
      return { icon: <Code className="h-12 w-12" />, color: 'text-green-500', bg: 'bg-green-50' }
    }
    return { icon: <FileText className="h-12 w-12" />, color: 'text-gray-400', bg: 'bg-gray-50' }
  }

  // Get filename from URL
  const getFilename = (url: string): string => {
    const parts = url.split('/')
    const lastPart = parts[parts.length - 1]
    // Remove timestamp and random string prefix (e.g., "1234567890-abc123-filename.txt" -> "filename.txt")
    const match = lastPart.match(/\d+-[a-z0-9]+-(.+)/)
    return match ? match[1] : lastPart
  }

  const ext = getFileExtension(url)
  const filename = getFilename(url)
  const { icon, color, bg } = getFileIcon(ext)

  // Handle download
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Render image attachment
  if (isImage(ext)) {
    return (
      <button
        onClick={onImageClick}
        className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg"
      >
        <img
          src={url}
          alt={`Attachment ${index + 1}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
          <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
    )
  }

  // Render video attachment
  if (isVideo(ext)) {
    return (
      <div className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-purple-500 transition-all hover:shadow-lg">
        <video
          src={url}
          className="w-full h-full object-cover"
          controls
        />
      </div>
    )
  }

  // Render document/code file attachment
  return (
    <div className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg bg-white">
      <div className={`w-full h-full flex flex-col items-center justify-center ${bg} p-4`}>
        <div className={color}>
          {icon}
        </div>
        <p className="text-xs font-medium text-gray-700 mt-2 text-center truncate w-full px-2" title={filename}>
          {filename}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {ext.toUpperCase().replace('.', '')}
        </p>
      </div>
      
      {/* Download button overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
        <button
          onClick={handleDownload}
          className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
          title="Download"
        >
          <Download className="h-5 w-5 text-gray-700" />
        </button>
      </div>
    </div>
  )
}

