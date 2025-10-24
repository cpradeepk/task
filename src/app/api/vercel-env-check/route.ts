import { NextRequest, NextResponse } from 'next/server'

/**
 * Vercel-specific environment variables checker
 * Helps debug Google Sheets integration issues on Vercel
 */
export async function GET(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString()
    
    // Detect environment
    const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL)
    const environment = {
      isVercel,
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      nodeEnv: process.env.NODE_ENV || 'unknown',
      vercelUrl: process.env.VERCEL_URL || 'unknown'
    }

    // Check all required Google Sheets environment variables
    const requiredVars = [
      'GOOGLE_PROJECT_ID',
      'GOOGLE_CLIENT_EMAIL',
      'GOOGLE_CLIENT_ID', 
      'GOOGLE_PRIVATE_KEY_ID',
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_CLIENT_CERT_URL'
    ]

    const envCheck: Record<string, any> = {}
    let presentCount = 0
    let validCount = 0

    requiredVars.forEach(varName => {
      const value = process.env[varName]
      const isPresent = !!value
      const isValid = isPresent && !value.includes('your-') && !value.includes('placeholder')

      if (isPresent) presentCount++
      if (isValid) validCount++

      envCheck[varName] = {
        present: isPresent,
        valid: isValid,
        length: value ? value.length : 0
      }

      // Special handling for private key
      if (varName === 'GOOGLE_PRIVATE_KEY' && value) {
        envCheck[varName] = {
          ...envCheck[varName],
          hasBeginMarker: value.includes('-----BEGIN PRIVATE KEY-----'),
          hasEndMarker: value.includes('-----END PRIVATE KEY-----'),
          hasNewlines: value.includes('\n'),
          hasEscapedNewlines: value.includes('\\n'),
          preview: value.substring(0, 50) + '...',
          formatValid: value.includes('-----BEGIN PRIVATE KEY-----') && 
                      value.includes('-----END PRIVATE KEY-----')
        }
      }
    })

    // Overall status
    const allPresent = presentCount === requiredVars.length
    const allValid = validCount === requiredVars.length
    const status = allValid ? 'SUCCESS' : allPresent ? 'INVALID_VALUES' : 'MISSING_VARS'

    // Specific issues detection
    const issues = []
    if (!allPresent) {
      issues.push(`Missing ${requiredVars.length - presentCount} environment variables`)
    }
    if (!allValid && allPresent) {
      issues.push('Some environment variables contain placeholder values')
    }
    if (envCheck['GOOGLE_PRIVATE_KEY'] && !envCheck['GOOGLE_PRIVATE_KEY'].formatValid) {
      issues.push('Private key format is invalid (missing BEGIN/END markers)')
    }

    // Recommendations
    const recommendations = []
    if (!allPresent) {
      recommendations.push('Set all required environment variables in Vercel Dashboard')
      recommendations.push('Run "npm run setup-vercel-env" to get correct values')
    }
    if (!allValid) {
      recommendations.push('Replace placeholder values with actual credentials')
    }
    if (envCheck['GOOGLE_PRIVATE_KEY'] && !envCheck['GOOGLE_PRIVATE_KEY'].formatValid) {
      recommendations.push('Copy the complete private key including BEGIN/END markers')
      recommendations.push('Ensure line breaks are preserved in the private key')
    }
    if (allValid) {
      recommendations.push('All environment variables are correctly configured!')
      recommendations.push('Test Google Sheets connection at /api/verify-integration')
    }

    // Vercel-specific guidance
    const vercelGuidance = isVercel ? {
      dashboardUrl: 'https://vercel.com/dashboard',
      settingsPath: 'Your Project → Settings → Environment Variables',
      environments: ['Production', 'Preview', 'Development'],
      note: 'Ensure variables are set for ALL environments (Production, Preview, Development)'
    } : {
      note: 'Not running on Vercel - this check is for Vercel deployments'
    }

    return NextResponse.json({
      timestamp,
      status,
      success: allValid,
      environment,
      summary: {
        totalRequired: requiredVars.length,
        present: presentCount,
        valid: validCount,
        allPresent,
        allValid
      },
      variables: envCheck,
      issues: issues.length > 0 ? issues : ['No issues detected'],
      recommendations,
      vercelGuidance,
      nextSteps: allValid ? [
        'Test Google Sheets connection: /api/verify-integration',
        'Test user data loading: /api/users',
        'Check that API responses show "source": "google_sheets"'
      ] : [
        'Fix the issues listed above',
        'Redeploy your application',
        'Test again with this endpoint'
      ]
    }, { 
      status: allValid ? 200 : 400 
    })

  } catch (error) {
    console.error('Vercel environment check error:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      success: false,
      error: 'Failed to check environment variables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
