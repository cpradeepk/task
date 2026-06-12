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
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

export function useSecurity() {
  const context = useContext(SecurityContext)
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider')
  }
  return context
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isPinSet, setIsPinSet] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

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
    localStorage.removeItem('jsr_current_user')
    localStorage.removeItem('jsr_user_pin')
    localStorage.removeItem('jsr_biometric_enabled')
    localStorage.removeItem('jsr_biometric_credential_id')
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    window.location.href = '/'
  }

  useEffect(() => {
    setIsClient(true)
    const user = getCurrentUser()
    setCurrentUser(user)

    if (user) {
      const pin = localStorage.getItem('jsr_user_pin')
      const bioEnabled = localStorage.getItem('jsr_biometric_enabled') === 'true'
      setIsPinSet(!!pin)
      setBiometricEnabled(bioEnabled)
      
      // Initially, if PIN is set, the app starts locked
      if (pin) {
        setIsUnlocked(false)
      } else {
        setIsUnlocked(true)
      }
    } else {
      setIsUnlocked(true)
    }
  }, [])

  // Auto-lock when tab loses focus / becomes hidden
  useEffect(() => {
    if (!currentUser || !isPinSet) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsUnlocked(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentUser, isPinSet])

  // Periodically check if user state has changed (e.g. login/logout)
  useEffect(() => {
    const checkUserInterval = setInterval(() => {
      const user = getCurrentUser()
      if (user?.employeeId !== currentUser?.employeeId) {
        setCurrentUser(user)
        if (user) {
          const pin = localStorage.getItem('jsr_user_pin')
          const bioEnabled = localStorage.getItem('jsr_biometric_enabled') === 'true'
          setIsPinSet(!!pin)
          setBiometricEnabled(bioEnabled)
          setIsUnlocked(!pin)
        } else {
          setIsUnlocked(true)
          setIsPinSet(false)
          setBiometricEnabled(false)
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
    const hash = await hashPin(finalPin)
    localStorage.setItem('jsr_user_pin', hash)
    setIsPinSet(true)
    
    if (isBiometricsSupportedOnWeb()) {
      setShowEnableBiometricOffer(true)
    } else {
      setIsUnlocked(true)
    }
  }

  const handleOfferResponse = async (enable: boolean) => {
    setShowEnableBiometricOffer(false)
    if (enable) {
      await registerWebBiometrics()
    }
    setIsUnlocked(true)
  }

  // --- Handlers for PIN Unlock (via hidden input) ---
  const handleUnlockInputChange = async (val: string) => {
    setUnlockError('')
    setUnlockPin(val)
    if (val.length === 4) {
      const storedHash = localStorage.getItem('jsr_user_pin')
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

  // Intercept Flow 1: PIN Setup Screen
  if (currentUser && !isPinSet) {
    return (
      <div 
        onClick={handleBackgroundClick}
        className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none"
      >
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.15),transparent_60%)]" />
        
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

        <div className="relative z-10 w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl transition-all duration-300">
          {!showEnableBiometricOffer ? (
            <>
              <div className="flex flex-col items-center justify-center mb-6 text-center">
                <div className="p-3.5 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20">
                  <Shield className="h-8 w-8 text-indigo-400" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  {setupStep === 'create' ? 'Create Security PIN' : 'Confirm Security PIN'}
                </h1>
                <p className="text-slate-400 text-sm mt-2 max-w-xs leading-relaxed">
                  {setupStep === 'create' 
                    ? 'Enter a 4-digit PIN to secure your account access.' 
                    : 'Verify your PIN to complete setup.'}
                </p>
                <div className="mt-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700/30 text-xs text-indigo-300 font-mono">
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
                        active ? 'border-indigo-500 bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] scale-110' : 'border-slate-700 bg-transparent'
                      }`}
                    />
                  )
                })}
              </div>

              {/* Error Message */}
              {setupError ? (
                <p className="text-center text-sm font-medium text-rose-400 mb-6 animate-bounce">{setupError}</p>
              ) : (
                <div className="h-5 mb-6 text-center text-xs text-slate-500">
                  Type your 4 digits. Touch any dot to focus keyboard.
                </div>
              )}

              {/* Reset / Start Over and Logout Buttons */}
              <div className="flex flex-col gap-3 mt-6">
                {setupStep === 'confirm' && (
                  <button
                    type="button"
                    onClick={handleSetupReset}
                    className="w-full py-2.5 text-sm font-semibold text-slate-300 hover:text-white rounded-xl border border-slate-800 hover:bg-slate-800 transition flex items-center justify-center gap-2 focus:outline-none"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Start Over</span>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={handleForceLogout}
                  className="w-full py-2.5 text-sm font-semibold text-rose-400 hover:text-rose-300 rounded-xl border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 transition flex items-center justify-center gap-2 focus:outline-none"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out / Switch account</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="p-3.5 bg-indigo-500/10 rounded-2xl w-fit mx-auto mb-4 border border-indigo-500/20">
                <Lock className="h-8 w-8 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Enable Biometrics?</h1>
              <p className="text-slate-400 text-sm mt-2 mb-8 max-w-xs mx-auto leading-relaxed">
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
                  className="w-full py-3 bg-slate-800 hover:bg-slate-750 active:bg-slate-800 text-slate-300 font-medium rounded-xl border border-slate-750 transition"
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
        className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none"
      >
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.15),transparent_60%)]" />

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

        <div className="relative z-10 w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl transition-all duration-300">
          <div className="flex flex-col items-center justify-center mb-6 text-center">
            <div className="p-3.5 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20">
              <Lock className="h-8 w-8 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Karmayog Locked</h1>
            <p className="text-slate-400 text-sm mt-2 max-w-xs leading-relaxed">
              Enter your 4-digit security PIN or use biometrics to unlock.
            </p>
            <div className="mt-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700/30 text-xs text-indigo-300 font-mono">
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
                    active ? 'border-indigo-500 bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] scale-110' : 'border-slate-700 bg-transparent'
                  }`}
                />
              )
            })}
          </div>

          {/* Error Message */}
          {unlockError ? (
            <p className="text-center text-sm font-medium text-rose-400 mb-6 animate-bounce">{unlockError}</p>
          ) : (
            <div className="h-5 mb-6 text-center text-xs text-slate-500">
              Type your PIN to unlock. Touch any dot to focus keyboard.
            </div>
          )}

          {/* Biometrics and Logout Actions */}
          <div className="flex flex-col gap-3 mt-6">
            {biometricEnabled && (
              <button
                type="button"
                onClick={authenticateWebBiometrics}
                className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl border border-indigo-500/20 transition flex items-center justify-center gap-2 focus:outline-none shadow-lg shadow-indigo-650/30"
              >
                <KeyRound className="h-5 w-5" />
                <span>Unlock with Biometrics</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={handleForceLogout}
              className="w-full py-2.5 text-sm font-semibold text-rose-400 hover:text-rose-300 rounded-xl border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 transition flex items-center justify-center gap-2 focus:outline-none"
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
      }}
    >
      {children}
    </SecurityContext.Provider>
  )
}
