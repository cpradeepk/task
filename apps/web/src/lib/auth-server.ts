// Server-side authentication utilities
// This file does NOT have 'use client' directive and can be used in API routes

import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export interface TokenPayload {
  employeeId: string
  role: string
  name: string
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

/**
 * Resolve the JWT secret. Never falls back to a hardcoded default — if the
 * secret is missing the process must fail loudly rather than sign/verify tokens
 * with a well-known key.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET is not configured (must be set to a strong random value)')
  }
  return secret
}

/**
 * Sign a JWT for an authenticated user.
 */
export function signAuthToken(payload: TokenPayload): string {
  return jwt.sign(
    { employeeId: payload.employeeId, role: payload.role, name: payload.name },
    getJwtSecret(),
    { expiresIn: TOKEN_TTL_SECONDS }
  )
}

interface AuthUserLike {
  employeeId: string
  role: string
  name: string
}

/**
 * Build a NextResponse that carries the auth token both as an httpOnly cookie
 * (web) and in the JSON body (mobile/API). Shared by the password-login and
 * OTP-verify routes so both issue identical sessions. The `password` field is
 * stripped from the returned user for safety.
 */
export function issueAuthToken<T extends AuthUserLike>(
  user: T,
  extra: Record<string, unknown> = {}
): NextResponse {
  const token = signAuthToken({
    employeeId: user.employeeId,
    role: user.role,
    name: user.name,
  })

  const { password: _password, ...safeUser } = user as T & { password?: unknown }

  const response = NextResponse.json({
    success: true,
    data: safeUser,
    token,
    ...extra,
  })

  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_TTL_SECONDS,
    path: '/',
  })

  return response
}

/**
 * Verify JWT token (server-side only)
 * @param token - JWT token string
 * @returns Decoded token payload or null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret())
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

export type AuthResult =
  | { ok: true; user: TokenPayload }
  | { ok: false; response: NextResponse }

function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 401 })
}

function forbidden(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 403 })
}

/**
 * Require a valid authenticated user. Returns a discriminated result so callers
 * can early-return the 401 response.
 */
export async function requireAuth(request: Request): Promise<AuthResult> {
  const user = await getAuthUser(request)
  if (!user) return { ok: false, response: unauthorized() }
  return { ok: true, user }
}

/**
 * Require an authenticated user whose role is in `roles`.
 */
export async function requireRole(
  request: Request,
  roles: string[]
): Promise<AuthResult> {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth
  if (!roles.includes(auth.user.role)) {
    return { ok: false, response: forbidden('Insufficient permissions') }
  }
  return auth
}

/**
 * Authorize access to a project's secrets: admin/top_management everywhere, or
 * a user assigned to the specific project (row in project_users).
 * Kept here (not in resolvers) so REST routes can reuse it.
 */
export async function assertProjectSecretAccess(
  request: Request,
  projectId: string
): Promise<AuthResult> {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth

  const { user } = auth
  if (user.role === 'admin' || user.role === 'top_management') {
    return auth
  }

  // Lazy import to avoid pulling the pg pool into non-DB code paths.
  const { query } = await import('./db/config')
  const rows = await query<Array<{ exists: boolean }>>(
    'SELECT 1 AS exists FROM project_users WHERE employee_id = $1 AND project_id = $2 LIMIT 1',
    [user.employeeId, projectId]
  )
  if (!rows || rows.length === 0) {
    return { ok: false, response: forbidden('No access to this project') }
  }
  return auth
}

