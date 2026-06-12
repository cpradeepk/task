#!/usr/bin/env node

/**
 * Script to send all email types as a test to kbshah98@gmail.com
 * It also saves the rendered templates locally to scripts/test-email-previews/ for manual verification.
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// 1. Manual .env.local parsing
const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    });
}

// 2. Setup SMTP Config
const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
    },
    requireTLS: true,
    tls: {
        rejectUnauthorized: false
    }
};

const fromConfig = {
    name: process.env.EMAIL_FROM_NAME || 'Karmayog',
    email: process.env.EMAIL_FROM_EMAIL || 'amtariksha@gmail.com',
};

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

function readTemplate(templateName) {
    const filename = TEMPLATES[templateName];
    const templatePath = path.join(__dirname, '..', 'apps', 'web', 'public', filename);
    return fs.readFileSync(templatePath, 'utf8');
}

function replacePlaceholders(template, data) {
    let result = template;
    
    // Replace conditional blocks first: {{#if key}} ... {{/if}}
    Object.keys(data).forEach(key => {
        const hasValue = !!data[key];
        const conditionalRegex = new RegExp(`{{#if ${key}}}([\\s\\S]*?){{\\/if}}`, 'g');
        if (hasValue) {
            result = result.replace(conditionalRegex, '$1');
        } else {
            result = result.replace(conditionalRegex, '');
        }
    });

    // Replace all regular placeholders
    Object.keys(data).forEach(key => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(placeholder, data[key] !== undefined ? data[key] : '');
    });
    
    return result;
}

// Prepare HTML emails
const emailList = [];

// 1. User Credentials
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

// 2. Task Created (Creator notification)
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

// 3. Task Assigned (Assignee notification)
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

// 4. Leave Approved
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

// 5. Leave Rejected
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

// 6. WFH Approved
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

// 7. WFH Rejected
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

// 8. Support Task Assigned
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

// 9. Bug Assigned
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

// 10. Bug Created Confirmation
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

// 11. General Notification
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

async function main() {
    // 1. Create preview directory and write files
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
    
    console.log("\n🚀 Starting SMTP transmission tests to: kbshah98@gmail.com");
    console.log(`   SMTP Server: ${smtpConfig.host}:${smtpConfig.port}`);
    console.log(`   SMTP User:   ${smtpConfig.auth.user}`);
    
    const transporter = nodemailer.createTransport(smtpConfig);
    
    // Verify transporter
    try {
        await transporter.verify();
        console.log("   ✅ SMTP connection verified successfully");
    } catch (err) {
        console.error("   ❌ SMTP connection verification failed:", err.message);
        console.log("\n⚠️  SMTP credentials in .env.local are invalid. Check test-email-previews/ folder for rendered outputs.");
        return;
    }
    
    const recipient = "kbshah98@gmail.com";
    
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
        
        // Wait 1 second between sends to avoid rate limit or spam flags
        if (i < emailList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.log("🏁 Email sending tests complete!");
}

main().catch(console.error);
