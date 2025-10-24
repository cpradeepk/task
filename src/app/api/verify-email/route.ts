import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email/service'
import { EMAIL_CONFIG } from '@/lib/email/config'
import { getUserCredentialsHtmlTemplate } from '@/lib/email/htmlTemplates'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[],
    summary: {
      passed: 0,
      failed: 0,
      total: 0
    }
  }

  // Helper function to add test result
  const addTest = (name: string, passed: boolean, details: any = null, error: any = null) => {
    results.tests.push({
      name,
      passed,
      details,
      error: error ? (error instanceof Error ? error.message : error) : null
    })
    if (passed) results.summary.passed++
    else results.summary.failed++
    results.summary.total++
  }

  try {
    console.log('🧪 Starting comprehensive email verification...')

    // Test 1: Check email configuration
    console.log('📋 Test 1: Email Configuration')
    try {
      const config = {
        enabled: EMAIL_CONFIG.features.enabled,
        testMode: EMAIL_CONFIG.features.testMode,
        debugMode: EMAIL_CONFIG.features.debugMode,
        smtpHost: EMAIL_CONFIG.smtp.host,
        smtpPort: EMAIL_CONFIG.smtp.port,
        smtpUser: EMAIL_CONFIG.smtp.auth.user ? 'configured' : 'missing',
        smtpPass: EMAIL_CONFIG.smtp.auth.pass ? 'configured' : 'missing',
        fromEmail: EMAIL_CONFIG.from.email,
        fromName: EMAIL_CONFIG.from.name,
      }
      
      const configValid = config.enabled && config.smtpUser === 'configured' && config.smtpPass === 'configured'
      addTest('Email Configuration', configValid, config)
    } catch (error) {
      addTest('Email Configuration', false, null, error)
    }

    // Test 2: Check template files exist
    console.log('📄 Test 2: Template Files')
    try {
      const templatePath = path.join(process.cwd(), 'public', 'email-preview.html')
      const templateExists = fs.existsSync(templatePath)
      const templateSize = templateExists ? fs.statSync(templatePath).size : 0
      
      addTest('Template Files', templateExists && templateSize > 0, {
        path: templatePath,
        exists: templateExists,
        size: templateSize
      })
    } catch (error) {
      addTest('Template Files', false, null, error)
    }

    // Test 3: Test template generation
    console.log('🎨 Test 3: Template Generation')
    try {
      const testData = {
        userName: 'Test User',
        userEmail: 'test@example.com',
        employeeId: 'AM-TEST',
        temporaryPassword: 'TestPass123!',
        department: 'IT',
        role: 'Employee',
        manager: 'Test Manager',
        baseUrl: 'https://test.com'
      }
      
      const html = getUserCredentialsHtmlTemplate(testData)
      const hasPlaceholders = html.includes('{{')
      const hasContent = html.includes('Test User') && html.includes('AM-TEST')
      
      addTest('Template Generation', !hasPlaceholders && hasContent, {
        htmlLength: html.length,
        hasUnreplacedPlaceholders: hasPlaceholders,
        hasTestData: hasContent
      })
    } catch (error) {
      addTest('Template Generation', false, null, error)
    }

    // Test 4: Email service initialization
    console.log('⚙️ Test 4: Email Service Initialization')
    try {
      const status = emailService.getStatus()
      const isAvailable = await emailService.isAvailableAsync()
      
      addTest('Email Service Initialization', isAvailable, {
        status,
        availableAsync: isAvailable
      })
    } catch (error) {
      addTest('Email Service Initialization', false, null, error)
    }

    // Test 5: Test email sending (in test mode)
    console.log('📧 Test 5: Email Sending')
    try {
      const emailResult = await emailService.sendUserCredentialsEmail({
        userEmail: 'verification@test.com',
        userName: 'Verification Test User',
        employeeId: 'AM-VERIFY',
        temporaryPassword: 'VerifyPass123!',
        department: 'Testing',
        role: 'Test Employee',
        manager: 'Test Manager',
      })
      
      addTest('Email Sending', emailResult.success, emailResult)
    } catch (error) {
      addTest('Email Sending', false, null, error)
    }

    console.log('✅ Email verification completed')
    
    return NextResponse.json({
      success: results.summary.failed === 0,
      message: `Email verification completed: ${results.summary.passed}/${results.summary.total} tests passed`,
      results
    })

  } catch (error) {
    console.error('❌ Email verification failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Email verification failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 })
  }
}

// POST endpoint to test sending actual email
export async function POST(request: NextRequest) {
  try {
    const { email, name, employeeId } = await request.json()
    
    if (!email || !name || !employeeId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: email, name, employeeId'
      }, { status: 400 })
    }

    console.log(`📧 Testing email send to: ${email}`)
    
    const emailResult = await emailService.sendUserCredentialsEmail({
      userEmail: email,
      userName: name,
      employeeId: employeeId,
      temporaryPassword: 'TestPassword123!',
      department: 'Test Department',
      role: 'Test Role',
      manager: 'Test Manager',
    })

    return NextResponse.json({
      success: emailResult.success,
      message: emailResult.success ? 'Test email sent successfully' : 'Failed to send test email',
      data: emailResult
    })

  } catch (error) {
    console.error('❌ Test email sending failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Test email sending failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
