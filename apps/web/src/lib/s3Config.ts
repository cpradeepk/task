/**
 * AWS S3 Configuration
 * 
 * This module provides S3 client configuration for file uploads.
 * Uses environment variables for credentials.
 */

import { S3Client } from '@aws-sdk/client-s3'

// Validate required environment variables
const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET'
]

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.warn(
    `⚠️  Missing AWS S3 environment variables: ${missingVars.join(', ')}\n` +
    `   File uploads will not work until these are configured in Vercel.`
  )
}

// Create S3 client
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

// S3 bucket name
export const S3_BUCKET = process.env.AWS_S3_BUCKET || ''

// S3 bucket region
export const S3_REGION = process.env.AWS_REGION || 'us-east-1'

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed file types for bug attachments
export const ALLOWED_FILE_TYPES = [
  // Images
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  // Documents
  'text/plain',                    // .txt
  'text/markdown',                 // .md
  'application/octet-stream',      // .prd (generic binary)
  // Code files
  'application/json',              // .json
  'text/javascript',               // .js
  'application/javascript',        // .js (alternative)
  'text/jsx',                      // .jsx
  'text/typescript',               // .ts
  'text/tsx',                      // .tsx
  // SQL
  'application/sql',               // .sql
  'text/x-sql'                     // .sql (alternative)
]

// File extension to MIME type mapping (for files with ambiguous MIME types)
export const FILE_EXTENSION_MIME_MAP: Record<string, string[]> = {
  '.txt': ['text/plain'],
  '.md': ['text/markdown', 'text/plain'],
  '.prd': ['application/octet-stream', 'text/plain'],
  '.json': ['application/json', 'text/plain'],
  '.js': ['text/javascript', 'application/javascript', 'text/plain'],
  '.jsx': ['text/jsx', 'text/javascript', 'text/plain'],
  '.ts': ['text/typescript', 'text/plain'],
  '.tsx': ['text/tsx', 'text/typescript', 'text/plain'],
  '.sql': ['application/sql', 'text/x-sql', 'text/plain'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.mp4': ['video/mp4'],
  '.mov': ['video/quicktime'],
  '.avi': ['video/x-msvideo'],
  '.webm': ['video/webm']
}

// Helper function to validate file type by extension and MIME type
export function isValidFileType(filename: string, mimeType: string): boolean {
  // Get file extension
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0]

  if (!ext) {
    return false
  }

  // Check if extension is supported
  const allowedMimeTypes = FILE_EXTENSION_MIME_MAP[ext]
  if (!allowedMimeTypes) {
    return false
  }

  // Check if MIME type matches or is in allowed list
  return allowedMimeTypes.includes(mimeType) || ALLOWED_FILE_TYPES.includes(mimeType)
}

// Check if S3 is configured
export function isS3Configured(): boolean {
  return missingVars.length === 0 && !!S3_BUCKET
}

// Get S3 file URL
export function getS3FileUrl(key: string): string {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`
}

// Generate S3 key for bug attachment
export function generateBugAttachmentKey(filename: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `bugs/${timestamp}-${randomString}-${sanitizedFilename}`
}

// Generate S3 key for comment attachment
export function generateCommentAttachmentKey(filename: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `comments/${timestamp}-${randomString}-${sanitizedFilename}`
}

// Generate S3 key for ID card photo
export function generateIdCardPhotoKey(employeeId: string, filename: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `id-cards/${employeeId}-${timestamp}-${randomString}-${sanitizedFilename}`
}

