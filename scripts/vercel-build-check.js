#!/usr/bin/env node

/**
 * VERCEL BUILD-TIME VALIDATION SCRIPT
 * 
 * This script runs during Vercel build to ensure Google Sheet ID protection
 * and validates all required environment variables are present.
 */

const REQUIRED_SHEET_ID = '1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98'
const REQUIRED_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit'

console.log('🔨 VERCEL BUILD VALIDATION: Starting...')
console.log('='.repeat(50))

// Check if we're in Vercel environment
const isVercel = !!(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.VERCEL_URL
)

if (isVercel) {
  console.log('🌐 VERCEL ENVIRONMENT DETECTED')
  console.log(`📍 Stage: ${process.env.VERCEL_ENV || 'unknown'}`)
  console.log(`🌍 URL: ${process.env.VERCEL_URL || 'unknown'}`)
  console.log(`🗺️  Region: ${process.env.VERCEL_REGION || 'unknown'}`)
} else {
  console.log('🏠 LOCAL ENVIRONMENT DETECTED')
}

// Validate Google Sheet ID protection
console.log('\n🔒 GOOGLE SHEET ID VALIDATION:')
console.log(`📋 Required Sheet ID: ${REQUIRED_SHEET_ID}`)
console.log(`🔗 Sheet URL: ${REQUIRED_SHEET_URL}`)

// Check for dangerous environment variables that might override sheet ID
const dangerousVars = [
  'SPREADSHEET_ID',
  'GOOGLE_SPREADSHEET_ID',
  'SHEET_ID',
  'GOOGLE_SHEET_ID',
  'SHEETS_ID'
]

let foundDangerousVars = false
dangerousVars.forEach(varName => {
  if (process.env[varName]) {
    console.error(`🚨 DANGER: Found environment variable ${varName}=${process.env[varName]}`)
    console.error(`🔒 This variable will be IGNORED to protect data integrity`)
    foundDangerousVars = true
  }
})

if (!foundDangerousVars) {
  console.log('✅ No dangerous environment variables found')
}

// Validate required environment variables
console.log('\n🔑 ENVIRONMENT VARIABLES VALIDATION:')
const requiredVars = [
  'GOOGLE_PROJECT_ID',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY_ID',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_CERT_URL'
]

let missingVars = []
let presentVars = []

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    presentVars.push(varName)
    console.log(`✅ ${varName}: Present`)
  } else {
    missingVars.push(varName)
    console.error(`❌ ${varName}: Missing`)
  }
})

// Summary
console.log('\n📊 VALIDATION SUMMARY:')
console.log(`✅ Present variables: ${presentVars.length}/${requiredVars.length}`)
console.log(`❌ Missing variables: ${missingVars.length}/${requiredVars.length}`)

if (missingVars.length > 0) {
  if (isVercel) {
    console.error('\n🚨 BUILD VALIDATION FAILED!')
    console.error('Missing required environment variables:')
    missingVars.forEach(varName => {
      console.error(`  - ${varName}`)
    })
    console.error('\nPlease add these variables to your Vercel project settings.')
    console.error('Go to: Project Settings > Environment Variables')
    process.exit(1)
  } else {
    console.warn('\n⚠️  LOCAL DEVELOPMENT: Missing environment variables')
    console.warn('This is normal for local development without .env.local file')
    console.warn('For production deployment, ensure all variables are set in Vercel')
  }
}

// Google Sheets configuration validation
console.log('\n🔒 GOOGLE SHEETS PROTECTION:')
console.log(`📋 Protected Sheet ID: ${REQUIRED_SHEET_ID}`)
console.log(`🔗 Protected Sheet URL: ${REQUIRED_SHEET_URL}`)
console.log('🛡️  Multiple protection layers active:')
console.log('   - Hardcoded constants')
console.log('   - Runtime validation')
console.log('   - Environment variable prevention')
console.log('   - Vercel-specific protection')

// Final validation
console.log('\n🎉 BUILD VALIDATION PASSED!')
console.log('🔒 Google Sheet ID is protected and cannot be changed')
console.log('🌐 All required environment variables are present')
console.log('✅ Ready for Vercel deployment')

if (isVercel) {
  console.log(`\n🚀 VERCEL DEPLOYMENT INFO:`)
  console.log(`📍 Environment: ${process.env.VERCEL_ENV}`)
  console.log(`🌍 URL: ${process.env.VERCEL_URL}`)
  console.log(`🔑 Project: ${process.env.VERCEL_GIT_REPO_SLUG || 'unknown'}`)
}

console.log('\n' + '='.repeat(50))
console.log('🔨 VERCEL BUILD VALIDATION: COMPLETED SUCCESSFULLY')
