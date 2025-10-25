# Email Service Setup Guide

## Current Issue

The email service is failing with this error:
```
❌ Failed to initialize email service: Invalid login: 534-5.7.9 
Application-specific password required
```

This happens because Gmail requires **App-Specific Passwords** for SMTP authentication when using third-party applications.

---

## How to Fix

### Step 1: Enable 2-Factor Authentication on Gmail

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "How you sign in to Google", click on **2-Step Verification**
4. Follow the prompts to enable 2-Step Verification
5. You'll need to verify your phone number

### Step 2: Generate App-Specific Password

1. After enabling 2-Step Verification, go back to: https://myaccount.google.com/security
2. Under "How you sign in to Google", click on **App passwords**
   - If you don't see this option, make sure 2-Step Verification is enabled
3. Click **Select app** and choose **Mail**
4. Click **Select device** and choose **Other (Custom name)**
5. Enter a name like "JSR Task Management App"
6. Click **Generate**
7. Google will show you a 16-character password (e.g., `abcd efgh ijkl mnop`)
8. **Copy this password** - you won't be able to see it again!

### Step 3: Update .env.local

Replace the current password in your `.env.local` file:

**Before:**
```env
SMTP_PASSWORD="1#Amtariksha1#"
```

**After:**
```env
SMTP_PASSWORD="abcdefghijklmnop"
```

(Use the 16-character password from Step 2, without spaces)

### Step 4: Restart the Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Alternative: Disable Email Notifications (Temporary)

If you don't need email notifications right now, you can temporarily disable them:

**In `.env.local`:**
```env
EMAIL_ENABLED="false"
```

This will prevent the email service from initializing, and the app will work without email notifications.

---

## Verification

After setting up the app-specific password, you should see this in the server logs:

```
✅ Email service initialized successfully
```

Instead of:

```
❌ Failed to initialize email service: Invalid login: 534-5.7.9
```

---

## Troubleshooting

### Issue: "App passwords" option not showing

**Solution:** Make sure 2-Step Verification is fully enabled. Sometimes it takes a few minutes to activate.

### Issue: Still getting authentication errors

**Solution:** 
1. Make sure you copied the password without spaces
2. Make sure you're using the Gmail account: `amtariksha@gmail.com`
3. Try generating a new app-specific password

### Issue: Emails not being sent

**Solution:**
1. Check the server logs for email-related errors
2. Make sure `EMAIL_ENABLED="true"` in `.env.local`
3. Check that `SMTP_HOST="smtp.gmail.com"` and `SMTP_PORT="465"`

---

## Security Notes

- **Never commit `.env.local` to Git** - it contains sensitive credentials
- The `.env.local` file is already in `.gitignore`
- App-specific passwords are safer than using your main Gmail password
- You can revoke app-specific passwords anytime from your Google Account settings

---

## Current Email Configuration

Your current setup in `.env.local`:

```env
EMAIL_ENABLED="true"
EMAIL_TEST_MODE="false"
EMAIL_DEBUG="true"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="amtariksha@gmail.com"
SMTP_PASSWORD="[NEEDS APP-SPECIFIC PASSWORD]"
EMAIL_FROM_NAME="Amtariskha Task Management"
EMAIL_FROM_EMAIL="amtariksha@gmail.com"
```

**What needs to change:** Only the `SMTP_PASSWORD` needs to be updated with the app-specific password.

---

## What Emails Are Sent?

The app sends email notifications for:

1. **Task Creation** - When a new task is created
2. **Task Assignment** - When a task is assigned to a user
3. **User Credentials** - When a new user is created (sends login credentials)

All emails are sent to:
- The assigned user
- The user's manager (if configured)
- CC to admin email: `mailcpk@gmail.com`

