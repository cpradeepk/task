# 📧 Email Features Documentation

## 🎯 Overview

The EassyLife Task Management System now includes comprehensive email notification features with professional HTML/CSS templates. This document outlines all email features, configuration, and usage.

## ✨ Features Implemented

### 1. **Task Creation Notifications** 📋
- **Trigger**: When a new task is created
- **Recipients**: 
  - Task creator (primary)
  - Support team (CC)
  - Manager (CC, if available)
- **Content**: Task details, priority, due date, assigned person
- **Template**: Professional HTML with task information grid

### 2. **Leave Approval/Rejection Notifications** 🏖️
- **Trigger**: When leave application is approved or rejected
- **Recipients**: Leave applicant
- **Content**: Leave details, status, approver information, comments
- **Templates**: Separate templates for approval and rejection with status badges

### 3. **User Credentials Email** 🔐
- **Trigger**: Manual action from admin panel
- **Recipients**: New user
- **Content**: Login credentials, account details, security instructions
- **Template**: Welcome email with credentials box and getting started guide

## 🛠️ Technical Implementation

### **Email Service Architecture**
```
src/lib/email/
├── config.ts          # Email configuration and settings
├── templates.ts       # HTML/CSS email templates
└── service.ts         # Email sending service
```

### **API Integration**
- **Task Creation**: `/api/tasks` (POST) - Auto-sends email after task creation
- **Leave Approval**: `/api/leaves/[id]/approve` (POST) - Auto-sends approval email
- **Leave Rejection**: `/api/leaves/[id]/reject` (POST) - Auto-sends rejection email
- **Send Credentials**: `/api/users/[employeeId]/send-credentials` (POST) - Manual trigger

### **UI Integration**
- **Admin Panel**: Mail button added to user list for sending credentials
- **Automatic**: Task and leave emails sent automatically on status changes

## ⚙️ Configuration

### **Environment Variables**
Add these to your `.env.local` file:

```env
# Email Configuration
EMAIL_ENABLED="true"                    # Enable/disable email features
EMAIL_TEST_MODE="true"                  # Test mode (logs instead of sending)
EMAIL_DEBUG="true"                      # Debug logging
SMTP_HOST="smtp.gmail.com"              # SMTP server
SMTP_PORT="587"                         # SMTP port
SMTP_USER="your-email@gmail.com"        # Your email address
SMTP_PASSWORD="your-app-password"       # Your app password
EMAIL_FROM_NAME="EassyLife Task Management"
EMAIL_FROM_EMAIL="noreply@eassylife.com"
SUPPORT_EMAIL="support@eassylife.com"
ADMIN_EMAIL="admin@eassylife.com"
NOREPLY_EMAIL="noreply@eassylife.com"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### **Gmail Setup (Recommended)**
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password in `SMTP_PASSWORD`

### **Test Mode**
- Set `EMAIL_TEST_MODE="true"` for development
- Emails will be logged to console instead of sent
- Perfect for testing without sending actual emails

## 🎨 Email Templates

### **Design Features**
- **Responsive Design**: Works on all devices
- **Professional Styling**: Modern gradient headers, clean layout
- **Brand Consistency**: EassyLife branding and colors
- **Status Badges**: Color-coded status indicators
- **Information Grids**: Organized data presentation
- **Call-to-Action Buttons**: Direct links to relevant pages

### **Template Components**
- **Header**: Company logo and branding
- **Content Sections**: Organized information blocks
- **Highlight Boxes**: Important information emphasis
- **Status Badges**: Visual status indicators
- **Footer**: Contact information and links

## 🚀 Usage Guide

### **For Administrators**

#### **Sending User Credentials**
1. Go to **Users** page (admin only)
2. Find the user in the list
3. Click the **Mail** button next to their name
4. Enter a temporary password when prompted
5. Email will be sent automatically

#### **Configuring Email Settings**
1. Update environment variables in `.env.local`
2. For production, set variables in Vercel Dashboard
3. Test with `EMAIL_TEST_MODE="true"` first

### **For Users**

#### **Automatic Notifications**
- **Task Creation**: Receive email when you create a task
- **Leave Status**: Receive email when leave is approved/rejected
- **WFH Status**: Receive email when WFH request is processed

## 🔧 Troubleshooting

### **Common Issues**

#### **Emails Not Sending**
1. Check `EMAIL_ENABLED="true"`
2. Verify SMTP credentials
3. Check console for error messages
4. Ensure user has valid email address

#### **Gmail Authentication Errors**
1. Verify 2FA is enabled
2. Use App Password, not regular password
3. Check "Less secure app access" if needed

#### **Template Issues**
1. Check HTML rendering in email clients
2. Verify CSS inline styles
3. Test with different email providers

### **Debug Mode**
Enable debug logging with `EMAIL_DEBUG="true"` to see:
- Email sending attempts
- Success/failure messages
- SMTP connection status
- Template rendering issues

## 📊 Email Types

| Type | Trigger | Recipients | Priority |
|------|---------|------------|----------|
| Task Created | Task creation | Creator + Support + Manager | Normal/High |
| Leave Approved | Leave approval | Applicant | Normal |
| Leave Rejected | Leave rejection | Applicant | Normal |
| User Credentials | Manual admin action | New user | High |
| WFH Approved | WFH approval | Applicant | Normal |
| WFH Rejected | WFH rejection | Applicant | Normal |

## 🔒 Security Considerations

### **Email Security**
- Use App Passwords for Gmail
- Store credentials in environment variables
- Never commit SMTP credentials to code
- Use TLS/SSL for SMTP connections

### **Content Security**
- Sanitize user input in email templates
- Validate email addresses before sending
- Use temporary passwords for new users
- Include security instructions in credential emails

## 🚀 Deployment

### **Local Development**
1. Configure `.env.local` with email settings
2. Set `EMAIL_TEST_MODE="true"` for testing
3. Test all email features locally

### **Production Deployment**
1. Set all email environment variables in Vercel
2. Set `EMAIL_TEST_MODE="false"` for production
3. Configure proper SMTP credentials
4. Test email delivery after deployment

## 📈 Future Enhancements

### **Planned Features**
- Email templates customization UI
- Bulk email sending
- Email delivery tracking
- Advanced email analytics
- Email scheduling
- Rich text email editor

### **Integration Possibilities**
- SendGrid/Mailgun integration
- Email marketing features
- Automated email campaigns
- Email template marketplace

## 📞 Support

For email feature support:
- Check console logs for errors
- Verify environment variables
- Test with `EMAIL_TEST_MODE="true"`
- Contact support team for assistance

---

**✅ Email features are now fully integrated and ready for use!**
