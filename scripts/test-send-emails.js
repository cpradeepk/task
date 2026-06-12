#!/usr/bin/env node

/**
 * ============================================================================
 * Karmayog Email Notification Test Suite
 * ============================================================================
 * 
 * DESCRIPTION:
 * This script tests the transactional email notifications by compiling and 
 * sending all 11 core email types used across the Karmayog system.
 * 
 * PREREQUISITES:
 * 1. Requires valid SMTP credentials defined in 'apps/web/.env.local'.
 * 2. Specifically utilizes SMTP_USER and SMTP_PASSWORD (a Gmail App Password).
 * 
 * OUTPUTS:
 * 1. Transmits live emails via SMTP to the target address (kbshah98@gmail.com).
 * 2. Automatically outputs rendered HTML files into the local folder:
 *    'scripts/test-email-previews/' for browser preview and styling audits.
 * 
 * RUNNING THE SCRIPT:
 * From the project root, run:
 * $ node scripts/test-send-emails.js
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// ============================================================================
// 1. ENVIRONMENT CONFIGURATION LOADING
// ============================================================================
// Manually parse apps/web/.env.local to load SMTP settings without next.js context
const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            // Clean quotes from env value strings
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    });
}

// ============================================================================
// 2. SMTP TRANSPORTER SETUP
// ============================================================================
// Set up SMTP settings using the parsed environment configuration (defaults to Gmail)
const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for port 465 (SSL)
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
    },
    requireTLS: true,
    tls: {
        rejectUnauthorized: false // Accept self-signed local certificates if needed
    }
};

// Default sender profile metadata
const fromConfig = {
    name: process.env.EMAIL_FROM_NAME || 'Karmayog',
    email: process.env.EMAIL_FROM_EMAIL || 'amtariksha@gmail.com',
};

// Mapping names to actual template file names located in the web app's public folder
const TEMPLATES = {
    USER_CREDENTIALS: 'email-preview.html',
    TASK_CREATION: 'task-creation-email-preview.html',
    LEAVE_APPROVAL: 'leave-approval-email-preview.html',
    LEAVE_REJECTION: 'leave-rejection-email-preview.html',
    SUPPORT_ASSIGNMENT: 'support-assignment-email.html',
    BUG_ASSIGNMENT: 'bug-assignment-email.html',
    BUG_CREATION: 'bug-creation-email.html',
    GENERAL_NOTIFICATION: 'general-notification-email.html'
};

/**
 * Reads an HTML template file from the apps/web/public directory.
 * @param {string} templateName - The key name of the template from TEMPLATES map
 * @returns {string} - Raw HTML content
 */
function readTemplate(templateName) {
    const filename = TEMPLATES[templateName];
    const templatePath = path.join(__dirname, '..', 'apps', 'web', 'public', filename);
    return fs.readFileSync(templatePath, 'utf8');
}

/**
 * Replaces placeholders in the HTML template.
 * Resolves both conditional logic blocks and raw text/value replacements.
 * 
 * @param {string} template - The raw HTML template string
 * @param {Record<string, any>} data - Object mapping keynames to values
 * @returns {string} - Rendered HTML template ready for email client delivery
 */
function replacePlaceholders(template, data) {
    let result = template;
    
    // Process HTML conditional blocks: {{#if key}} content {{/if}}
    Object.keys(data).forEach(key => {
        const hasValue = !!data[key];
        const conditionalRegex = new RegExp(`{{#if ${key}}}([\\s\\S]*?){{\\/if}}`, 'g');
        if (hasValue) {
            // Keep block content
            result = result.replace(conditionalRegex, '$1');
        } else {
            // Drop block content
            result = result.replace(conditionalRegex, '');
        }
    });

    // Replace standard variables: {{variable}}
    Object.keys(data).forEach(key => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(placeholder, data[key] !== undefined ? data[key] : '');
    });
    
    return result;
}

// Array container for all 11 test emails to trigger sequentially
const emailList = [];

// ============================================================================
// 3. COMPILING TEST EMAILS
// ============================================================================

// Email 1/11: User Welcome & Access Credentials Template
const credentialsHtml = replacePlaceholders(readTemplate('USER_CREDENTIALS'), {
    userName: "Ketan Shah",
    userEmail: "kbshah98@gmail.com",
    employeeId: "EMP-001",
    temporaryPassword: "TempPassword123!",
    department: "Engineering",
    role: "Senior Developer",
    manager: "Amit Shah",
    baseUrl: "https://task.amtariksha.com",
    currentYear: new Date().getFullYear()
});
emailList.push({
    id: "01_user_credentials",
    subject: "🔐 Test 1/11: Welcome to Karmayog - Your Account Details",
    html: credentialsHtml
});

// Email 2/11: Task Created Confirmation Email (Sent to Creator/Owner)
const taskCreatedHtml = replacePlaceholders(readTemplate('TASK_CREATION'), {
    userName: "Ketan Shah",
    taskTitle: "Design Database Schema for Notifications",
    taskDescription: "Create PostgreSQL tables for user feed notifications, indices, and support references.",
    priority: "High",
    dueDate: "2026-06-20",
    assignedTo: "Ketan Shah",
    taskId: "TSK-101",
    createdBy: "System Administrator",
    baseUrl: "https://task.amtariksha.com",
    projectName: "Task App",
    currentYear: new Date().getFullYear()
});
emailList.push({
    id: "02_task_created",
    subject: "✅ Test 2/11: Task Created: Design Database Schema for Notifications",
    html: taskCreatedHtml
});

// Email 3/11: Task Assigned Notification (Sent to Assignee)
const taskAssignedHtml = replacePlaceholders(readTemplate('TASK_CREATION'), {
    userName: "Ketan Shah",
    taskTitle: "Integrate SMTP Email Services",
    taskDescription: "Configure nodemailer with Gmail App Password to enable transactional emails.",
    priority: "Critical",
    dueDate: "2026-06-15",
    assignedTo: "Ketan Shah",
    taskId: "TSK-102",
    createdBy: "Amit Shah",
    baseUrl: "https://task.amtariksha.com",
    projectName: "Task App",
    currentYear: new Date().getFullYear()
});
emailList.push({
    id: "03_task_assigned",
    subject: "📋 Test 3/11: New Task Assigned: Integrate SMTP Email Services",
    html: taskAssignedHtml
});

// Email 4/11: Leave Request Approved Notification
const leaveApprovedHtml = replacePlaceholders(readTemplate('LEAVE_APPROVAL'), {
    userName: "Ketan Shah",
    leaveType: "Annual Leave",
    startDate: "2026-07-01",
    endDate: "2026-07-05",
    days: "5",
    status: "approved",
    reason: "Family vacation",
    approvedBy: "HR Manager",
    comments: "Approved. Enjoy your vacation!",
    baseUrl: "https://task.amtariksha.com",
    currentYear: new Date().getFullYear()
});
emailList.push({
    id: "04_leave_approved",
    subject: "✅ Test 4/11: Leave Application Approved: Annual Leave",
    html: leaveApprovedHtml
});

// Email 5/11: Leave Request Rejected Notification
const leaveRejectedHtml = replacePlaceholders(readTemplate('LEAVE_REJECTION'), {
    userName: "Ketan Shah",
    leaveType: "Sick Leave",
    startDate: "2026-06-10",
    endDate: "2026-06-11",
    days: "2",
    status: "rejected",
    reason: "Routine medical checkup",
    approvedBy: "Operations Head",
    comments: "Please reschedule to non-critical release days.",
    baseUrl: "https://task.amtariksha.com",
    currentYear: new Date().getFullYear()
});
emailList.push({
    id: "05_leave_rejected",
    subject: "❌ Test 5/11: Leave Application Rejected: Sick Leave",
    html: leaveRejectedHtml
});

// Email 6/11: Work From Home Request Approved Notification
const wfhApprovedHtml = replacePlaceholders(readTemplate('LEAVE_APPROVAL'), {
    userName: "Ketan Shah",
    leaveType: "Work From Home",
    startDate: "2026-06-18",
    endDate: "2026-06-18",
    days: "1",
    status: "approved",
    reason: "Broadband installation at home",
    approvedBy: "Amit Shah",
    comments: "Ensure you are reachable on Slack.",
    baseUrl: "https://task.amtariksha.com",
    currentYear: new Date().getFullYear()
});
emailList.push({
    id: "06_wfh_approved",
    subject: "✅ Test 6/11: Work From Home Request Approved: 2026-06-18",
    html: wfhApprovedHtml
});

// Email 7/11: Work From Home Request Rejected Notification
const wfhRejectedHtml = replacePlaceholders(readTemplate('LEAVE_REJECTION'), {
    userName: "Ketan Shah",
    leaveType: "Work From Home",
    startDate: "2026-06-19",
    endDate: "2026-06-19",
    days: "1",
    status: "rejected",
    reason: "Personal errands",
    approvedBy: "Amit Shah",
    comments: "In-person team meeting scheduled for Friday.",
    baseUrl: "https://task.amtariksha.com",
    currentYear: new Date().getFullYear()
});
emailList.push({
    id: "07_wfh_rejected",
    subject: "❌ Test 7/11: Work From Home Request Rejected: 2026-06-19",
    html: wfhRejectedHtml
});

// Email 8/11: Support Member Assignment Notification
const supportAssignedHtml = replacePlaceholders(readTemplate('SUPPORT_ASSIGNMENT'), {
    supportMemberName: "Ketan Shah",
    mainTaskId: "TSK-201",
    mainTaskDescription: "Upgrade next.js package versions",
    priority: "High",
    priorityClass: "high",
    dueDate: "2026-06-25",
    assignedBy: "Amit Shah",
    supportTaskId: "TSK-202",
    baseUrl: "https://task.amtariksha.com",
    currentYear: new Date().getFullYear()
});
emailList.push({
    id: "08_support_assigned",
    subject: "🤝 Test 8/11: You've been assigned as support for task TSK-201",
    html: supportAssignedHtml
});

// Email 9/11: Bug Assigned Notification
const bugAssignedHtml = replacePlaceholders(readTemplate('BUG_ASSIGNMENT'), {
    assigneeName: "Ketan Shah",
    assignedByName: "Amit Shah",
    bugId: "BUG-401",
    bugTitle: "Session timeout redirection failure",
    bugDescription: "User is not redirected to login page when JWT session expires, displaying a blank screen instead.",
    severity: "Critical",
    severityClass: "critical",
    priority: "High",
    priorityClass: "high",
    category: "Authentication",
    platform: "Web",
    environment: "Production",
    projectName: "Task App",
    feature: "Auth",
    type: "Bug",
    baseUrl: "https://task.amtariksha.com",
    currentYear: new Date().getFullYear()
});
emailList.push({
    id: "09_bug_assigned",
    subject: "🐛 Test 9/11: Bug Assigned: Session timeout redirection failure (BUG-401)",
    html: bugAssignedHtml
});

// Email 10/11: Bug Creation Confirmation Notification
const bugCreatedHtml = replacePlaceholders(readTemplate('BUG_CREATION'), {
    reporterName: "Ketan Shah",
    bugId: "BUG-402",
    bugTitle: "Profile picture upload failure on mobile",
    bugDescription: "Uploading profile photo from Android camera throws S3 credentials error.",
    status: "New",
    severity: "Major",
    severityClass: "major",
    priority: "Medium",
    priorityClass: "medium",
    category: "Profile",
    platform: "Mobile",
    environment: "Staging",
    projectName: "Task App",
    feature: "Settings",
    type: "Bug",
    baseUrl: "https://task.amtariksha.com",
    currentYear: new Date().getFullYear()
});
emailList.push({
    id: "10_bug_created",
    subject: "📋 Test 10/11: Bug Report Created: Profile picture upload failure on mobile (BUG-402)",
    html: bugCreatedHtml
});

// Email 11/11: General Feed Alert Notification (Comments, Mentions, Reactions)
const generalNotificationHtml = replacePlaceholders(readTemplate('GENERAL_NOTIFICATION'), {
    userName: "Ketan Shah",
    actorName: "Amit Shah",
    notificationTitle: "Amit Shah commented on your task",
    notificationMessage: "Please look at the failing API test cases on the staging build.",
    actionUrl: "https://task.amtariksha.com/tasks/TSK-101",
    actionText: "View Task",
    baseUrl: "https://task.amtariksha.com",
    currentYear: new Date().getFullYear().toString()
});
emailList.push({
    id: "11_general_notification",
    subject: "🔔 Test 11/11: Notification: Amit Shah commented on your task",
    html: generalNotificationHtml
});

// ============================================================================
// 4. EXECUTION FLOW
// ============================================================================
async function main() {
    // Stage 1: Render and write HTML files locally so they can be viewed without SMTP
    const previewDir = path.join(__dirname, 'test-email-previews');
    if (!fs.existsSync(previewDir)) {
        fs.mkdirSync(previewDir, { recursive: true });
    }
    
    console.log(`📁 Saving template previews locally to: ${previewDir}`);
    emailList.forEach(email => {
        const filePath = path.join(previewDir, `${email.id}.html`);
        fs.writeFileSync(filePath, email.html, 'utf8');
        console.log(`   💾 Saved ${email.id}.html`);
    });
    
    // Stage 2: Connect to SMTP and sequentially transmit test notifications
    console.log("\n🚀 Starting SMTP transmission tests to: kbshah98@gmail.com");
    console.log(`   SMTP Server: ${smtpConfig.host}:${smtpConfig.port}`);
    console.log(`   SMTP User:   ${smtpConfig.auth.user}`);
    
    const transporter = nodemailer.createTransport(smtpConfig);
    
    // Confirm connection credentials before starting email delivery loop
    try {
        await transporter.verify();
        console.log("   ✅ SMTP connection verified successfully");
    } catch (err) {
        console.error("   ❌ SMTP connection verification failed:", err.message);
        console.log("\n⚠️  SMTP credentials in .env.local are invalid. Check test-email-previews/ folder for rendered outputs.");
        return;
    }
    
    const recipient = "kbshah98@gmail.com";
    
    // Deliver all test emails sequentially
    for (let i = 0; i < emailList.length; i++) {
        const email = emailList[i];
        const mailOptions = {
            from: `"${fromConfig.name}" <${fromConfig.email}>`,
            to: recipient,
            subject: email.subject,
            html: email.html,
            priority: 'normal'
        };
        
        try {
            console.log(`✉️ Sending [${i + 1}/${emailList.length}]: ${email.subject}...`);
            const result = await transporter.sendMail(mailOptions);
            console.log(`   ✅ Success! MessageId: ${result.messageId}`);
        } catch (err) {
            console.error(`   ❌ Failed to send ${email.subject}:`, err.message);
        }
        
        // Wait 1 second between sends to avoid rate limits or Gmail spam classifications
        if (i < emailList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.log("🏁 Email sending tests complete!");
}

main().catch(console.error);
