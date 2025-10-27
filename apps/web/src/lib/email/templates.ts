/**
 * Email HTML Templates with CSS Styling
 * Professional email templates for different notification types
 */

import { EMAIL_CONFIG } from './config'

// Base email template with CSS styling
const getBaseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f4f4f4;
        }
        
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .email-header {
            background: linear-gradient(135deg, #FFA301 0%, #E6920E 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }

        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 15px;
            background-color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 20px rgba(255, 163, 1, 0.3);
            border: 3px solid #FFFFFF;
            overflow: hidden;
        }

        .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            border-radius: 50%;
        }
        
        .email-header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .email-header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .email-body {
            padding: 30px 20px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        
        .content-section {
            margin-bottom: 25px;
        }
        
        .highlight-box {
            background-color: #f8f9fa;
            border-left: 4px solid #FFA301;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        
        .info-item {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        }
        
        .info-label {
            font-weight: 600;
            color: #495057;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        
        .info-value {
            font-size: 14px;
            color: #2c3e50;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-approved {
            background-color: #e8f5e8;
            color: #2e7d32;
            border: 1px solid #66bb6a;
        }

        .status-rejected {
            background-color: #ffebee;
            color: #c62828;
            border: 1px solid #ef5350;
        }

        .status-pending {
            background-color: #fff8e1;
            color: #f57c00;
            border: 1px solid #FFA301;
        }
        
        .priority-high {
            background-color: #ffebee;
            color: #c62828;
            border: 1px solid #ef5350;
        }

        .priority-medium {
            background-color: #fff8e1;
            color: #f57c00;
            border: 1px solid #FFA301;
        }

        .priority-low {
            background-color: #e8f5e8;
            color: #2e7d32;
            border: 1px solid #66bb6a;
        }
        
        .button {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, #FFA301 0%, #E6920E 100%);
            color: #000000;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 10px 5px;
            transition: transform 0.2s;
            box-shadow: 0 4px 12px rgba(255, 163, 1, 0.3);
        }

        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(255, 163, 1, 0.4);
        }
        
        .button-secondary {
            background: #6c757d;
        }
        
        .credentials-box {
            background: linear-gradient(135deg, #FFA301 0%, #E6920E 100%);
            color: #000000;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(255, 163, 1, 0.3);
        }
        
        .credentials-item {
            margin: 10px 0;
            font-size: 16px;
        }
        
        .credentials-label {
            font-weight: 600;
            opacity: 0.9;
        }
        
        .credentials-value {
            font-family: 'Courier New', monospace;
            background-color: rgba(255, 255, 255, 0.8);
            color: #000000;
            padding: 5px 10px;
            border-radius: 4px;
            margin-left: 10px;
            font-weight: bold;
        }
        
        .email-footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer-text {
            font-size: 12px;
            color: #6c757d;
            margin-bottom: 10px;
        }
        
        .footer-links {
            margin-top: 15px;
        }
        
        .footer-links a {
            color: #FFA301;
            text-decoration: none;
            margin: 0 10px;
            font-size: 12px;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 0;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .email-header,
            .email-body,
            .email-footer {
                padding: 20px 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="logo">
                <img src="${EMAIL_CONFIG.templates.baseUrl}${EMAIL_CONFIG.templates.logoUrl}" alt="${EMAIL_CONFIG.templates.companyName} Logo" />
            </div>
            <h1>${EMAIL_CONFIG.templates.companyName}</h1>
            <p>Task Management System</p>
        </div>
        
        <div class="email-body">
            ${content}
        </div>
        
        <div class="email-footer">
            <p class="footer-text">
                This is an automated message from ${EMAIL_CONFIG.templates.companyName} Task Management System.
            </p>
            <p class="footer-text">
                If you have any questions, please contact our support team.
            </p>
            <div class="footer-links">
                <a href="${EMAIL_CONFIG.templates.baseUrl}">Dashboard</a>
                <a href="mailto:${EMAIL_CONFIG.templates.supportContact}">Support</a>
            </div>
        </div>
    </div>
</body>
</html>
`

// Task Creation Email Template
export const getTaskCreatedTemplate = (data: {
  userName: string
  taskTitle: string
  taskDescription: string
  priority: string
  dueDate: string
  assignedTo: string
  taskId: string
}) => {
  const priorityClass = data.priority.toLowerCase() === 'high' ? 'priority-high' : 
                       data.priority.toLowerCase() === 'medium' ? 'priority-medium' : 'priority-low'
  
  const content = `
    <div class="greeting">Hello ${data.userName},</div>
    
    <div class="content-section">
        <p>A new task has been successfully created in the system.</p>
    </div>
    
    <div class="highlight-box">
        <h3 style="color: #2c3e50; margin-bottom: 15px;">📋 Task Details</h3>
        
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Task Title</div>
                <div class="info-value">${data.taskTitle}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Priority</div>
                <div class="info-value">
                    <span class="status-badge ${priorityClass}">${data.priority}</span>
                </div>
            </div>
            <div class="info-item">
                <div class="info-label">Assigned To</div>
                <div class="info-value">${data.assignedTo}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Due Date</div>
                <div class="info-value">${data.dueDate}</div>
            </div>
        </div>
        
        <div style="margin-top: 15px;">
            <div class="info-label">Description</div>
            <div class="info-value" style="margin-top: 5px;">${data.taskDescription}</div>
        </div>
    </div>
    
    <div class="content-section">
        <p>The task has been automatically assigned and relevant team members have been notified.</p>
        <p style="margin-top: 10px;">
            <a href="${EMAIL_CONFIG.templates.baseUrl}/tasks" class="button">View All Tasks</a>
        </p>
    </div>
    
    <div class="content-section">
        <p><strong>Next Steps:</strong></p>
        <ul style="margin-left: 20px; margin-top: 10px;">
            <li>The assigned team member will receive a notification</li>
            <li>Progress updates will be tracked in the system</li>
            <li>You'll receive notifications on status changes</li>
        </ul>
    </div>
  `
  
  return getBaseTemplate(content, 'New Task Created')
}

// Leave Approval/Rejection Email Template
export const getLeaveStatusTemplate = (data: {
  userName: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  status: 'approved' | 'rejected'
  reason?: string
  approvedBy: string
  comments?: string
}) => {
  const statusClass = data.status === 'approved' ? 'status-approved' : 'status-rejected'
  const statusIcon = data.status === 'approved' ? '✅' : '❌'
  const statusText = data.status === 'approved' ? 'Approved' : 'Rejected'

  const content = `
    <div class="greeting">Hello ${data.userName},</div>

    <div class="content-section">
        <p>Your leave application has been <strong>${statusText.toLowerCase()}</strong>.</p>
    </div>

    <div class="highlight-box">
        <h3 style="color: #2c3e50; margin-bottom: 15px;">${statusIcon} Leave Application ${statusText}</h3>

        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Leave Type</div>
                <div class="info-value">${data.leaveType}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
            <div class="info-item">
                <div class="info-label">Start Date</div>
                <div class="info-value">${data.startDate}</div>
            </div>
            <div class="info-item">
                <div class="info-label">End Date</div>
                <div class="info-value">${data.endDate}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Duration</div>
                <div class="info-value">${data.days} day(s)</div>
            </div>
            <div class="info-item">
                <div class="info-label">${data.status === 'approved' ? 'Approved' : 'Reviewed'} By</div>
                <div class="info-value">${data.approvedBy}</div>
            </div>
        </div>

        ${data.reason ? `
        <div style="margin-top: 15px;">
            <div class="info-label">Reason</div>
            <div class="info-value" style="margin-top: 5px;">${data.reason}</div>
        </div>
        ` : ''}

        ${data.comments ? `
        <div style="margin-top: 15px;">
            <div class="info-label">Comments</div>
            <div class="info-value" style="margin-top: 5px;">${data.comments}</div>
        </div>
        ` : ''}
    </div>

    <div class="content-section">
        ${data.status === 'approved' ? `
        <p><strong>Your leave has been approved!</strong> Please ensure all your pending tasks are completed or delegated before your leave starts.</p>
        <p style="margin-top: 10px;">
            <a href="${EMAIL_CONFIG.templates.baseUrl}/my-applications" class="button">View My Applications</a>
        </p>
        ` : `
        <p><strong>Your leave application has been rejected.</strong> Please contact your manager for more details or to discuss alternative dates.</p>
        <p style="margin-top: 10px;">
            <a href="${EMAIL_CONFIG.templates.baseUrl}/leave/apply" class="button">Apply for New Leave</a>
            <a href="${EMAIL_CONFIG.templates.baseUrl}/my-applications" class="button button-secondary">View Applications</a>
        </p>
        `}
    </div>

    <div class="content-section">
        <p><strong>Important Notes:</strong></p>
        <ul style="margin-left: 20px; margin-top: 10px;">
            ${data.status === 'approved' ? `
            <li>Please plan your work handover before the leave starts</li>
            <li>Inform your team members about your absence</li>
            <li>Set up an out-of-office message if needed</li>
            ` : `
            <li>You can apply for leave on different dates</li>
            <li>Contact your manager to discuss the rejection reason</li>
            <li>Ensure you meet all leave policy requirements</li>
            `}
        </ul>
    </div>
  `

  return getBaseTemplate(content, `Leave Application ${statusText}`)
}

// User Credentials Email Template
export const getUserCredentialsTemplate = (data: {
  userName: string
  employeeId: string
  email: string
  temporaryPassword: string
  loginUrl: string
  department: string
  role: string
  manager?: string
}) => {
  const content = `
    <div class="greeting">Welcome ${data.userName}!</div>

    <div class="content-section">
        <p>Your account has been created in the ${EMAIL_CONFIG.templates.companyName} Task Management System. Below are your login credentials and account details.</p>
    </div>

    <div class="credentials-box">
        <h3 style="margin-bottom: 20px;">🔐 Your Login Credentials</h3>

        <div class="credentials-item">
            <span class="credentials-label">Employee ID:</span>
            <span class="credentials-value">${data.employeeId}</span>
        </div>

        <div class="credentials-item">
            <span class="credentials-label">Email:</span>
            <span class="credentials-value">${data.email}</span>
        </div>

        <div class="credentials-item">
            <span class="credentials-label">Temporary Password:</span>
            <span class="credentials-value">${data.temporaryPassword}</span>
        </div>
    </div>

    <div class="highlight-box">
        <h3 style="color: #2c3e50; margin-bottom: 15px;">👤 Account Information</h3>

        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Full Name</div>
                <div class="info-value">${data.userName}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Employee ID</div>
                <div class="info-value">${data.employeeId}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Department</div>
                <div class="info-value">${data.department}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Role</div>
                <div class="info-value">${data.role}</div>
            </div>
            ${data.manager ? `
            <div class="info-item">
                <div class="info-label">Manager</div>
                <div class="info-value">${data.manager}</div>
            </div>
            ` : ''}
        </div>
    </div>

    <div class="content-section">
        <p style="margin-bottom: 15px;">
            <a href="${data.loginUrl}" class="button">Login to Dashboard</a>
        </p>
        <p><strong>⚠️ Important Security Notes:</strong></p>
        <ul style="margin-left: 20px; margin-top: 10px;">
            <li><strong>Change your password immediately</strong> after first login</li>
            <li>Use a strong password with at least 8 characters</li>
            <li>Include uppercase, lowercase, numbers, and special characters</li>
            <li>Never share your credentials with anyone</li>
            <li>Log out when you're done using the system</li>
        </ul>
    </div>

    <div class="content-section">
        <p><strong>🚀 Getting Started:</strong></p>
        <ol style="margin-left: 20px; margin-top: 10px;">
            <li>Click the "Login to Dashboard" button above</li>
            <li>Enter your Employee ID and temporary password</li>
            <li>Change your password when prompted</li>
            <li>Complete your profile information</li>
            <li>Explore the dashboard and available features</li>
        </ol>
    </div>

    <div class="content-section">
        <p><strong>📚 Available Features:</strong></p>
        <ul style="margin-left: 20px; margin-top: 10px;">
            <li>Task management and tracking</li>
            <li>Leave application and approval</li>
            <li>Work from home requests</li>
            <li>Team collaboration tools</li>
            <li>Performance reports and analytics</li>
        </ul>
    </div>

    <div class="content-section">
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team at <a href="mailto:${EMAIL_CONFIG.templates.supportContact}" style="color: #FFA301;">${EMAIL_CONFIG.templates.supportContact}</a>.</p>
    </div>
  `

  return getBaseTemplate(content, 'Welcome to Amtariksha - Your Account Details')
}
