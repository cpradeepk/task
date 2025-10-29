'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, FileText, AlertCircle, Video } from 'lucide-react'

interface FileUploadProps {
  onFilesChange: (files: File[]) => void
  maxFiles?: number
  maxSizeMB?: number
  acceptedTypes?: string[]
}

interface UploadedFile {
  file: File
  preview?: string
  id: string
}

export default function FileUpload({
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'
  ]
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported. Please upload images or videos only.`
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
      return `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size of ${maxSizeMB}MB`
    }

    return null
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return

    setError('')

    const newFiles: UploadedFile[] = []
    const errors: string[] = []

    // Check total file count
    if (uploadedFiles.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed. You can upload ${maxFiles - uploadedFiles.length} more file(s).`)
      return
    }

    Array.from(files).forEach((file) => {
      const validationError = validateFile(file)
      
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`)
        return
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const uploadedFile: UploadedFile = {
        file,
        id
      }

      // Create preview for images and videos
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          uploadedFile.preview = reader.result as string
          setUploadedFiles(prev => {
            const updated = [...prev]
            const index = updated.findIndex(f => f.id === id)
            if (index !== -1) {
              updated[index] = uploadedFile
            }
            return updated
          })
        }
        reader.readAsDataURL(file)
      }

      newFiles.push(uploadedFile)
    })

    if (errors.length > 0) {
      setError(errors.join('\n'))
    }

    if (newFiles.length > 0) {
      const updated = [...uploadedFiles, ...newFiles]
      setUploadedFiles(updated)
      onFilesChange(updated.map(f => f.file))
    }
  }

  const removeFile = (id: string) => {
    const updated = uploadedFiles.filter(f => f.id !== id)
    setUploadedFiles(updated)
    onFilesChange(updated.map(f => f.file))
    setError('')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        
        <p className="text-sm font-medium text-gray-700 mb-1">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-gray-500">
          Images (PNG, JPG, GIF, WEBP) or Videos (MP4, MOV, AVI, WEBM) up to {maxSizeMB}MB (max {maxFiles} files)
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm whitespace-pre-line">{error}</div>
        </div>
      )}

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Uploaded Files ({uploadedFiles.length}/{maxFiles})
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="relative group rounded-lg border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-shadow"
              >
                {/* Preview */}
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {uploadedFile.preview ? (
                    uploadedFile.file.type.startsWith('video/') ? (
                      <div className="relative w-full h-full">
                        <video
                          src={uploadedFile.preview}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                          <Video className="h-12 w-12 text-white" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={uploadedFile.preview}
                        alt={uploadedFile.file.name}
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <FileText className="h-12 w-12 text-gray-400" />
                  )}
                </div>

                {/* File Info */}
                <div className="p-2 bg-white">
                  <p className="text-xs font-medium text-gray-700 truncate" title={uploadedFile.file.name}>
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(uploadedFile.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(uploadedFile.id)
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

