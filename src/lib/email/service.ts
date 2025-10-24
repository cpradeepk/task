/**
 * Email Service
 * Handles sending emails with proper error handling and logging
 */

import nodemailer from 'nodemailer'
import { EMAIL_CONFIG, EmailType, EmailPriority } from './config'
import {
  getUserCredentialsHtmlTemplate,
  getTaskCreationHtmlTemplate,
  getLeaveStatusHtmlTemplate
} from './htmlTemplates'

// Email service class
export class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null

  constructor() {
    this.initializationPromise = this.initialize()
  }

  private async initialize() {
    try {
      console.log('🔄 Initializing email service...')

      if (!EMAIL_CONFIG.features.enabled) {
        console.log('📧 Email service disabled by configuration')
        this.isInitialized = true // Mark as initialized even if disabled
        return
      }

      if (!EMAIL_CONFIG.smtp.auth.user || !EMAIL_CONFIG.smtp.auth.pass) {
        console.warn('⚠️ Email credentials not configured. Email service will run in test mode.')
        this.isInitialized = true // Mark as initialized for test mode
        return
      }

      this.transporter = nodemailer.createTransport({
        host: EMAIL_CONFIG.smtp.host,
        port: EMAIL_CONFIG.smtp.port,
        secure: EMAIL_CONFIG.smtp.secure,
        auth: {
          user: EMAIL_CONFIG.smtp.auth.user,
          pass: EMAIL_CONFIG.smtp.auth.pass,
        },
      })

      // Verify connection
      if (!EMAIL_CONFIG.features.testMode) {
        await this.transporter.verify()
        console.log('✅ Email service initialized successfully')
      } else {
        console.log('✅ Email service initialized in test mode')
      }

      this.isInitialized = true
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error)
      this.isInitialized = false
    }
  }

  // Ensure initialization is complete
  private async ensureInitialized() {
    if (this.initializationPromise) {
      await this.initializationPromise
    }
  }

  private async sendEmail(options: {
    to: string | string[]
    cc?: string | string[]
    subject: string
    html: string
    priority?: EmailPriority
    type: EmailType
  }) {
    try {
      if (!EMAIL_CONFIG.features.enabled) {
        console.log('📧 Email sending disabled')
        return { success: false, message: 'Email service disabled' }
      }

      // Map our priority to nodemailer priority
      const nodemailerPriority = (options.priority === 'urgent' ? 'high' : options.priority) as 'high' | 'normal' | 'low' | undefined

      const mailOptions = {
        from: `${EMAIL_CONFIG.from.name} <${EMAIL_CONFIG.from.email}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        subject: options.subject,
        html: options.html,
        priority: nodemailerPriority || 'normal',
        headers: {
          'X-Email-Type': options.type,
          'X-Mailer': 'EassyLife Task Management System',
        },
      }

      if (EMAIL_CONFIG.features.testMode || !this.transporter) {
        console.log('📧 [TEST MODE] Email would be sent:', {
          to: mailOptions.to,
          cc: mailOptions.cc,
          subject: mailOptions.subject,
          type: options.type,
        })
        return { success: true, message: 'Email sent (test mode)', messageId: 'test-' + Date.now() }
      }

      const result = await this.transporter.sendMail(mailOptions)
      
      if (EMAIL_CONFIG.features.debugMode) {
        console.log('📧 Email sent successfully:', {
          messageId: result.messageId,
          to: mailOptions.to,
          subject: mailOptions.subject,
        })
      }

      return { success: true, message: 'Email sent successfully', messageId: result.messageId }
    } catch (error) {
      console.error('❌ Failed to send email:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Send task creation notification
  async sendTaskCreatedEmail(data: {
    creatorName: string
    creatorEmail: string
    managerEmail?: string
    taskTitle: string
    taskDescription: string
    priority: string
    dueDate: string
    assignedTo: string
    taskId: string
  }) {
    const html = getTaskCreationHtmlTemplate({
      userName: data.creatorName,
      taskTitle: data.taskTitle,
      taskDescription: data.taskDescription,
      priority: data.priority,
      dueDate: data.dueDate,
      assignedTo: data.assignedTo,
      taskId: data.taskId,
      createdBy: data.creatorName,
      baseUrl: EMAIL_CONFIG.templates.baseUrl,
    })

    const ccEmails = []
    if (data.managerEmail) ccEmails.push(data.managerEmail)

    return await this.sendEmail({
      to: data.creatorEmail,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      subject: `✅ Task Created: ${data.taskTitle}`,
      html,
      priority: data.priority.toLowerCase() === 'high' ? 'high' : 'normal',
      type: 'task_created',
    })
  }

  // Send leave approval/rejection notification
  async sendLeaveStatusEmail(data: {
    userEmail: string
    userName: string
    leaveType: string
    startDate: string
    endDate: string
    days: number
    status: 'approved' | 'rejected'
    reason?: string
    approvedBy: string
    comments?: string
  }) {
    const html = getLeaveStatusHtmlTemplate({
      ...data,
      baseUrl: EMAIL_CONFIG.templates.baseUrl,
    })
    const statusText = data.status === 'approved' ? 'Approved' : 'Rejected'
    const statusIcon = data.status === 'approved' ? '✅' : '❌'

    return await this.sendEmail({
      to: data.userEmail,
      subject: `${statusIcon} Leave Application ${statusText}: ${data.leaveType}`,
      html,
      priority: 'normal',
      type: data.status === 'approved' ? 'leave_approved' : 'leave_rejected',
    })
  }

  // Send user credentials email
  async sendUserCredentialsEmail(data: {
    userEmail: string
    userName: string
    employeeId: string
    temporaryPassword: string
    department: string
    role: string
    manager?: string
  }) {
    try {
      console.log('📧 Ensuring email service is initialized...')
      await this.ensureInitialized()

      console.log('📧 Generating user credentials email template...')
      const html = getUserCredentialsHtmlTemplate({
        userName: data.userName,
        userEmail: data.userEmail,
        employeeId: data.employeeId,
        temporaryPassword: data.temporaryPassword,
        department: data.department,
        role: data.role,
        manager: data.manager,
        baseUrl: EMAIL_CONFIG.templates.baseUrl,
      })

      console.log('📧 Sending user credentials email...')
      return await this.sendEmail({
        to: data.userEmail,
        subject: `🔐 Welcome to ${EMAIL_CONFIG.templates.companyName} - Your Account Details`,
        html,
        priority: 'high',
        type: 'user_credentials',
      })
    } catch (error) {
      console.error('❌ Failed to send credentials email:', error)
      return { success: false, message: `Failed to send credentials email: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
  }

  // Send WFH approval/rejection notification (similar to leave)
  async sendWFHStatusEmail(data: {
    userEmail: string
    userName: string
    wfhDate: string
    status: 'approved' | 'rejected'
    reason?: string
    approvedBy: string
    comments?: string
  }) {
    // Reuse leave template with WFH-specific data
    const html = getLeaveStatusHtmlTemplate({
      userName: data.userName,
      leaveType: 'Work From Home',
      startDate: data.wfhDate,
      endDate: data.wfhDate,
      days: 1,
      status: data.status,
      reason: data.reason,
      approvedBy: data.approvedBy,
      comments: data.comments,
      baseUrl: EMAIL_CONFIG.templates.baseUrl,
    })

    const statusText = data.status === 'approved' ? 'Approved' : 'Rejected'
    const statusIcon = data.status === 'approved' ? '✅' : '❌'

    return await this.sendEmail({
      to: data.userEmail,
      subject: `${statusIcon} Work From Home Request ${statusText}: ${data.wfhDate}`,
      html,
      priority: 'normal',
      type: data.status === 'approved' ? 'wfh_approved' : 'wfh_rejected',
    })
  }

  // Check if email service is available
  isAvailable(): boolean {
    return EMAIL_CONFIG.features.enabled && (this.isInitialized || EMAIL_CONFIG.features.testMode)
  }

  // Async version that waits for initialization
  async isAvailableAsync(): Promise<boolean> {
    await this.ensureInitialized()
    return this.isAvailable()
  }

  // Get service status
  getStatus() {
    return {
      enabled: EMAIL_CONFIG.features.enabled,
      testMode: EMAIL_CONFIG.features.testMode,
      initialized: this.isInitialized,
      available: this.isAvailable(),
    }
  }
}

// Create singleton instance
export const emailService = new EmailService()

// Export types for use in other files
export type { EmailType, EmailPriority }
