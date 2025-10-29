// Server-side authentication utilities
// This file does NOT have 'use client' directive and can be used in API routes

import { cookies } from 'next/headers'

export interface TokenPayload {
  employeeId: string
  role: string
  name: string
}

/**
 * Verify JWT token (server-side only)
 * @param token - JWT token string
 * @returns Decoded token payload or null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    // Server-side JWT verification
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret-key-change-in-production'
    )
    
    return decoded as TokenPayload
  } catch (error) {
    console.error('Failed to verify token:', error)
    return null
  }
}

/**
 * Get authenticated user from request (server-side only)
 * Checks both Authorization header (for mobile/API) and cookies (for web)
 * @param request - Request object
 * @returns Token payload or null if not authenticated
 */
export async function getAuthUser(request: Request): Promise<TokenPayload | null> {
  try {
    // Check Authorization header first (for mobile app / API clients)
    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      return verifyToken(token)
    }

    // Check cookie (for web app)
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('token')
    if (tokenCookie) {
      return verifyToken(tokenCookie.value)
    }

    return null
  } catch (error) {
    console.error('Failed to get auth user:', error)
    return null
  }
}

/**
 * Get authenticated user from cookies only (server-side only)
 * @returns Token payload or null if not authenticated
 */
export async function getAuthUserFromCookies(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('token')

    if (!tokenCookie) {
      return null
    }

    return verifyToken(tokenCookie.value)
  } catch (error) {
    console.error('Failed to get auth user from cookies:', error)
    return null
  }
}

