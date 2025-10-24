#!/usr/bin/env node

/**
 * VERCEL DEVELOPMENT VERIFICATION SCRIPT
 * 
 * This script verifies the application is ready for Vercel development deployment
 * and tests all critical functionality before pushing to production.
 */

const REQUIRED_SHEET_ID = '1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98'
const REQUIRED_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit'

console.log('🔍 VERCEL DEVELOPMENT VERIFICATION: Starting...')
console.log('='.repeat(70))

// Environment detection
const isVercel = !!(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.VERCEL_URL
)

const isProduction = process.env.NODE_ENV === 'production'

console.log(`🌐 Environment: ${isVercel ? 'Vercel' : 'Local'}`)
console.log(`🏭 Mode: ${isProduction ? 'Production' : 'Development'}`)

if (isVercel) {
  console.log(`📍 Vercel Stage: ${process.env.VERCEL_ENV || 'unknown'}`)
  console.log(`🌍 Vercel URL: ${process.env.VERCEL_URL || 'unknown'}`)
}

// 1. Google Sheet ID Protection Verification
console.log('\n🔒 GOOGLE SHEET ID PROTECTION VERIFICATION:')
console.log(`📋 Required Sheet ID: ${REQUIRED_SHEET_ID}`)
console.log(`🔗 Required Sheet URL: ${REQUIRED_SHEET_URL}`)

let configSheetId = null
let configError = null

try {
  const pathModule = require('path')
  const fs = require('fs')
  const configPath = pathModule.join(__dirname, '..', 'src', 'lib', 'constants', 'production.ts')
  
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8')
    const sheetIdMatch = configContent.match(/ABSOLUTE_PRODUCTION_SHEET_ID = '([^']+)'/);
    if (sheetIdMatch) {
      configSheetId = sheetIdMatch[1]
      console.log(`✅ Found Sheet ID in config: ${configSheetId}`)
    } else {
      console.error('❌ Could not extract Sheet ID from config file')
    }
  } else {
    console.error('❌ Config file not found')
  }
} catch (error) {
  console.error('❌ Error loading config:', error.message)
  configError = error.message
}

const isSheetIdCorrect = configSheetId === REQUIRED_SHEET_ID
console.log(`🔍 Sheet ID Protection: ${isSheetIdCorrect ? '✅ PROTECTED' : '❌ COMPROMISED'}`)

// 2. Build Verification
console.log('\n🔨 BUILD VERIFICATION:')
console.log('Testing Next.js build process...')

const { execSync } = require('child_process')
const path = require('path')

try {
  console.log('📦 Running build test...')
  execSync('npm run build', {
    stdio: 'pipe',
    cwd: path.join(__dirname, '..')
  })
  console.log('✅ Build successful')
} catch (error) {
  console.error('❌ Build failed:', error.message)
  process.exit(1)
}

// 3. Environment Variables Check
console.log('\n🔑 ENVIRONMENT VARIABLES CHECK:')
const requiredVars = [
  'GOOGLE_PROJECT_ID',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY_ID',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_CERT_URL'
]

let envVarsPresent = 0
let envVarsMissing = 0

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Present`)
    envVarsPresent++
  } else {
    console.log(`⚠️  ${varName}: Missing (normal for local dev)`)
    envVarsMissing++
  }
})

// 4. API Routes Verification
console.log('\n🛣️  API ROUTES VERIFICATION:')
const fs = require('fs')

const apiRoutesPath = path.join(__dirname, '..', 'src', 'app', 'api')
const expectedRoutes = [
  'health',
  'test-env',
  'vercel-diagnostics',
  'verify-sheet',
  'production-check',
  'debug/sheets',
  'tasks',
  'users',
  'leaves',
  'wfh'
]

let routesFound = 0
expectedRoutes.forEach(route => {
  const routePath = path.join(apiRoutesPath, route, 'route.ts')
  const routePathAlt = path.join(apiRoutesPath, route + '.ts')
  
  if (fs.existsSync(routePath) || fs.existsSync(routePathAlt)) {
    console.log(`✅ /api/${route}: Found`)
    routesFound++
  } else {
    console.log(`❌ /api/${route}: Missing`)
  }
})

console.log(`📊 API Routes: ${routesFound}/${expectedRoutes.length} found`)

// 5. Critical Files Check
console.log('\n📁 CRITICAL FILES CHECK:')
const criticalFiles = [
  'src/lib/constants/production.ts',
  'src/lib/vercel-protection.ts',
  'src/lib/sheets/config.ts',
  'src/lib/sheets/auth.ts',
  'vercel.json',
  'package.json'
]

let filesFound = 0
criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}: Found`)
    filesFound++
  } else {
    console.log(`❌ ${file}: Missing`)
  }
})

console.log(`📊 Critical Files: ${filesFound}/${criticalFiles.length} found`)

// 6. Vercel Configuration Check
console.log('\n⚙️  VERCEL CONFIGURATION CHECK:')
const vercelConfigPath = path.join(__dirname, '..', 'vercel.json')

if (fs.existsSync(vercelConfigPath)) {
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'))
    console.log('✅ vercel.json: Valid JSON')
    console.log(`📦 Project Name: ${vercelConfig.name || 'Not specified'}`)
    console.log(`🔧 Build Command: ${vercelConfig.buildCommand || 'Default'}`)
    console.log(`📂 Install Command: ${vercelConfig.installCommand || 'Default'}`)
  } catch (error) {
    console.error('❌ vercel.json: Invalid JSON')
  }
} else {
  console.error('❌ vercel.json: Not found')
}

// 7. Package.json Scripts Check
console.log('\n📜 PACKAGE.JSON SCRIPTS CHECK:')
const packageJsonPath = path.join(__dirname, '..', 'package.json')

if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    const scripts = packageJson.scripts || {}
    
    const requiredScripts = ['build', 'start', 'dev', 'verify-sheet']
    requiredScripts.forEach(script => {
      if (scripts[script]) {
        console.log(`✅ ${script}: ${scripts[script]}`)
      } else {
        console.log(`❌ ${script}: Missing`)
      }
    })
  } catch (error) {
    console.error('❌ package.json: Invalid JSON')
  }
} else {
  console.error('❌ package.json: Not found')
}

// 8. Overall Health Assessment
console.log('\n📊 OVERALL HEALTH ASSESSMENT:')
const isHealthy = isSheetIdCorrect && 
                 routesFound >= 8 && 
                 filesFound >= 5

console.log(`🔒 Sheet ID Protected: ${isSheetIdCorrect ? '✅ YES' : '❌ NO'}`)
console.log(`🛣️  API Routes Ready: ${routesFound >= 8 ? '✅ YES' : '❌ NO'}`)
console.log(`📁 Critical Files: ${filesFound >= 5 ? '✅ YES' : '❌ NO'}`)
console.log(`🔨 Build Working: ✅ YES`)

console.log(`\n🎯 OVERALL STATUS: ${isHealthy ? '✅ READY FOR VERCEL' : '❌ ISSUES DETECTED'}`)

// 9. Vercel Deployment Recommendations
console.log('\n🚀 VERCEL DEPLOYMENT RECOMMENDATIONS:')

if (isHealthy) {
  console.log('✅ Application is ready for Vercel deployment!')
  console.log('\n📋 Next Steps:')
  console.log('1. Deploy to Vercel (development environment first)')
  console.log('2. Test diagnostic endpoints:')
  console.log('   - /api/health')
  console.log('   - /api/test-env')
  console.log('   - /api/debug/sheets')
  console.log('3. Verify Google Sheets connection')
  console.log('4. Test application functionality')
  console.log('5. Deploy to production')
  
  console.log('\n🔗 Diagnostic URLs (after deployment):')
  console.log('- Health: https://your-app.vercel.app/api/health')
  console.log('- Environment: https://your-app.vercel.app/api/test-env')
  console.log('- Sheets: https://your-app.vercel.app/api/debug/sheets')
  console.log('- Protection: https://your-app.vercel.app/api/production-check')
} else {
  console.log('❌ Issues detected that need to be resolved before deployment')
  
  if (!isSheetIdCorrect) {
    console.log('🔧 Fix: Restore correct Google Sheet ID in production constants')
  }
  if (routesFound < 8) {
    console.log('🔧 Fix: Ensure all API routes are properly created')
  }
  if (filesFound < 5) {
    console.log('🔧 Fix: Ensure all critical files are present')
  }
}

console.log('\n' + '='.repeat(70))
console.log('🔍 VERCEL DEVELOPMENT VERIFICATION: COMPLETED')

// Exit with appropriate code
process.exit(isHealthy ? 0 : 1)
