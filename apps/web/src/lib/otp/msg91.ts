// MSG91 SMS/OTP delivery (server-side only).
// Sends a templated SMS carrying an app-generated OTP. We manage OTP
// generation/verification ourselves (see ./store) and use MSG91's OTP API
// purely as the delivery channel, passing our own OTP via the `otp` param.

const MSG91_OTP_URL = 'https://control.msg91.com/api/v5/otp'

interface Msg91Config {
  authKey: string
  templateId: string
  senderId?: string
}

function getConfig(): Msg91Config {
  const authKey = process.env.MSG91_AUTH_KEY
  // Prefer MSG91_TEMPLATE_ID (our standard); fall back to the older name.
  const templateId = process.env.MSG91_TEMPLATE_ID || process.env.MSG91_DLT_TEMPLATE_ID
  if (!authKey || !templateId) {
    throw new Error('MSG91 is not configured (MSG91_AUTH_KEY / MSG91_TEMPLATE_ID)')
  }
  return { authKey, templateId, senderId: process.env.MSG91_SENDER_ID }
}

/**
 * Normalize an Indian mobile number to MSG91's `91XXXXXXXXXX` format.
 * Returns null if the number is not a plausible 10-digit mobile.
 */
export function normalizeIndianMobile(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  return null
}

/**
 * Mask a phone for display, e.g. 919812345678 -> +91 ******5678.
 */
export function maskMobile(mobile: string): string {
  const last4 = mobile.slice(-4)
  return `+91 ******${last4}`
}

/**
 * Send the OTP to the given mobile via MSG91. Never logs the OTP value.
 * Throws on transport/API failure so callers can surface a generic error.
 */
export async function sendOtpSms(mobile: string, otp: string): Promise<void> {
  const { authKey, templateId, senderId } = getConfig()

  // MSG91 OTP API: pass our own OTP so we retain verification control.
  const url = new URL(MSG91_OTP_URL)
  url.searchParams.set('template_id', templateId)
  url.searchParams.set('mobile', mobile)
  url.searchParams.set('otp', otp)
  url.searchParams.set('otp_expiry', '5')
  if (senderId) url.searchParams.set('sender', senderId)

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`MSG91 send failed (${res.status}): ${text.slice(0, 200)}`)
  }

  // MSG91 returns { type: 'success' | 'error', message }
  const json = (await res.json().catch(() => null)) as { type?: string; message?: string } | null
  if (json && json.type && json.type !== 'success') {
    throw new Error(`MSG91 error: ${json.message || 'unknown'}`)
  }
}
