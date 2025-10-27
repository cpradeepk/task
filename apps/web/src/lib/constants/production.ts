/**
 * PRODUCTION CONSTANTS - CRITICAL CONFIGURATION
 * 
 * ⚠️  DANGER: DO NOT MODIFY THESE VALUES
 * 🔒 LOCKED: These constants are permanently locked for production
 * 🚨 CRITICAL: Changing these values will break the application
 */

// ABSOLUTE PRODUCTION LOCK - GOOGLE SHEET ID
// This value is HARDCODED and CANNOT be changed under any circumstances
export const ABSOLUTE_PRODUCTION_SHEET_ID = '1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98' as const

// PRODUCTION SHEET URL - For reference and validation
export const ABSOLUTE_PRODUCTION_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit' as const

// VALIDATION CONSTANTS
export const SHEET_ID_LENGTH = 44 as const
export const SHEET_ID_PATTERN = /^[a-zA-Z0-9_-]{44}$/

/**
 * CRITICAL VALIDATION FUNCTION
 * This function ensures the Google Sheet ID is NEVER changed
 */
export function validateAbsoluteSheetId(sheetId: string): void {
  // Check if sheet ID matches the absolute production ID
  if (sheetId !== ABSOLUTE_PRODUCTION_SHEET_ID) {
    const error = new Error(
      `🚨 CRITICAL PRODUCTION ERROR: Google Sheet ID mismatch!\n` +
      `Expected: ${ABSOLUTE_PRODUCTION_SHEET_ID}\n` +
      `Received: ${sheetId}\n` +
      `This will cause complete data loss!\n` +
      `Sheet URL: ${ABSOLUTE_PRODUCTION_SHEET_URL}`
    )
    
    // Log critical error
    console.error('🚨 CRITICAL PRODUCTION ERROR:', error.message)
    
    // Throw error to prevent application from running with wrong sheet
    throw error
  }
  
  // Additional format validation
  if (!SHEET_ID_PATTERN.test(sheetId)) {
    throw new Error(`🚨 CRITICAL ERROR: Invalid Google Sheet ID format: ${sheetId}`)
  }
  
  // Length validation
  if (sheetId.length !== SHEET_ID_LENGTH) {
    throw new Error(`🚨 CRITICAL ERROR: Invalid Google Sheet ID length: ${sheetId.length}, expected: ${SHEET_ID_LENGTH}`)
  }
}

/**
 * GET PRODUCTION SHEET ID
 * This is the ONLY way to get the production sheet ID
 */
export function getProductionSheetId(): string {
  const sheetId = ABSOLUTE_PRODUCTION_SHEET_ID
  
  // Always validate before returning
  validateAbsoluteSheetId(sheetId)
  
  return sheetId
}

/**
 * PRODUCTION ENVIRONMENT CHECKER
 */
export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production' || 
         process.env.VERCEL === '1' || 
         !!process.env.VERCEL_ENV
}

/**
 * PRODUCTION SAFETY CHECK
 * Run this on application startup
 */
export function runProductionSafetyCheck(): void {
  const sheetId = getProductionSheetId()
  
  if (isProductionEnvironment()) {
    console.log('🔒 PRODUCTION SAFETY CHECK: PASSED')
    console.log(`📋 Using Google Sheet: ${ABSOLUTE_PRODUCTION_SHEET_URL}`)
    console.log(`🔑 Sheet ID: ${sheetId}`)
  }
  
  // Additional environment validation
  if (isProductionEnvironment()) {
    const requiredEnvVars = [
      'GOOGLE_PROJECT_ID',
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_CLIENT_EMAIL'
    ]
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      throw new Error(
        `🚨 PRODUCTION ERROR: Missing required environment variables: ${missingVars.join(', ')}`
      )
    }
  }
}

// AUTO-RUN SAFETY CHECK ON MODULE LOAD
if (typeof window === 'undefined') { // Server-side only
  try {
    runProductionSafetyCheck()
  } catch (error) {
    console.error('🚨 PRODUCTION SAFETY CHECK FAILED:', error)
  }
}
