// Server-side configuration - do not use 'use client'

import { getProductionSheetId, validateAbsoluteSheetId, ABSOLUTE_PRODUCTION_SHEET_ID } from '../constants/production'

// Google Sheets Configuration
// 🔒 ABSOLUTE PRODUCTION LOCK: This configuration uses ABSOLUTE protection
// 🚨 CRITICAL: Uses production constants that CANNOT be modified
// 📋 SHEET URL: https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit
// 🔐 DEPLOYMENT: Multiple layers of protection prevent any changes

// ABSOLUTE VALIDATION FUNCTION - CANNOT BE BYPASSED
function getValidatedSheetId(): string {
  // Get the absolute production sheet ID
  const sheetId = getProductionSheetId()

  // Double validation with absolute constants
  validateAbsoluteSheetId(sheetId)

  // Triple check against hardcoded value
  if (sheetId !== ABSOLUTE_PRODUCTION_SHEET_ID) {
    throw new Error('🚨 ABSOLUTE CRITICAL ERROR: Sheet ID validation failed at config level!')
  }

  return sheetId
}

export const SHEETS_CONFIG = {
  // The Google Sheets ID from the URL: https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit?gid=1829622745#gid=1829622745
  // ⚠️ IMPORTANT: This ID should NEVER be changed - it preserves all existing data
  // 🔒 ABSOLUTE PRODUCTION LOCKED: Uses absolute validation with multiple protection layers
  SPREADSHEET_ID: getValidatedSheetId(),
  
  // Sheet tab names
  SHEETS: {
    USER_DETAILS: 'UserDetails',
    JSR: 'JSR',
    LEAVE_APPLICATIONS: 'Leave_Applications',
    WFH_APPLICATIONS: 'WFH_Applications',
    BUG_TRACKING: 'Bug_Tracking',
    BUG_COMMENTS: 'Bug_Comments'
  },
  
  // Column ranges for each sheet
  RANGES: {
    USER_DETAILS: 'UserDetails!A:O',
    JSR: 'JSR!A:X',
    LEAVE_APPLICATIONS: 'Leave_Applications!A:P',
    WFH_APPLICATIONS: 'WFH_Applications!A:R',
    BUG_TRACKING: 'Bug_Tracking!A:AC',
    BUG_COMMENTS: 'Bug_Comments!A:D'
  },
  
  // Headers for each sheet
  HEADERS: {
    USER_DETAILS: [
      'Employee_ID', 'Name', 'Email', 'Phone', 'Telegram_Token', 'Department',
      'Manager_Email', 'Manager_ID', 'Is_Today_Task', 'Warning_Count', 'Role',
      'Password', 'Status', 'Created_At', 'Updated_At'
    ],
    JSR: [
      'ID', 'Task_ID', 'Select_Type', 'Recursive_Type', 'Description', 'Assigned_To',
      'Assigned_By', 'Support', 'Start_Date', 'End_Date', 'Priority', 'Estimated_Hours',
      'Actual_Hours', 'Daily_Hours', 'Status', 'Remarks', 'Difficulties', 'Sub_Task', 'Timer_State',
      'Timer_Start_Time', 'Timer_Paused_Time', 'Timer_Total_Time', 'Timer_Sessions',
      'Created_At', 'Updated_At'
    ],
    LEAVE_APPLICATIONS: [
      'ID', 'Employee_ID', 'Employee_Name', 'Leave_Type', 'Reason', 'From_Date',
      'To_Date', 'Is_Half_Day', 'Emergency_Contact', 'Status', 'Manager_ID',
      'Approved_By', 'Approval_Date', 'Approval_Remarks', 'Created_At', 'Updated_At'
    ],
    WFH_APPLICATIONS: [
      'ID', 'Employee_ID', 'Employee_Name', 'WFH_Type', 'Reason', 'From_Date',
      'To_Date', 'Work_Location', 'Available_From', 'Available_To', 'Contact_Number',
      'Status', 'Manager_ID', 'Approved_By', 'Approval_Date', 'Approval_Remarks',
      'Created_At', 'Updated_At'
    ],
    BUG_TRACKING: [
      'Bug_ID', 'Title', 'Description', 'Severity', 'Priority', 'Status', 'Category',
      'Platform', 'Assigned_To', 'Assigned_By', 'Reported_By', 'Environment',
      'Browser_Info', 'Device_Info', 'Steps_To_Reproduce', 'Expected_Behavior',
      'Actual_Behavior', 'Attachments', 'Estimated_Hours', 'Actual_Hours',
      'Resolved_Date', 'Closed_Date', 'Reopened_Count', 'Tags', 'Related_Bugs',
      'Created_At', 'Updated_At'
    ],
    BUG_COMMENTS: [
      'Bug_ID', 'Commented_By', 'Comment_Text', 'Timestamp'
    ]
  }
}

// Function to process private key properly for Vercel environment
function processPrivateKey(privateKey: string | undefined): string | undefined {
  if (!privateKey) return undefined

  // Remove surrounding quotes if present
  let processed = privateKey.trim()
  if ((processed.startsWith('"') && processed.endsWith('"')) ||
      (processed.startsWith("'") && processed.endsWith("'"))) {
    processed = processed.slice(1, -1)
  }

  // Replace escaped newlines with actual newlines
  processed = processed.replace(/\\n/g, '\n')

  // Remove any extra whitespace or carriage returns
  processed = processed.replace(/\r/g, '')

  // Ensure proper PEM format
  if (!processed.startsWith('-----BEGIN PRIVATE KEY-----')) {
    // If it doesn't start with the header, try to find and fix it
    if (processed.includes('BEGIN PRIVATE KEY')) {
      const beginIndex = processed.indexOf('BEGIN PRIVATE KEY')
      processed = '-----' + processed.substring(beginIndex)
    }
  }

  if (!processed.endsWith('-----END PRIVATE KEY-----')) {
    // If it doesn't end with the footer, try to find and fix it
    if (processed.includes('END PRIVATE KEY')) {
      const endIndex = processed.indexOf('END PRIVATE KEY') + 'END PRIVATE KEY'.length
      processed = processed.substring(0, endIndex) + '-----'
    }
  }

  // Ensure proper line structure
  const lines = processed.split('\n')
  const cleanLines = lines.map(line => line.trim()).filter(line => line.length > 0)

  // Reconstruct with proper formatting
  if (cleanLines.length > 0 && cleanLines[0] === '-----BEGIN PRIVATE KEY-----') {
    return cleanLines.join('\n')
  }

  return processed
}

// Service Account Configuration
export const SERVICE_ACCOUNT_CONFIG = {
  // These will be set via environment variables
  type: 'service_account',
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: processPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL
}

// API Scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets'
]

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 2, // Reduced from 3 to 2 for faster failures
  retryDelay: 500, // Reduced from 1000ms to 500ms for faster retries
  backoffMultiplier: 2
}

// Cache configuration
export const CACHE_CONFIG = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100 // Maximum number of cached items
}
