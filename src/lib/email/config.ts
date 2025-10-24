/**
 * Email Configuration
 * Configure email service settings and SMTP details
 */

export const EMAIL_CONFIG = {
  // SMTP Configuration (using Gmail with SSL)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for 465 (SSL), false for other ports
    auth: {
      user: process.env.SMTP_USER || '', // Your email
      pass: process.env.SMTP_PASSWORD || '', // Your app password
    },
    requireTLS: true, // Require TLS
    tls: {
      rejectUnauthorized: false // Accept self-signed certificates
    }
  },

  // Default sender information
  from: {
    name: process.env.EMAIL_FROM_NAME || 'Amtariksha Task Management',
    email: process.env.EMAIL_FROM_EMAIL || 'manager@eassy.life',
  },



  // Email templates configuration
  templates: {
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    logoUrl: process.env.EMAIL_LOGO_URL || '/images/logos/amtariksha_icon.png',
    companyName: 'Amtariksha',
    supportContact: 'mailcpk@gmail.com',
  },

  // Feature flags
  features: {
    enabled: process.env.EMAIL_ENABLED !== 'false', // Enable/disable email sending
    testMode: process.env.EMAIL_TEST_MODE === 'true', // Test mode (logs instead of sending)
    debugMode: process.env.EMAIL_DEBUG === 'true', // Debug logging
  },
}

// Email types for different notifications
export const EMAIL_TYPES = {
  TASK_CREATED: 'task_created',
  LEAVE_APPROVED: 'leave_approved',
  LEAVE_REJECTED: 'leave_rejected',
  USER_CREDENTIALS: 'user_credentials',
  WFH_APPROVED: 'wfh_approved',
  WFH_REJECTED: 'wfh_rejected',
} as const

export type EmailType = typeof EMAIL_TYPES[keyof typeof EMAIL_TYPES]

// Email priority levels
export const EMAIL_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const

export type EmailPriority = typeof EMAIL_PRIORITY[keyof typeof EMAIL_PRIORITY]
