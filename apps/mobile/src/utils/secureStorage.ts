/**
 * Secure Storage Utility
 * 
 * Provides secure storage for sensitive data using Expo SecureStore.
 * SecureStore uses:
 * - iOS: Keychain Services
 * - Android: EncryptedSharedPreferences (API 23+) or Keystore (API 18-22)
 * 
 * For non-sensitive data, use AsyncStorage instead.
 */

import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Keys for secure storage
export const SECURE_KEYS = {
  USER_TOKEN: 'userToken',
  USER_DATA: 'userData',
  BIOMETRIC_ENABLED: 'biometricEnabled',
  USER_PIN: 'userPin',
} as const

// Keys for regular storage (non-sensitive)
export const STORAGE_KEYS = {
  TASK_FILTERS: 'taskFilters',
  BUG_FILTERS: 'bugFilters',
  THEME_MODE: 'themeMode',
  LAST_SYNC: 'lastSync',
} as const

/**
 * Save data to secure storage (for sensitive data like tokens)
 */
export async function saveSecure(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value)
  } catch (error) {
    console.error(`Failed to save secure data for key ${key}:`, error)
    throw error
  }
}

/**
 * Get data from secure storage
 */
export async function getSecure(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key)
  } catch (error) {
    console.error(`Failed to get secure data for key ${key}:`, error)
    return null
  }
}

/**
 * Delete data from secure storage
 */
export async function deleteSecure(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key)
  } catch (error) {
    console.error(`Failed to delete secure data for key ${key}:`, error)
    throw error
  }
}

/**
 * Save data to regular storage (for non-sensitive data)
 */
export async function save(key: string, value: any): Promise<void> {
  try {
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value)
    await AsyncStorage.setItem(key, jsonValue)
  } catch (error) {
    console.error(`Failed to save data for key ${key}:`, error)
    throw error
  }
}

/**
 * Get data from regular storage
 */
export async function get<T = any>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key)
    if (value === null) return null
    
    try {
      return JSON.parse(value) as T
    } catch {
      return value as T
    }
  } catch (error) {
    console.error(`Failed to get data for key ${key}:`, error)
    return null
  }
}

/**
 * Delete data from regular storage
 */
export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to remove data for key ${key}:`, error)
    throw error
  }
}

/**
 * Clear all data from regular storage
 */
export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.clear()
  } catch (error) {
    console.error('Failed to clear storage:', error)
    throw error
  }
}

/**
 * Clear all secure data (call on logout)
 */
export async function clearSecureData(): Promise<void> {
  try {
    await Promise.all([
      deleteSecure(SECURE_KEYS.USER_TOKEN),
      deleteSecure(SECURE_KEYS.USER_DATA),
      deleteSecure(SECURE_KEYS.USER_PIN),
      deleteSecure(SECURE_KEYS.BIOMETRIC_ENABLED),
    ])
  } catch (error) {
    console.error('Failed to clear secure data:', error)
    throw error
  }
}

/**
 * Save user token securely
 */
export async function saveUserToken(token: string): Promise<void> {
  return saveSecure(SECURE_KEYS.USER_TOKEN, token)
}

/**
 * Get user token
 */
export async function getUserToken(): Promise<string | null> {
  return getSecure(SECURE_KEYS.USER_TOKEN)
}

/**
 * Save user data securely
 */
export async function saveUserData(user: any): Promise<void> {
  return saveSecure(SECURE_KEYS.USER_DATA, JSON.stringify(user))
}

/**
 * Get user data
 */
export async function getUserData<T = any>(): Promise<T | null> {
  const data = await getSecure(SECURE_KEYS.USER_DATA)
  if (!data) return null
  
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

