/**
 * Biometric Authentication Utility
 * 
 * Provides biometric authentication (Face ID, Touch ID, Fingerprint) support.
 * Uses Expo LocalAuthentication for cross-platform biometric auth.
 * 
 * Supported Biometric Types:
 * - iOS: Face ID, Touch ID
 * - Android: Fingerprint, Face Recognition, Iris
 */

import * as LocalAuthentication from 'expo-local-authentication'
import { Platform } from 'react-native'
import { saveSecure, getSecure, deleteSecure, SECURE_KEYS } from './secureStorage'

/**
 * Check if device supports biometric authentication
 */
export async function isBiometricSupported(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync()
    return compatible
  } catch (error) {
    console.error('Error checking biometric support:', error)
    return false
  }
}

/**
 * Check if biometric authentication is enrolled (user has set up biometrics)
 */
export async function isBiometricEnrolled(): Promise<boolean> {
  try {
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    return enrolled
  } catch (error) {
    console.error('Error checking biometric enrollment:', error)
    return false
  }
}

/**
 * Get available biometric types on the device
 */
export async function getAvailableBiometricTypes(): Promise<string[]> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    
    const biometricTypes: string[] = []
    
    types.forEach((type) => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          biometricTypes.push('Fingerprint')
          break
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          biometricTypes.push(Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition')
          break
        case LocalAuthentication.AuthenticationType.IRIS:
          biometricTypes.push('Iris')
          break
      }
    })
    
    return biometricTypes
  } catch (error) {
    console.error('Error getting biometric types:', error)
    return []
  }
}

/**
 * Authenticate user with biometrics
 */
export async function authenticateWithBiometrics(
  promptMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if biometrics are supported and enrolled
    const supported = await isBiometricSupported()
    if (!supported) {
      return { success: false, error: 'Biometric authentication is not supported on this device' }
    }
    
    const enrolled = await isBiometricEnrolled()
    if (!enrolled) {
      return { success: false, error: 'No biometric authentication is set up on this device' }
    }
    
    // Get biometric types for prompt message
    const types = await getAvailableBiometricTypes()
    const biometricType = types[0] || 'biometric'
    
    // Authenticate
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || `Authenticate with ${biometricType}`,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow fallback to PIN/password
      fallbackLabel: 'Use PIN',
    })
    
    if (result.success) {
      return { success: true }
    } else {
      return { 
        success: false, 
        error: result.error === 'user_cancel' 
          ? 'Authentication cancelled' 
          : 'Authentication failed' 
      }
    }
  } catch (error: any) {
    console.error('Biometric authentication error:', error)
    return { success: false, error: error.message || 'Authentication error' }
  }
}

/**
 * Check if biometric authentication is enabled for the app
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await getSecure(SECURE_KEYS.BIOMETRIC_ENABLED)
    return enabled === 'true'
  } catch (error) {
    return false
  }
}

/**
 * Enable biometric authentication for the app
 */
export async function enableBiometric(): Promise<void> {
  await saveSecure(SECURE_KEYS.BIOMETRIC_ENABLED, 'true')
}

/**
 * Disable biometric authentication for the app
 */
export async function disableBiometric(): Promise<void> {
  await deleteSecure(SECURE_KEYS.BIOMETRIC_ENABLED)
}

/**
 * Get user-friendly biometric type name for display
 */
export async function getBiometricTypeName(): Promise<string> {
  const types = await getAvailableBiometricTypes()
  
  if (types.length === 0) {
    return 'Biometric'
  }
  
  if (types.includes('Face ID')) {
    return 'Face ID'
  }
  
  if (types.includes('Touch ID')) {
    return 'Touch ID'
  }
  
  if (types.includes('Fingerprint')) {
    return 'Fingerprint'
  }
  
  if (types.includes('Face Recognition')) {
    return 'Face Recognition'
  }
  
  if (types.includes('Iris')) {
    return 'Iris'
  }
  
  return 'Biometric'
}

