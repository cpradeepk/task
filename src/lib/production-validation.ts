// Production Environment Validation
// This file ensures critical configuration remains intact in production

/**
 * Production Google Sheet Configuration Validator
 * 
 * This validator ensures that the Google Sheet ID remains exactly as specified
 * and cannot be accidentally changed during deployment or runtime.
 */

// CRITICAL: This is the ONLY allowed Google Sheet ID for production
const REQUIRED_SHEET_ID = '1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98'
const REQUIRED_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit'

/**
 * Validates that the Google Sheet configuration is correct for production
 */
export function validateProductionConfig(): void {
  // Import here to avoid circular dependencies
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SHEETS_CONFIG } = require('./sheets/config')
  
  const currentSheetId = SHEETS_CONFIG.SPREADSHEET_ID
  
  // Critical validation: Ensure sheet ID matches exactly
  if (currentSheetId !== REQUIRED_SHEET_ID) {
    console.error('🚨 CRITICAL ERROR: Google Sheet ID mismatch detected!')
    console.error(`Expected: ${REQUIRED_SHEET_ID}`)
    console.error(`Current:  ${currentSheetId}`)
    console.error(`Sheet URL: ${REQUIRED_SHEET_URL}`)
    
    throw new Error(
      `PRODUCTION ERROR: Google Sheet ID has been changed! ` +
      `Expected: ${REQUIRED_SHEET_ID}, ` +
      `Got: ${currentSheetId}. ` +
      `This will cause data loss. Please restore the correct sheet ID.`
    )
  }
  
  // Additional format validation
  if (!currentSheetId || typeof currentSheetId !== 'string') {
    throw new Error('PRODUCTION ERROR: Google Sheet ID is not a valid string!')
  }
  
  if (currentSheetId.length !== 44) {
    throw new Error('PRODUCTION ERROR: Google Sheet ID has invalid length!')
  }
  
  // Check for common mistakes
  if (currentSheetId.includes('localhost') || currentSheetId.includes('example')) {
    throw new Error('PRODUCTION ERROR: Google Sheet ID appears to be a placeholder!')
  }
  
  // Environment-specific validation
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    console.log('✅ Production validation passed: Google Sheet ID is correct')
    console.log(`📋 Using sheet: ${REQUIRED_SHEET_URL}`)
  }
}

/**
 * Runtime validation that can be called from API routes
 */
export function validateSheetIdAtRuntime(sheetId: string): void {
  if (sheetId !== REQUIRED_SHEET_ID) {
    throw new Error(
      `Runtime validation failed: Sheet ID ${sheetId} does not match required ID ${REQUIRED_SHEET_ID}`
    )
  }
}

/**
 * Get the validated production sheet ID
 */
export function getProductionSheetId(): string {
  validateProductionConfig()
  return REQUIRED_SHEET_ID
}

/**
 * Production deployment checker
 */
export function checkProductionDeployment(): {
  isProduction: boolean
  isVercel: boolean
  sheetId: string
  validation: string
} {
  const isProduction = process.env.NODE_ENV === 'production'
  const isVercel = !!process.env.VERCEL
  
  try {
    validateProductionConfig()
    return {
      isProduction,
      isVercel,
      sheetId: REQUIRED_SHEET_ID,
      validation: 'PASSED'
    }
  } catch (error) {
    return {
      isProduction,
      isVercel,
      sheetId: 'INVALID',
      validation: error instanceof Error ? error.message : 'FAILED'
    }
  }
}

// Auto-validate on module load in production
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  try {
    validateProductionConfig()
  } catch (error) {
    console.error('🚨 PRODUCTION VALIDATION FAILED ON MODULE LOAD:', error)
    // Don't throw here to avoid breaking the build, but log the error
  }
}
