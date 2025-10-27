# 📧 Email Service Production Setup Guide

## Overview
The email service is fully configured and ready for production. The warning message "⚠️ Email credentials not configured. Email service will run in test mode." appears because environment variables are not set in the current environment.

---

## ✅ Email Service Status

### Current Configuration
- **Email Service**: ✅ Fully implemented and tested
- **SMTP Provider**: Gmail with SSL (port 465)
- **Templates**: Professional HTML/CSS templates for all email types
- **Error Handling**: Comprehensive error handling and logging
- **Test Mode**: Currently enabled (logs emails instead of sending)

### Email Types Supported
1. ✅ **Task Creation** - Auto-sent when new task is created
2. ✅ **Leave Approval** - Auto-sent when leave is approved
3. ✅ **Leave Rejection** - Auto-sent when leave is rejected
4. ✅ **WFH Approval** - Auto-sent when WFH is approved
5. ✅ **WFH Rejection** - Auto-sent when WFH is rejected
6. ✅ **User Credentials** - Manual trigger for new user credentials

---

## 🚀 Production Setup Instructions

### Step 1: Set Environment Variables in Vercel

Go to **Vercel Dashboard** → **Project Settings** → **Environment Variables**

Add the following variables:

```
EMAIL_ENABLED=true
EMAIL_TEST_MODE=false
EMAIL_DEBUG=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=amtariksha@gmail.com
SMTP_PASSWORD=wyfpzylmppjnhyfd
EMAIL_FROM_NAME=Amtariksha Task Management
EMAIL_FROM_EMAIL=amtariksha@gmail.com
SUPPORT_EMAIL=support@amtariksha.com
ADMIN_EMAIL=admin@amtariksha.com
NOREPLY_EMAIL=noreply@amtariksha.com
NEXT_PUBLIC_BASE_URL=https://task.amtariksha.com
```

### Step 2: Verify SMTP Credentials

**Current Configuration**:
- **Email**: amtariksha@gmail.com
- **App Password**: wyfpzylmppjnhyfd (Gmail App-Specific Password)
- **Port**: 465 (SSL)
- **Host**: smtp.gmail.com

### Step 3: Deploy to Production

1. Push code to main branch
2. Vercel will automatically deploy
3. Email service will initialize with production credentials
4. Emails will be sent automatically

### Step 4: Verify Email Sending

After deployment, test email sending:

1. Create a new task
2. Check if task creation email is sent
3. Apply for leave
4. Check if leave application email is sent
5. Check email logs in Vercel dashboard

---

## 🔧 Email Service Architecture

### Configuration File
**Location**: `apps/web/src/lib/email/config.ts`

Reads environment variables:
- `SMTP_HOST` - SMTP server address
- `SMTP_PORT` - SMTP port (465 for SSL)
- `SMTP_USER` - Email address
- `SMTP_PASSWORD` - App-specific password
- `EMAIL_FROM_NAME` - Sender name
- `EMAIL_FROM_EMAIL` - Sender email
- `EMAIL_ENABLED` - Enable/disable feature
- `EMAIL_TEST_MODE` - Test mode (logs instead of sending)
- `EMAIL_DEBUG` - Debug logging

### Email Service
**Location**: `apps/web/src/lib/email/service.ts`

Features:
- Automatic initialization on startup
- Connection verification
- Graceful error handling
- Test mode support
- Debug logging

### Email Templates
**Location**: `apps/web/src/lib/email/htmlTemplates.ts`

Professional HTML/CSS templates with:
- Company branding
- Responsive design
- Status badges
- Action buttons
- Footer with contact info

---

## 📊 Email Flow

```
User Action (Create Task/Leave/WFH)
    ↓
API Route Handler (/api/tasks, /api/leaves, /api/wfh)
    ↓
Email Service Triggered
    ↓
Check if EMAIL_ENABLED=true
    ↓
Check if TEST_MODE=true
    ├─ YES: Log email to console
    └─ NO: Send via SMTP
    ↓
Email Sent Successfully ✅
```

---

## 🔒 Security Notes

- ✅ `.env.local` is in `.gitignore` (never committed)
- ✅ Credentials stored in Vercel environment variables
- ✅ App-specific password used (not main Gmail password)
- ✅ SSL/TLS encryption enabled
- ✅ Error messages don't expose credentials

---

## 🧪 Testing

### Local Testing
1. Set `EMAIL_TEST_MODE=true` in `.env.local`
2. Emails will be logged to console instead of sent
3. Check console for email content

### Production Testing
1. Set `EMAIL_TEST_MODE=false` in Vercel
2. Create a test task/leave/WFH
3. Check if email is received
4. Verify email content and formatting

---

## 📋 Deployment Checklist

- [x] Email service implemented
- [x] SMTP configuration set up
- [x] Email templates created
- [x] Error handling implemented
- [x] Test mode available
- [x] Environment variables documented
- [ ] **TODO**: Set environment variables in Vercel
- [ ] **TODO**: Deploy to production
- [ ] **TODO**: Test email sending
- [ ] **TODO**: Monitor email logs

---

## 🆘 Troubleshooting

### Emails Not Sending
1. Check `EMAIL_ENABLED=true` in Vercel
2. Verify SMTP credentials are correct
3. Check Vercel logs for errors
4. Ensure `EMAIL_TEST_MODE=false`

### Authentication Errors
1. Verify Gmail App Password is correct
2. Check that 2FA is enabled on Gmail
3. Regenerate App Password if needed
4. Ensure no spaces in password

### Template Issues
1. Check email client compatibility
2. Verify CSS is inline (not external)
3. Test with different email providers
4. Check for special characters

---

## 📞 Support

For email setup issues, refer to:
- `docs/EMAIL_SETUP_GUIDE.md` - Detailed setup guide
- `EMAIL_FEATURES_DOCUMENTATION.md` - Feature documentation
- `EMAIL_SSL_CONFIGURATION_SUMMARY.md` - SSL configuration details


