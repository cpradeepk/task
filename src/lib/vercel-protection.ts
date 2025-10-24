/**
 * VERCEL DEPLOYMENT PROTECTION
 * 
 * This file ensures that Google Sheet ID remains static during Vercel deployment
 * and cannot be overridden by any environment variables or build processes.
 */

import { ABSOLUTE_PRODUCTION_SHEET_ID, validateAbsoluteSheetId } from './constants/production'

// VERCEL ENVIRONMENT DETECTION
export function isVercelEnvironment(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.VERCEL_URL ||
    process.env.VERCEL_GIT_PROVIDER
  )
}

// VERCEL DEPLOYMENT STAGE DETECTION
export function getVercelStage(): string {
  return process.env.VERCEL_ENV || 'unknown'
}

/**
 * VERCEL SHEET ID PROTECTION
 * This function ensures the sheet ID is NEVER changed during Vercel deployment
 */
export function getVercelProtectedSheetId(): string {
  const sheetId = ABSOLUTE_PRODUCTION_SHEET_ID
  
  // Validate the sheet ID
  validateAbsoluteSheetId(sheetId)
  
  // Vercel-specific validation
  if (isVercelEnvironment()) {
    console.log('🔒 VERCEL PROTECTION: Sheet ID validation passed')
    console.log(`📋 Vercel Stage: ${getVercelStage()}`)
    console.log(`🔑 Protected Sheet ID: ${sheetId}`)
    
    // Additional Vercel environment checks
    const vercelInfo = {
      env: process.env.VERCEL_ENV,
      url: process.env.VERCEL_URL,
      region: process.env.VERCEL_REGION,
      gitProvider: process.env.VERCEL_GIT_PROVIDER
    }
    
    console.log('🌐 Vercel Environment:', vercelInfo)
  }
  
  return sheetId
}

/**
 * PREVENT ENVIRONMENT VARIABLE OVERRIDE
 * This function ensures no environment variable can override the sheet ID
 */
export function preventEnvironmentOverride(): void {
  // Check for any environment variables that might try to override the sheet ID
  const dangerousEnvVars = [
    'SPREADSHEET_ID',
    'GOOGLE_SPREADSHEET_ID',
    'SHEET_ID',
    'GOOGLE_SHEET_ID',
    'SHEETS_ID'
  ]
  
  dangerousEnvVars.forEach(varName => {
    if (process.env[varName]) {
      console.warn(`⚠️  WARNING: Found environment variable ${varName}=${process.env[varName]}`)
      console.warn(`🔒 PROTECTION: This variable will be IGNORED. Using hardcoded sheet ID: ${ABSOLUTE_PRODUCTION_SHEET_ID}`)
      
      // Delete the environment variable to prevent any accidental usage
      delete process.env[varName]
    }
  })
}

/**
 * VERCEL BUILD-TIME VALIDATION
 * Run this during build to ensure configuration is correct
 */
export function validateVercelBuild(): void {
  console.log('🔨 VERCEL BUILD VALIDATION: Starting...')
  
  // Prevent environment variable override
  preventEnvironmentOverride()
  
  // Validate sheet ID
  const sheetId = getVercelProtectedSheetId()
  
  // Check required environment variables
  const requiredVars = [
    'GOOGLE_PROJECT_ID',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_EMAIL'
  ]
  
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error('🚨 VERCEL BUILD ERROR: Missing environment variables:', missingVars)
    throw new Error(`Missing required environment variables for Vercel deployment: ${missingVars.join(', ')}`)
  }
  
  console.log('✅ VERCEL BUILD VALIDATION: Passed')
  console.log(`📋 Protected Sheet ID: ${sheetId}`)
  console.log(`🌐 Vercel Stage: ${getVercelStage()}`)
}

/**
 * RUNTIME VERCEL PROTECTION
 * Run this on every API call in production
 */
export function vercelRuntimeProtection(): string {
  // Always use the protected sheet ID
  const sheetId = getVercelProtectedSheetId()
  
  // Additional runtime checks for Vercel
  if (isVercelEnvironment()) {
    // Ensure we're in the correct Vercel environment
    const stage = getVercelStage()
    
    if (stage === 'production') {
      console.log('🔒 VERCEL PRODUCTION: Using protected sheet ID')
    } else if (stage === 'preview') {
      console.log('🔒 VERCEL PREVIEW: Using protected sheet ID')
    }
  }
  
  return sheetId
}

/**
 * VERCEL DEPLOYMENT HEALTH CHECK
 */
export function vercelHealthCheck(): {
  isVercel: boolean
  stage: string
  sheetId: string
  protection: string
  timestamp: string
} {
  try {
    const sheetId = getVercelProtectedSheetId()
    
    return {
      isVercel: isVercelEnvironment(),
      stage: getVercelStage(),
      sheetId,
      protection: 'ACTIVE',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      isVercel: isVercelEnvironment(),
      stage: getVercelStage(),
      sheetId: 'ERROR',
      protection: 'FAILED',
      timestamp: new Date().toISOString()
    }
  }
}

// AUTO-RUN VERCEL PROTECTION ON MODULE LOAD
if (typeof window === 'undefined' && isVercelEnvironment()) {
  try {
    preventEnvironmentOverride()
    console.log('🔒 VERCEL PROTECTION: Activated')
  } catch (error) {
    console.error('🚨 VERCEL PROTECTION ERROR:', error)
  }
}
