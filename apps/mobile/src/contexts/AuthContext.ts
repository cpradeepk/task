import React from 'react'

export interface AuthResult {
  success: boolean
  user?: any
  error?: string
  maskedPhone?: string
}

export const AuthContext = React.createContext({
  // Admin/service break-glass password login (kept for fallback)
  signIn: async (employeeId: string, password: string): Promise<AuthResult> => ({ success: false, error: '' }),
  // OTP login (primary): request a code, then verify it
  requestOtp: async (employeeId: string): Promise<AuthResult> => ({ success: false, error: '' }),
  verifyOtp: async (employeeId: string, otp: string): Promise<AuthResult> => ({ success: false, error: '' }),
  // Restore an existing stored session (used by biometric login) without re-authenticating
  restoreSession: async (): Promise<AuthResult> => ({ success: false, error: '' }),
  signOut: async () => { },
  signUp: async () => { },
})
