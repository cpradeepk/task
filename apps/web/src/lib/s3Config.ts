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
  'video/webm'
]

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

