'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { Shield, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react'

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

  // WebAuthn Biometrics: Register Credential
  const registerWebBiometrics = async (): Promise<boolean> => {
    try {
      if (!window.PublicKeyCredential) {
        alert('Biometric authentication is not supported by this browser.')
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
    } catch (error) {
      console.error('WebAuthn Registration Error:', error)
      return false
    }
  }

  // WebAuthn Biometrics: Authenticate Credential
  const authenticateWebBiometrics = async (): Promise<boolean> => {
    try {
      if (!window.PublicKeyCredential) return false
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
    } catch (error) {
      console.error('WebAuthn Authentication Error:', error)
      return false
    }
  }

  // Handle auto biometric popup on lock screen mount
  useEffect(() => {
    if (currentUser && isPinSet && !isUnlocked && biometricEnabled) {
      // Small timeout to allow prompt to overlay nicely after mounting
      const timer = setTimeout(() => {
        authenticateWebBiometrics()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentUser, isPinSet, isUnlocked, biometricEnabled])

  // --- Handlers for PIN Setup ---
  const handleSetupNumberPress = (num: string) => {
    setSetupError('')
    if (setupStep === 'create') {
      if (setupPin.length < 4) {
        const next = setupPin + num
        setSetupPin(next)
        if (next.length === 4) {
          setTimeout(() => setSetupStep('confirm'), 200)
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const next = confirmPin + num
        setConfirmPin(next)
        if (next.length === 4) {
          if (setupPin === next) {
            savePinAndOfferBiometrics(setupPin)
          } else {
            setTimeout(() => {
              setSetupError('PINs do not match. Try again.')
              setConfirmPin('')
            }, 200)
          }
        }
      }
    }
  }

  const savePinAndOfferBiometrics = async (finalPin: string) => {
    const hash = await hashPin(finalPin)
    localStorage.setItem('jsr_user_pin', hash)
    setIsPinSet(true)
    
    // Check if biometric is supported on browser before offering
    if (window.PublicKeyCredential) {
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

  // --- Handlers for PIN Unlock ---
  const handleUnlockNumberPress = async (num: string) => {
    setUnlockError('')
    if (unlockPin.length < 4) {
      const next = unlockPin + num
      setUnlockPin(next)
      if (next.length === 4) {
        const storedHash = localStorage.getItem('jsr_user_pin')
        const inputHash = await hashPin(next)
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
  }

  // Physical Keyboard Listener on Lock Screens
  useEffect(() => {
    if (!isClient || !currentUser) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (!isPinSet) {
          if (!showEnableBiometricOffer) handleSetupNumberPress(e.key)
        } else if (!isUnlocked) {
          handleUnlockNumberPress(e.key)
        }
      } else if (e.key === 'Backspace') {
        if (!isPinSet) {
          if (setupStep === 'create') setSetupPin(p => p.slice(0, -1))
          else setConfirmPin(p => p.slice(0, -1))
        } else if (!isUnlocked) {
          setUnlockPin(p => p.slice(0, -1))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isClient, currentUser, isPinSet, isUnlocked, setupStep, setupPin, confirmPin, unlockPin, showEnableBiometricOffer])

  if (!isClient) return null

  // Intercept Flow 1: PIN Setup Screen
  if (currentUser && !isPinSet) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(236,72,153,0.1),transparent_50%)]" />
        
        <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
          {!showEnableBiometricOffer ? (
            <>
              <div className="flex flex-col items-center justify-center mb-6 text-center">
                <div className="p-3 bg-indigo-500/10 rounded-full mb-4">
                  <Shield className="h-10 w-10 text-indigo-400" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {setupStep === 'create' ? 'Create Security PIN' : 'Confirm Security PIN'}
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  {setupStep === 'create' 
                    ? 'Enter a 4-digit PIN to secure your account access.' 
                    : 'Verify your PIN to complete setup.'}
                </p>
              </div>

              {/* Dots Indicators */}
              <div className="flex justify-center space-x-6 my-8">
                {[0, 1, 2, 3].map(i => {
                  const active = (setupStep === 'create' ? setupPin : confirmPin).length > i
                  return (
                    <div
                      key={i}
                      className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
                        setupError ? 'border-rose-500 bg-rose-500' :
                        active ? 'border-indigo-500 bg-indigo-500 scale-110' : 'border-slate-700 bg-transparent'
                      }`}
                    />
                  )
                })}
              </div>

              {/* Error Message */}
              {setupError ? (
                <p className="text-center text-sm text-rose-400 mb-6">{setupError}</p>
              ) : (
                <div className="h-5 mb-6" />
              )}

              {/* Instruction message & reset button instead of keypad */}
              <div className="text-center text-slate-400 text-sm mt-4">
                Type the 4 digits using your keyboard.
              </div>
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setSetupPin('')
                    setConfirmPin('')
                    setSetupStep('create')
                    setSetupError('')
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:bg-slate-800 transition flex items-center gap-1.5 focus:outline-none"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Start Over</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="p-3 bg-indigo-500/10 rounded-full w-fit mx-auto mb-4">
                <Lock className="h-10 w-10 text-indigo-400" />
              </div>
              <h1 className="text-xl font-bold">Enable Biometrics?</h1>
              <p className="text-slate-400 text-sm mt-2 mb-6">
                Would you like to enable Touch ID / Face ID biometrics for fast unlocking?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleOfferResponse(true)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl font-semibold transition"
                >
                  Yes, Enable Biometrics
                </button>
                <button
                  onClick={() => handleOfferResponse(false)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-750 active:bg-slate-800 rounded-xl text-slate-355 font-medium transition"
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
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(236,72,153,0.1),transparent_50%)]" />

        <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
          <div className="flex flex-col items-center justify-center mb-6 text-center">
            <div className="p-3 bg-indigo-500/10 rounded-full mb-4">
              <Lock className="h-10 w-10 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Karmayog Locked</h1>
            <p className="text-slate-400 text-sm mt-1">
              Enter your 4-digit security PIN or use biometrics to unlock.
            </p>
          </div>

          {/* Dots Indicators */}
          <div className="flex justify-center space-x-6 my-8">
            {[0, 1, 2, 3].map(i => {
              const active = unlockPin.length > i
              return (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
                    unlockError ? 'border-rose-500 bg-rose-500' :
                    active ? 'border-indigo-500 bg-indigo-500 scale-110' : 'border-slate-700 bg-transparent'
                  }`}
                />
              )
            })}
          </div>

          {/* Error Message */}
          {unlockError ? (
            <p className="text-center text-sm text-rose-400 mb-6">{unlockError}</p>
          ) : (
            <div className="h-5 mb-6" />
          )}

          {/* Instruction message & biometrics action link instead of keypad */}
          <div className="text-center text-slate-400 text-sm mt-4">
            Type your PIN on your keyboard to unlock.
          </div>
          
          {biometricEnabled && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={authenticateWebBiometrics}
                className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 font-semibold rounded-xl border border-indigo-500/20 transition flex items-center justify-center gap-2 focus:outline-none"
              >
                <Shield className="h-5 w-5" />
                <span>Unlock with Biometrics</span>
              </button>
            </div>
          )}

          <div className="text-center mt-8 pt-6 border-t border-slate-800">
            <button
              onClick={async () => {
                // Perform sign out and clear states
                localStorage.removeItem('jsr_current_user')
                localStorage.removeItem('jsr_user_pin')
                localStorage.removeItem('jsr_biometric_enabled')
                localStorage.removeItem('jsr_biometric_credential_id')
                try {
                  await fetch('/api/auth/logout', { method: 'POST' })
                } catch {}
                window.location.href = '/'
              }}
              className="text-sm text-slate-500 hover:text-rose-400 transition"
            >
              Sign out from account
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
