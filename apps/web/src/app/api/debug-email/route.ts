import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email/service'
import { EMAIL_CONFIG } from '@/lib/email/config'
import { getUserCredentialsHtmlTemplate } from '@/lib/email/htmlTemplates'

export async function GET() {
  try {
    console.log('🔍 Starting email debug...')
    
    // Check email service availability
    const isAvailable = await emailService.isAvailableAsync()
    console.log('📧 Email service available:', isAvailable)
    
    // Check email configuration
    console.log('⚙️ Email config:', {
      enabled: EMAIL_CONFIG.features.enabled,
      testMode: EMAIL_CONFIG.features.testMode,
      debugMode: EMAIL_CONFIG.features.debugMode,
      smtpHost: EMAIL_CONFIG.smtp.host,
      smtpPort: EMAIL_CONFIG.smtp.port,
      smtpUser: EMAIL_CONFIG.smtp.auth.user ? '***configured***' : 'NOT SET',
      smtpPass: EMAIL_CONFIG.smtp.auth.pass ? '***configured***' : 'NOT SET',
      fromEmail: EMAIL_CONFIG.from.email,
      fromName: EMAIL_CONFIG.from.name,
    })
    
    // Test template reading
    console.log('📄 Testing template reading...')
    try {
      const testTemplate = getUserCredentialsHtmlTemplate({
        userName: 'Test User',
        userEmail: 'test@example.com',
        employeeId: 'AM-TEST',
        temporaryPassword: 'TestPass123!',
        department: 'IT',
        role: 'Employee',
        manager: 'Test Manager',
        baseUrl: 'https://test.com'
      })
      console.log('✅ Template generated successfully, length:', testTemplate.length)
    } catch (templateError) {
      console.error('❌ Template generation failed:', templateError)
      return NextResponse.json({
        success: false,
        error: 'Template generation failed',
        details: templateError instanceof Error ? templateError.message : 'Unknown template error'
      }, { status: 500 })
    }
    
    // Test email sending
    console.log('📧 Testing email sending...')
    try {
      const emailResult = await emailService.sendUserCredentialsEmail({
        userEmail: 'test@example.com',
        userName: 'Debug Test User',
        employeeId: 'AM-DEBUG',
        temporaryPassword: 'DebugPass123!',
        department: 'IT',
        role: 'Employee',
        manager: 'Debug Manager',
      })
      
      console.log('📧 Email result:', emailResult)
      
      return NextResponse.json({
        success: true,
        message: 'Email debug completed',
        data: {
          serviceAvailable: isAvailable,
          config: {
            enabled: EMAIL_CONFIG.features.enabled,
            testMode: EMAIL_CONFIG.features.testMode,
            debugMode: EMAIL_CONFIG.features.debugMode,
            smtpConfigured: !!(EMAIL_CONFIG.smtp.auth.user && EMAIL_CONFIG.smtp.auth.pass)
          },
          emailResult
        }
      })
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError)
      return NextResponse.json({
        success: false,
        error: 'Email sending failed',
        details: emailError instanceof Error ? emailError.message : 'Unknown email error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
