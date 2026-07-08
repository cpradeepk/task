// Redis-backed OTP store (server-side only).
// Stores only a salted hash of the OTP, never the plaintext. Enforces a short
// TTL, an attempt cap, and a per-identifier request throttle.

import crypto from 'crypto'
import { redisCache } from '@/lib/redis'

const OTP_TTL_MINUTES = 5
const MAX_VERIFY_ATTEMPTS = 5
const RESEND_COOLDOWN_SECONDS = 30
const MAX_REQUESTS_PER_HOUR = 5

interface OtpRecord {
  hash: string
  expiresAt: number
  attempts: number
}

interface ThrottleRecord {
  count: number
  windowStartedAt: number
  lastSentAt: number
}

function otpKey(employeeId: string): string {
  return `otp:code:${employeeId.toLowerCase()}`
}

function throttleKey(employeeId: string): string {
  return `otp:throttle:${employeeId.toLowerCase()}`
}

function hashOtp(employeeId: string, otp: string): string {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || ''
  return crypto
    .createHmac('sha256', secret)
    .update(`${employeeId.toLowerCase()}:${otp}`)
    .digest('hex')
}

/** Generate a cryptographically-random 6-digit OTP. */
export function generateOtp(): string {
  // 0..999999, zero-padded — crypto.randomInt is uniform.
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export interface RequestGate {
  allowed: boolean
  reason?: 'cooldown' | 'hourly_limit'
  retryAfterSeconds?: number
}

/**
 * Check (and record) whether a new OTP may be sent for this identifier.
 * Sliding 1-hour window with a short resend cooldown.
 */
export async function canRequestOtp(employeeId: string): Promise<RequestGate> {
  const now = Date.now()
  const key = throttleKey(employeeId)
  const existing = await redisCache.get<ThrottleRecord>(key)

  if (existing) {
    const withinWindow = now - existing.windowStartedAt < 60 * 60 * 1000
    const sinceLast = (now - existing.lastSentAt) / 1000
    if (sinceLast < RESEND_COOLDOWN_SECONDS) {
      return {
        allowed: false,
        reason: 'cooldown',
        retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - sinceLast),
      }
    }
    if (withinWindow && existing.count >= MAX_REQUESTS_PER_HOUR) {
      return {
        allowed: false,
        reason: 'hourly_limit',
        retryAfterSeconds: Math.ceil((60 * 60 * 1000 - (now - existing.windowStartedAt)) / 1000),
      }
    }
  }

  const next: ThrottleRecord =
    existing && now - existing.windowStartedAt < 60 * 60 * 1000
      ? { count: existing.count + 1, windowStartedAt: existing.windowStartedAt, lastSentAt: now }
      : { count: 1, windowStartedAt: now, lastSentAt: now }

  await redisCache.set(key, next, 60) // keep the throttle window for 60 minutes
  return { allowed: true }
}

/** Persist a freshly generated OTP (hashed) for later verification. */
export async function saveOtp(employeeId: string, otp: string): Promise<void> {
  const record: OtpRecord = {
    hash: hashOtp(employeeId, otp),
    expiresAt: Date.now() + OTP_TTL_MINUTES * 60 * 1000,
    attempts: 0,
  }
  await redisCache.set(otpKey(employeeId), record, OTP_TTL_MINUTES)
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'not_found' | 'too_many_attempts' | 'mismatch' }

/**
 * Verify a submitted OTP. Consumes the code on success; counts attempts and
 * locks after MAX_VERIFY_ATTEMPTS on failure.
 */
export async function verifyOtp(employeeId: string, otp: string): Promise<VerifyResult> {
  const key = otpKey(employeeId)
  const record = await redisCache.get<OtpRecord>(key)

  if (!record) return { ok: false, reason: 'not_found' }
  if (Date.now() > record.expiresAt) {
    await redisCache.delete(key)
    return { ok: false, reason: 'expired' }
  }
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    await redisCache.delete(key)
    return { ok: false, reason: 'too_many_attempts' }
  }

  const candidate = hashOtp(employeeId, otp)
  const matches =
    candidate.length === record.hash.length &&
    crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(record.hash))

  if (!matches) {
    const updated: OtpRecord = { ...record, attempts: record.attempts + 1 }
    const remainingMs = Math.max(record.expiresAt - Date.now(), 1000)
    await redisCache.set(key, updated, Math.ceil(remainingMs / 60000))
    return { ok: false, reason: 'mismatch' }
  }

  await redisCache.delete(key)
  return { ok: true }
}
