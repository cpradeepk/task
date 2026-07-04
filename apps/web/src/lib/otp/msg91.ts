// MSG91 SMS/OTP delivery (server-side only).
// Sends a templated SMS carrying an app-generated OTP. We manage OTP
// generation/verification ourselves (see ./store) and use MSG91 purely as the
// delivery channel via its DLT-approved Flow template.

const MSG91_FLOW_URL = 'https://control.msg91.com/api/v5/flow/'

interface Msg91Config {
  authKey: string
  templateId: string
  senderId?: string
}

function getConfig(): Msg91Config {
  const authKey = process.env.MSG91_AUTH_KEY
  const templateId = process.env.MSG91_DLT_TEMPLATE_ID
  if (!authKey || !templateId) {
    throw new Error('MSG91 is not configured (MSG91_AUTH_KEY / MSG91_DLT_TEMPLATE_ID)')
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

  const body: Record<string, unknown> = {
    template_id: templateId,
    recipients: [{ mobiles: mobile, otp }],
  }
  if (senderId) body.sender = senderId

  const res = await fetch(MSG91_FLOW_URL, {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
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
