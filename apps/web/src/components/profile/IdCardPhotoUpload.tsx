'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react'
import Image from 'next/image'

interface IdCardPhotoUploadProps {
  currentPhotoUrl?: string
  onUploadSuccess: (photoUrl: string) => void
}

export default function IdCardPhotoUpload({ currentPhotoUrl, onUploadSuccess }: IdCardPhotoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  const MAX_SIZE_MB = 5

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Only PNG, JPG, JPEG, and WEBP images are allowed.'
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > MAX_SIZE_MB) {
      return `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size of ${MAX_SIZE_MB}MB`
    }

    return null
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSuccess('')

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first')
      return
    }

    setIsUploading(true)
    setError('')
    setSuccess('')

    try {
      // Step 1: Get presigned URL from backend
      const presignedResponse = await fetch('/api/upload/id-card-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size
        })
      })

      const presignedResult = await presignedResponse.json()

      if (!presignedResult.success) {
        throw new Error(presignedResult.error || 'Failed to get upload URL')
      }

      // Step 2: Upload file directly to S3
      const s3Response = await fetch(presignedResult.uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type
        }
      })

      if (!s3Response.ok) {
        throw new Error('Failed to upload file to S3')
      }

      // Step 3: Update user's id_card_photo field in database
      const updateResponse = await fetch('/api/upload/id-card-photo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileUrl: presignedResult.fileUrl
        })
      })

      const updateResult = await updateResponse.json()

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update profile')
      }

      setSuccess('ID card photo uploaded successfully!')
      onUploadSuccess(presignedResult.fileUrl)
      setSelectedFile(null)
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Failed to upload photo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
    setPreview(currentPhotoUrl || null)
    setError('')
    setSuccess('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Preview */}
      {preview && (
        <div className="relative w-full max-w-md mx-auto">
          <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
            <Image
              src={preview}
              alt="ID Card Photo Preview"
              fill
              className="object-contain"
            />
          </div>
          {selectedFile && (
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
              title="Remove photo"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* File Input */}
      <div className="flex flex-col items-center space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          id="id-card-photo-input"
        />
        
        <label
          htmlFor="id-card-photo-input"
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors border border-gray-300"
        >
          <ImageIcon className="h-5 w-5" />
          <span>{selectedFile ? 'Change Photo' : 'Select Photo'}</span>
        </label>

        {selectedFile && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center space-x-2 px-6 py-2 bg-primary hover:bg-primary/90 text-black rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>Upload Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* File Info */}
      {selectedFile && (
        <div className="text-sm text-gray-600 text-center">
          <p className="font-medium">{selectedFile.name}</p>
          <p>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>Accepted formats: PNG, JPG, JPEG, WEBP</p>
        <p>Maximum file size: 5MB</p>
      </div>
    </div>
  )
}

