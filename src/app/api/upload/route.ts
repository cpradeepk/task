/**
 * File Upload API Route
 * Handles image uploads for bug attachments
 */

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'bugs')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']

/**
 * POST /api/upload
 * Upload one or more image files
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No files provided'
        },
        { status: 400 }
      )
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const uploadedFiles: string[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push(`${file.name}: Invalid file type. Only images are allowed.`)
          continue
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File size exceeds 10MB limit.`)
          continue
        }

        // Generate unique filename
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 15)
        const extension = path.extname(file.name)
        const filename = `${timestamp}-${randomString}${extension}`

        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Write file to disk
        const filepath = path.join(UPLOAD_DIR, filename)
        await writeFile(filepath, buffer)

        // Store relative URL path
        uploadedFiles.push(`/uploads/bugs/${filename}`)
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error)
        errors.push(`${file.name}: Upload failed`)
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No files were uploaded successfully',
          errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`
    })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload files'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/upload
 * Get upload configuration
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    config: {
      maxFileSize: MAX_FILE_SIZE,
      maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
      allowedTypes: ALLOWED_TYPES,
      uploadDir: '/uploads/bugs'
    }
  })
}

