'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { Shield, Lock, RefreshCw, LogOut, KeyRound } from 'lucide-react'

interface SecurityContextType {
  isUnlocked: boolean
  isPinSet: boolean
  biometricEnabled: boolean
  setIsUnlocked: (val: boolean) => void
  setIsPinSet: (val: boolean) => void
  setBiometricEnabled: (val: boolean) => void
  registerWebBiometrics: () => Promise<boolean>
  authenticateWebBiometrics: () => Promise<boolean>
  /** Open the PIN setup screen. Only ever called from Profile → Security. */
  beginPinSetup: () => void
  /** Remove this user's PIN and any enrolled biometric credential. */
  disablePin: () => void
}

/**
 * The app lock is OPT-IN and per user.
 *
 * It used to be forced: any signed-in user without a PIN was shown a mandatory
 * full-screen setup with no way past it. Because the hash lived under a single
 * global localStorage key that was never persisted server-side, a new browser,
 * a private window, cleared site data, or signing out from the lock screen
 * itself all wiped it — so the setup screen reappeared on essentially every
 * login. It is now something you switch on from Profile → Security.
 */
const LEGACY_PIN_KEY = 'jsr_user_pin'
const pinKeyFor = (employeeId: string) => `jsr_user_pin:${employeeId}`

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

export function useSecurity() {
  const context = useContext(SecurityContext)
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider')
  }
  return context
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, _setIsUnlocked] = useState(false)
  const setIsUnlocked = (val: boolean) => {
    _setIsUnlocked(val)
    if (typeof window !== 'undefined') {
      if (val) {
        sessionStorage.setItem('jsr_unlocked', 'true')
        localStorage.setItem('jsr_last_active', Date.now().toString())
      } else {
        sessionStorage.removeItem('jsr_unlocked')
        localStorage.removeItem('jsr_last_active')
      }
    }
  }
  const [isPinSet, setIsPinSet] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [isThemeDark, setIsThemeDark] = useState(false)
  // True only while the user is deliberately enrolling a PIN from Profile.
  const [isEnrolling, setIsEnrolling] = useState(false)

  // PIN Inputs for setups
  const [setupPin, setSetupPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create')
  const [setupError, setSetupError] = useState('')
  const [showEnableBiometricOffer, setShowEnableBiometricOffer] = useState(false)

  // PIN Input for Unlock
  const [unlockPin, setUnlockPin] = useState('')
  const [unlockError, setUnlockError] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when screen or step shifts
  useEffect(() => {
    if (isClient && currentUser && (!isPinSet || !isUnlocked)) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isClient, currentUser, isPinSet, isUnlocked, setupStep, showEnableBiometricOffer])

  const focusInput = () => {
    inputRef.current?.focus()
  }

  const handleBackgroundClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input')) {
      return
    }
    focusInput()
  }

  const handleForceLogout = async () => {
    // Deliberately does NOT delete the user's PIN — wiping it here is what
    // guaranteed a "Create Security PIN" prompt on the next sign-in.
    localStorage.removeItem('jsr_current_user')
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('jsr_unlocked')
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    window.location.href = '/'
  }

  useEffect(() => {
    setIsClient(true)
    const user = getCurrentUser()
    setCurrentUser(user)

    // Sync theme dynamically with documentElement class list changes
    const updateTheme = () => {
      setIsThemeDark(document.documentElement.classList.contains('dark'))
    }
    updateTheme()

    const observer = new MutationObserver(() => {
      updateTheme()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    // Listen to beforeunload to persist last active timestamp on reload/close
    const handleBeforeUnload = () => {
      if (sessionStorage.getItem('jsr_unlocked') === 'true') {
        localStorage.setItem('jsr_last_active', Date.now().toString())
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // The old global key could belong to a different account on a shared browser,
    // so it is discarded rather than migrated — inheriting someone else's PIN
    // would lock the current user out of a screen they cannot bypass.
    localStorage.removeItem(LEGACY_PIN_KEY)

    if (user) {
      const pin = localStorage.getItem(pinKeyFor(user.employeeId))
      const bioEnabled = localStorage.getItem('jsr_biometric_enabled') === 'true'
      setIsPinSet(!!pin)
      setBiometricEnabled(bioEnabled)

      if (pin) {
        // Check if unlocked in session OR if user was active recently (within 5 minutes)
        const wasUnlocked = sessionStorage.getItem('jsr_unlocked') === 'true'
        const lastActive = localStorage.getItem('jsr_last_active')
        let shouldUnlock = wasUnlocked

        if (lastActive) {
          const elapsed = Date.now() - parseInt(lastActive, 10)
          if (elapsed < 5 * 60 * 1000) {
            shouldUnlock = true
            sessionStorage.setItem('jsr_unlocked', 'true')
          }
        }

        _setIsUnlocked(shouldUnlock)
      } else {
        _setIsUnlocked(true)
      }
    } else {
      _setIsUnlocked(true)
    }

    return () => {
      observer.disconnect()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Auto-lock after 5 minutes of inactivity (tab hidden or unfocused)
  useEffect(() => {
    if (!currentUser || !isPinSet) return

    let lockTimer: ReturnType<typeof setTimeout> | null = null
    const LOCK_DELAY_MS = 5 * 60 * 1000 // 5 minutes

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Start a 5-minute timer to lock
        lockTimer = setTimeout(() => {
          setIsUnlocked(false)
        }, LOCK_DELAY_MS)
        // Also save the timestamp when the tab was hidden for cross-session checks
        sessionStorage.setItem('jsr_hidden_at', Date.now().toString())
        localStorage.setItem('jsr_last_active', Date.now().toString())
      } else {
        // Tab is visible again — cancel the lock timer if user returned within 5 minutes
        if (lockTimer) {
          clearTimeout(lockTimer)
          lockTimer = null
        }
        // Check if the user was away for more than 5 minutes (e.g. browser was closed and reopened)
        const hiddenAt = localStorage.getItem('jsr_last_active') || sessionStorage.getItem('jsr_hidden_at')
        if (hiddenAt) {
          const elapsed = Date.now() - parseInt(hiddenAt, 10)
          if (elapsed >= LOCK_DELAY_MS) {
            setIsUnlocked(false)
          } else {
            // Keep unlocked & update last active timestamp
            if (sessionStorage.getItem('jsr_unlocked') === 'true') {
              localStorage.setItem('jsr_last_active', Date.now().toString())
            }
          }
          sessionStorage.removeItem('jsr_hidden_at')
        }
      }
    }

    // On mount, check if there's a stale hidden_at/last_active timestamp (e.g. page was refreshed after being away)
    const hiddenAt = localStorage.getItem('jsr_last_active') || sessionStorage.getItem('jsr_hidden_at')
    if (hiddenAt) {
      const elapsed = Date.now() - parseInt(hiddenAt, 10)
      if (elapsed >= LOCK_DELAY_MS) {
        setIsUnlocked(false)
      }
      sessionStorage.removeItem('jsr_hidden_at')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (lockTimer) clearTimeout(lockTimer)
    }
  }, [currentUser, isPinSet])

  // Update last active timestamp on user activity
  useEffect(() => {
    if (!currentUser || !isPinSet || !isUnlocked) return

    let lastSaved = Date.now()
    const updateActivity = () => {
      const now = Date.now()
      // Throttle to update at most once every 10 seconds to save writes
      if (now - lastSaved > 10 * 1000) {
        localStorage.setItem('jsr_last_active', now.toString())
        lastSaved = now
      }
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })
    }
  }, [currentUser, isPinSet, isUnlocked])

  // Periodically check if user state has changed (e.g. login/logout)
  useEffect(() => {
    const checkUserInterval = setInterval(() => {
      const user = getCurrentUser()
      if (user?.employeeId !== currentUser?.employeeId) {
        const isInitialLoad = currentUser === null
        setCurrentUser(user)
        if (user) {
          const pin = localStorage.getItem(pinKeyFor(user.employeeId))
          const bioEnabled = localStorage.getItem('jsr_biometric_enabled') === 'true'
          setIsPinSet(!!pin)
          setBiometricEnabled(bioEnabled)
          if (!isInitialLoad) {
            setIsUnlocked(!pin)
          }
        } else {
          setIsUnlocked(true)
          setIsPinSet(false)
          setBiometricEnabled(false)
          setIsEnrolling(false)
        }
      }
    }, 1000)

    return () => clearInterval(checkUserInterval)
  }, [currentUser])

  // Helper: Hashing PIN locally (SubtleCrypto SHA-256)
  const hashPin = async (rawPin: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(rawPin + 'jsr-salt-secure')
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Helper: Check if biometrics (WebAuthn) is supported and context is secure
  const isBiometricsSupportedOnWeb = (): boolean => {
    return typeof window !== 'undefined' && 
           !!window.PublicKeyCredential && 
           window.isSecureContext
  }

  // WebAuthn Biometrics: Register Credential
  const registerWebBiometrics = async (): Promise<boolean> => {
    try {
      if (!isBiometricsSupportedOnWeb()) {
        alert('Biometric authentication is not supported or not available in this insecure origin.')
        return false
      }

      const challenge = new Uint8Array(32)
      window.crypto.getRandomValues(challenge)
      const userID = new Uint8Array(16)
      window.crypto.getRandomValues(userID)

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: "Karmayog Task Management",
          id: window.location.hostname || "localhost",
        },
        user: {
          id: userID,
          name: currentUser?.employeeId || "anonymous",
          displayName: currentUser?.name || "Anonymous User",
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      }

      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      })) as PublicKeyCredential

      if (credential) {
        // Store credential ID in base64
        const rawId = credential.rawId ? btoa(Array.from(new Uint8Array(credential.rawId)).map(c => String.fromCharCode(c)).join('')) : credential.id
        localStorage.setItem('jsr_biometric_credential_id', rawId)
        localStorage.setItem('jsr_biometric_enabled', 'true')
        setBiometricEnabled(true)
        return true
      }
      return false
    } catch (error: any) {
      if (error?.name === 'NotAllowedError') {
        console.warn('WebAuthn Registration cancelled or blocked:', error.message)
      } else {
        console.error('WebAuthn Registration Error:', error)
      }
      return false
    }
  }

  // WebAuthn Biometrics: Authenticate Credential
  const authenticateWebBiometrics = async (): Promise<boolean> => {
    try {
      if (!isBiometricsSupportedOnWeb()) return false
      const credentialId = localStorage.getItem('jsr_biometric_credential_id')
      if (!credentialId) return false

      const challenge = new Uint8Array(32)
      window.crypto.getRandomValues(challenge)

      // Convert base64 back to Uint8Array
      const rawId = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0))

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        allowCredentials: [{
          id: rawId,
          type: 'public-key',
        }],
        userVerification: "required",
        timeout: 60000,
      }

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      })

      if (assertion) {
        setIsUnlocked(true)
        setUnlockPin('')
        return true
      }
      return false
    } catch (error: any) {
      if (error?.name === 'NotAllowedError') {
        console.warn('WebAuthn Authentication cancelled or blocked:', error.message)
      } else {
        console.error('WebAuthn Authentication Error:', error)
      }
      return false
    }
  }

  // Handle auto biometric popup on lock screen mount
  useEffect(() => {
    if (currentUser && isPinSet && !isUnlocked && biometricEnabled && isBiometricsSupportedOnWeb()) {
      // Small timeout to allow prompt to overlay nicely after mounting
      const timer = setTimeout(() => {
        authenticateWebBiometrics()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentUser, isPinSet, isUnlocked, biometricEnabled])

  const handleSetupReset = () => {
    setSetupPin('')
    setConfirmPin('')
    setSetupStep('create')
    setSetupError('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // --- Handlers for PIN Setup (via hidden input) ---
  const handleSetupInputChange = (val: string) => {
    setSetupError('')
    if (setupStep === 'create') {
      setSetupPin(val)
      if (val.length === 4) {
        setTimeout(() => setSetupStep('confirm'), 200)
      }
    } else {
      setConfirmPin(val)
      if (val.length === 4) {
        if (setupPin === val) {
          savePinAndOfferBiometrics(val)
        } else {
          setTimeout(() => {
            setSetupError('PINs do not match. Try again.')
            setConfirmPin('')
          }, 200)
        }
      }
    }
  }

  const savePinAndOfferBiometrics = async (finalPin: string) => {
    if (!currentUser) return
    const hash = await hashPin(finalPin)
    localStorage.setItem(pinKeyFor(currentUser.employeeId), hash)
    setIsPinSet(true)

    if (isBiometricsSupportedOnWeb()) {
      setShowEnableBiometricOffer(true)
    } else {
      setIsEnrolling(false)
      setIsUnlocked(true)
    }
  }

  const beginPinSetup = () => {
    setSetupPin('')
    setConfirmPin('')
    setSetupStep('create')
    setSetupError('')
    setIsEnrolling(true)
  }

  const disablePin = () => {
    if (currentUser) {
      localStorage.removeItem(pinKeyFor(currentUser.employeeId))
    }
    localStorage.removeItem('jsr_biometric_enabled')
    localStorage.removeItem('jsr_biometric_credential_id')
    setIsPinSet(false)
    setBiometricEnabled(false)
    setIsEnrolling(false)
    setIsUnlocked(true)
  }

  const handleOfferResponse = async (enable: boolean) => {
    setShowEnableBiometricOffer(false)
    if (enable) {
      await registerWebBiometrics()
    }
    setIsEnrolling(false)
    setIsUnlocked(true)
  }

  // --- Handlers for PIN Unlock (via hidden input) ---
  const handleUnlockInputChange = async (val: string) => {
    setUnlockError('')
    setUnlockPin(val)
    if (val.length === 4) {
      const storedHash = currentUser ? localStorage.getItem(pinKeyFor(currentUser.employeeId)) : null
      const inputHash = await hashPin(val)
      if (storedHash === inputHash) {
        setIsUnlocked(true)
        setUnlockPin('')
      } else {
        setTimeout(() => {
          setUnlockError('Incorrect security PIN.')
          setUnlockPin('')
        }, 200)
      }
    }
  }

  if (!isClient) return null

  // Flow 1: PIN Setup — shown ONLY when the user opts in from Profile → Security.
  // Previously this was `currentUser && !isPinSet`, which forced every signed-in
  // user without a local PIN through an unskippable setup screen on each login.
  if (currentUser && isEnrolling && !isPinSet) {
    return (
      <div 
        onClick={handleBackgroundClick}
        className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden select-none ${
          isThemeDark 
            ? 'bg-slate-950 text-white' 
            : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 text-gray-900'
        }`}
      >
        {/* Background Gradients */}
        {isThemeDark ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.15),transparent_60%)]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.06),transparent_60%)]" />
          </>
        )}
        
        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="text"
          pattern="[0-9]*"
          inputMode="numeric"
          maxLength={4}
          value={setupStep === 'create' ? setupPin : confirmPin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 4)
            handleSetupInputChange(val)
          }}
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
          autoComplete="off"
          data-lpignore="true"
        />

        <div className={`relative z-10 w-full max-w-md rounded-2xl shadow-2xl p-8 backdrop-blur-xl transition-all duration-300 ${
          isThemeDark 
            ? 'bg-slate-900/80 border border-slate-800' 
            : 'bg-white/80 border border-gray-200 shadow-lg'
        }`}>
          {!showEnableBiometricOffer ? (
            <>
              <div className="flex flex-col items-center justify-center mb-6 text-center">
                <div className={`p-3.5 rounded-2xl mb-4 border ${isThemeDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                  <Shield className={`h-8 w-8 ${isThemeDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                </div>
                <h1 className={`text-2xl font-bold tracking-tight ${isThemeDark ? 'bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent' : 'text-gray-900'}`}>
                  {setupStep === 'create' ? 'Create Security PIN' : 'Confirm Security PIN'}
                </h1>
                <p className={`text-sm mt-2 max-w-xs leading-relaxed ${isThemeDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {setupStep === 'create' 
                    ? 'Enter a 4-digit PIN to secure your account access.' 
                    : 'Verify your PIN to complete setup.'}
                </p>
                <div className={`mt-2 px-3 py-1 rounded-full border text-xs font-mono ${isThemeDark ? 'bg-slate-800/50 border-slate-700/30 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                  Session: {currentUser?.name || currentUser?.employeeId}
                </div>
              </div>

              {/* Dots Indicators */}
              <div className="flex justify-center space-x-6 my-8 cursor-pointer" onClick={focusInput}>
                {[0, 1, 2, 3].map(i => {
                  const active = (setupStep === 'create' ? setupPin : confirmPin).length > i
                  return (
                    <div
                      key={i}
                      className={`h-5 w-5 rounded-full border-2 transition-all duration-200 ${
                        setupError ? 'border-rose-500 bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                        active ? 'border-indigo-500 bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] scale-110' : (isThemeDark ? 'border-slate-700' : 'border-gray-300') + ' bg-transparent'
                      }`}
                    />
                  )
                })}
              </div>

              {/* Error Message */}
              {setupError ? (
                <p className="text-center text-sm font-medium text-rose-400 mb-6 animate-bounce">{setupError}</p>
              ) : (
                <div className={`h-5 mb-6 text-center text-xs ${isThemeDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Type your 4 digits. Touch any dot to focus keyboard.
                </div>
              )}

              {/* Reset / Start Over and Logout Buttons */}
              <div className="flex flex-col gap-3 mt-6">
                {setupStep === 'confirm' && (
                  <button
                    type="button"
                    onClick={handleSetupReset}
                    className={`w-full py-2.5 text-sm font-semibold rounded-xl border transition flex items-center justify-center gap-2 focus:outline-none ${isThemeDark ? 'text-slate-300 hover:text-white border-slate-800 hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 border-gray-200 hover:bg-gray-100'}`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Start Over</span>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={handleForceLogout}
                  className={`w-full py-2.5 text-sm font-semibold rounded-xl border transition flex items-center justify-center gap-2 focus:outline-none ${isThemeDark ? 'text-rose-400 hover:text-rose-300 border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10' : 'text-red-500 hover:text-red-600 border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100'}`}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out / Switch account</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className={`p-3.5 rounded-2xl w-fit mx-auto mb-4 border ${isThemeDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                <Lock className={`h-8 w-8 ${isThemeDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
              <h1 className={`text-2xl font-bold ${isThemeDark ? 'bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent' : 'text-gray-900'}`}>Enable Biometrics?</h1>
              <p className={`text-sm mt-2 mb-8 max-w-xs mx-auto leading-relaxed ${isThemeDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Would you like to enable Touch ID / Face ID biometrics for fast unlocking?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleOfferResponse(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-semibold transition shadow-lg shadow-indigo-600/30"
                >
                  Yes, Enable Biometrics
                </button>
                <button
                  onClick={() => handleOfferResponse(false)}
                  className={`w-full py-3 font-medium rounded-xl border transition ${isThemeDark ? 'bg-slate-800 hover:bg-slate-750 active:bg-slate-800 text-slate-300 border-slate-750' : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-100 text-gray-700 border-gray-200'}`}
                >
                  Skip for Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Intercept Flow 2: PIN Lock Screen
  if (currentUser && isPinSet && !isUnlocked) {
    return (
      <div 
        onClick={handleBackgroundClick}
        className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden select-none ${
          isThemeDark 
            ? 'bg-slate-950 text-white' 
            : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 text-gray-900'
        }`}
      >
        {/* Background Gradients */}
        {isThemeDark ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.15),transparent_60%)]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.06),transparent_60%)]" />
          </>
        )}

        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="text"
          pattern="[0-9]*"
          inputMode="numeric"
          maxLength={4}
          value={unlockPin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 4)
            handleUnlockInputChange(val)
          }}
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
          autoComplete="off"
          data-lpignore="true"
        />

        <div className={`relative z-10 w-full max-w-md rounded-2xl shadow-2xl p-8 backdrop-blur-xl transition-all duration-300 ${
          isThemeDark 
            ? 'bg-slate-900/80 border border-slate-800' 
            : 'bg-white/80 border border-gray-200 shadow-lg'
        }`}>
          <div className="flex flex-col items-center justify-center mb-6 text-center">
            <div className={`p-3.5 rounded-2xl mb-4 border ${isThemeDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
              <Lock className={`h-8 w-8 ${isThemeDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isThemeDark ? 'bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent' : 'text-gray-900'}`}>Karmayog Locked</h1>
            <p className={`text-sm mt-2 max-w-xs leading-relaxed ${isThemeDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Enter your 4-digit security PIN or use biometrics to unlock.
            </p>
            <div className={`mt-2 px-3 py-1 rounded-full border text-xs font-mono ${isThemeDark ? 'bg-slate-800/50 border-slate-700/30 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
              Session: {currentUser?.name || currentUser?.employeeId}
            </div>
          </div>

          {/* Dots Indicators */}
          <div className="flex justify-center space-x-6 my-8 cursor-pointer" onClick={focusInput}>
            {[0, 1, 2, 3].map(i => {
              const active = unlockPin.length > i
              return (
                <div
                  key={i}
                  className={`h-5 w-5 rounded-full border-2 transition-all duration-200 ${
                    unlockError ? 'border-rose-500 bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                    active ? 'border-indigo-500 bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] scale-110' : (isThemeDark ? 'border-slate-700' : 'border-gray-300') + ' bg-transparent'
                  }`}
                />
              )
            })}
          </div>

          {/* Error Message */}
          {unlockError ? (
            <p className="text-center text-sm font-medium text-rose-400 mb-6 animate-bounce">{unlockError}</p>
          ) : (
            <div className={`h-5 mb-6 text-center text-xs ${isThemeDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Type your PIN to unlock. Touch any dot to focus keyboard.
            </div>
          )}

          {/* Biometrics and Logout Actions */}
          <div className="flex flex-col gap-3 mt-6">
            {biometricEnabled && (
              <button
                type="button"
                onClick={authenticateWebBiometrics}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl border border-indigo-500/20 transition flex items-center justify-center gap-2 focus:outline-none shadow-lg shadow-indigo-600/30"
              >
                <KeyRound className="h-5 w-5" />
                <span>Unlock with Biometrics</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={handleForceLogout}
              className={`w-full py-2.5 text-sm font-semibold rounded-xl border transition flex items-center justify-center gap-2 focus:outline-none ${isThemeDark ? 'text-rose-400 hover:text-rose-300 border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10' : 'text-red-500 hover:text-red-600 border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100'}`}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out / Switch account</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Default: Render the regular app layouts if unlocked and configured
  return (
    <SecurityContext.Provider
      value={{
        isUnlocked,
        isPinSet,
        biometricEnabled,
        setIsUnlocked,
        setIsPinSet,
        setBiometricEnabled,
        registerWebBiometrics,
        authenticateWebBiometrics,
        beginPinSetup,
        disablePin,
      }}
    >
      {children}
    </SecurityContext.Provider>
  )
}
