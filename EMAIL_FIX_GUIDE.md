# Email Service Fix Guide - Gmail App Password Issue

**Date**: 2025-10-31  
**Issue**: Emails not being sent - Gmail authentication failure  
**Status**: ⚠️ **ACTION REQUIRED** - New Gmail App Password needed

---

## 🔍 **Problem Identified**

The email service is failing with this error:

```
❌ Failed to initialize email service: Error: Invalid login: 535-5.7.8 Username and Password not accepted.
```

**Root Cause**: The Gmail App Password in `.env.local` is **invalid or expired**.

**Current Configuration**:
- SMTP Host: `smtp.gmail.com`
- SMTP Port: `465` (SSL)
- Email: `amtariksha@gmail.com`
- Password: `wyfpzylmppjnhyfd` ❌ **REJECTED BY GMAIL**

---

## ✅ **Solution: Generate New Gmail App Password**

### **Step 1: Verify 2-Step Verification is Enabled**

Gmail App Passwords require 2-Step Verification to be enabled.

1. Go to: https://myaccount.google.com/security
2. Sign in with: `amtariksha@gmail.com`
3. Scroll to **"How you sign in to Google"**
4. Check if **"2-Step Verification"** is **ON**
5. If **OFF**, click it and follow the setup wizard

---

### **Step 2: Generate New App Password**

1. **Go to App Passwords page**:
   - Direct link: https://myaccount.google.com/apppasswords
   - OR: Google Account → Security → 2-Step Verification → App passwords

2. **Sign in** if prompted

3. **Create App Password**:
   - Click **"Select app"** dropdown → Choose **"Mail"**
   - Click **"Select device"** dropdown → Choose **"Other (Custom name)"**
   - Enter name: **"JSR Task Management System"**
   - Click **"Generate"**

4. **Copy the 16-character password**:
   - Gmail will show a password like: `abcd efgh ijkl mnop`
   - **IMPORTANT**: Copy this immediately - you won't see it again!
   - Remove spaces when copying: `abcdefghijklmnop`

---

### **Step 3: Update Environment Variables**

1. **Open** `apps/web/.env.local`

2. **Find line 12** (SMTP_PASSWORD):
   ```env
   SMTP_PASSWORD=wyfpzylmppjnhyfd
   ```

3. **Replace** with your new App Password:
   ```env
   SMTP_PASSWORD=your-new-16-char-password-here
   ```
   
   **Example** (if your generated password is `abcd efgh ijkl mnop`):
   ```env
   SMTP_PASSWORD=abcdefghijklmnop
   ```

4. **Save** the file

---

### **Step 4: Restart Dev Server**

The dev server needs to be restarted to pick up the new password.

```bash
# In the terminal running the dev server, press Ctrl+C to stop it
# Then restart:
cd apps/web
npm run dev
```

---

### **Step 5: Test Email Service**

#### **Method A: Using Debug Endpoint (Recommended)**

```bash
curl -X GET http://localhost:3000/api/debug-email
```

**Expected Success Response**:
```json
{
  "success": true,
  "message": "Email debug completed",
  "data": {
    "serviceAvailable": true,
    "config": {
      "enabled": true,
      "testMode": false,
      "debugMode": true,
      "smtpConfigured": true
    },
    "emailResult": {
      "success": true,
      "message": "Email sent successfully",
      "messageId": "..."
    }
  }
}
```

**Check Server Logs**:
```
✅ Email service initialized successfully
📧 Email sent successfully: { messageId: '...', to: 'test@example.com', subject: '...' }
```

#### **Method B: Using Test Email Endpoint**

```bash
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user_credentials",
    "data": {
      "userEmail": "your-email@example.com",
      "userName": "Test User",
      "employeeId": "TEST-001",
      "temporaryPassword": "TestPass123",
      "department": "IT",
      "role": "Employee"
    }
  }'
```

**Check your email inbox** - you should receive a test email!

---

## 🔧 **Troubleshooting**

### **Issue: Still getting "Invalid login" error**

**Possible Causes**:
1. App Password copied incorrectly (check for spaces or typos)
2. Using regular Gmail password instead of App Password
3. 2-Step Verification not enabled
4. Wrong Gmail account

**Solutions**:
1. **Verify the password** in `.env.local` has no spaces
2. **Generate a new App Password** and try again
3. **Check you're using** `amtariksha@gmail.com` account
4. **Ensure 2-Step Verification is ON** for that account

---

### **Issue: "App passwords" option not available**

**Cause**: 2-Step Verification is not enabled

**Solution**:
1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification**
3. Complete the setup (phone number verification)
4. Then try generating App Password again

---

### **Issue: Email sent but not received**

**Possible Causes**:
1. Email in spam folder
2. Gmail sending limits reached
3. Recipient email invalid

**Solutions**:
1. **Check spam/junk folder**
2. **Check Gmail sent folder** at https://mail.google.com/mail/u/0/#sent
3. **Try sending to a different email** address
4. **Check server logs** for error messages

---

### **Issue: "Email service disabled"**

**Cause**: `EMAIL_ENABLED` is set to `false` in `.env.local`

**Solution**:
1. Open `apps/web/.env.local`
2. Find line 6: `EMAIL_ENABLED=false`
3. Change to: `EMAIL_ENABLED=true`
4. Save and restart dev server

---

## 📋 **Complete .env.local Email Configuration**

After fixing, your email configuration should look like this:

```env
# ============================================================================
# Email Configuration (Nodemailer)
# ============================================================================
EMAIL_ENABLED=true
EMAIL_TEST_MODE=false
EMAIL_DEBUG=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=amtariksha@gmail.com
SMTP_PASSWORD=your-new-16-char-app-password-here
EMAIL_FROM_NAME=Amtariksha Task Management
EMAIL_FROM_EMAIL=amtariksha@gmail.com
SUPPORT_EMAIL=support@amtariksha.com
ADMIN_EMAIL=admin@amtariksha.com
NOREPLY_EMAIL=noreply@amtariksha.com
NEXT_PUBLIC_BASE_URL=https://task.amtariksha.com
```

---

## 🚀 **Production Deployment (Vercel)**

Once emails work locally, add these environment variables to Vercel:

1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Add these variables:
   - `EMAIL_ENABLED` = `true`
   - `EMAIL_TEST_MODE` = `false`
   - `EMAIL_DEBUG` = `false` (disable debug in production)
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `465`
   - `SMTP_USER` = `amtariksha@gmail.com`
   - `SMTP_PASSWORD` = `your-app-password` (same one from .env.local)
   - `EMAIL_FROM_NAME` = `Amtariksha Task Management`
   - `EMAIL_FROM_EMAIL` = `amtariksha@gmail.com`
   - `SUPPORT_EMAIL` = `support@amtariksha.com`
   - `ADMIN_EMAIL` = `admin@amtariksha.com`
   - `NOREPLY_EMAIL` = `noreply@amtariksha.com`
   - `NEXT_PUBLIC_BASE_URL` = `https://task.amtariksha.com`

3. **Redeploy** the application

---

## ✅ **Success Checklist**

- [ ] 2-Step Verification enabled on `amtariksha@gmail.com`
- [ ] New Gmail App Password generated
- [ ] `SMTP_PASSWORD` updated in `apps/web/.env.local`
- [ ] Dev server restarted
- [ ] Debug endpoint returns success
- [ ] Test email received in inbox
- [ ] Server logs show "✅ Email service initialized successfully"
- [ ] Environment variables added to Vercel (for production)

---

## 📚 **Additional Resources**

- **Gmail App Passwords**: https://support.google.com/accounts/answer/185833
- **2-Step Verification**: https://support.google.com/accounts/answer/185839
- **Gmail SMTP Settings**: https://support.google.com/mail/answer/7126229

---

## 🎯 **Summary**

**Problem**: Gmail App Password is invalid/expired  
**Solution**: Generate new App Password and update `.env.local`  
**Time Required**: 5 minutes  
**Priority**: HIGH - Email notifications are currently broken

---

**Next Steps**:
1. Generate new Gmail App Password (Step 2)
2. Update `.env.local` (Step 3)
3. Restart dev server (Step 4)
4. Test email service (Step 5)

Once complete, all email features will work:
- ✅ Task creation notifications
- ✅ Leave approval/rejection emails
- ✅ WFH approval/rejection emails
- ✅ User credential emails
- ✅ Bug assignment notifications

