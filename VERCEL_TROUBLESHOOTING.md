# 🚨 VERCEL GOOGLE SHEETS TROUBLESHOOTING GUIDE

## 🎯 Issue: Google Sheets Not Working on Vercel

You've added environment variables to Vercel but the Google Sheets connection isn't working. Let's diagnose and fix this step by step.

## 🔍 Step 1: Run Vercel Diagnostics

After deploying to Vercel, visit this endpoint to get detailed diagnostics:

```
https://your-app.vercel.app/api/vercel-diagnostics
```

This will show you exactly what's wrong with your configuration.

## 🔧 Step 2: Common Issues and Solutions

### ❌ Issue 1: Environment Variables Not Set Correctly

**Symptoms:**
- Diagnostics show missing environment variables
- Authentication fails

**Solution:**
1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Ensure ALL 6 variables are set for ALL environments (Production, Preview, Development):

| Variable | Value | Notes |
|----------|-------|-------|
| `GOOGLE_PROJECT_ID` | `task-management-449805` | ✅ Simple string |
| `GOOGLE_PRIVATE_KEY_ID` | `22c9d3067c883d8fc05e1db451f501578696ab23` | ✅ Simple string |
| `GOOGLE_CLIENT_EMAIL` | `web-jsr@task-management-449805.iam.gserviceaccount.com` | ✅ Simple string |
| `GOOGLE_CLIENT_ID` | `109515916893293632227` | ✅ Simple string |
| `GOOGLE_CLIENT_CERT_URL` | `https://www.googleapis.com/robot/v1/metadata/x509/web-jsr%40task-management-449805.iam.gserviceaccount.com` | ✅ Simple string |
| `GOOGLE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n[KEY]\n-----END PRIVATE KEY-----\n"` | ⚠️ **CRITICAL FORMAT** |

### ❌ Issue 2: Private Key Format Problems

**Symptoms:**
- Other variables present but authentication still fails
- "Invalid private key" errors

**CRITICAL: Private Key Format**
The `GOOGLE_PRIVATE_KEY` must be formatted EXACTLY like this:

```
"-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
[Your actual private key content here - multiple lines]
...
-----END PRIVATE KEY-----"
```

**Common Mistakes:**
- ❌ Missing quotes around the entire value
- ❌ Missing `\n` characters for line breaks
- ❌ Extra spaces or characters
- ❌ Copying only part of the key

**Correct Format in Vercel:**
```
"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n[rest of key]\n-----END PRIVATE KEY-----\n"
```

### ❌ Issue 3: Google Sheet Permissions

**Symptoms:**
- Authentication works but can't access sheet data
- "Permission denied" errors

**Solution:**
1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit
2. Click "Share" button
3. Add this email with "Editor" permissions:
   ```
   web-jsr@task-management-449805.iam.gserviceaccount.com
   ```
4. Make sure "Notify people" is unchecked
5. Click "Share"

### ❌ Issue 4: Vercel Deployment Issues

**Symptoms:**
- Local development works but Vercel doesn't
- Build failures

**Solution:**
1. **Redeploy after adding environment variables:**
   - Go to Vercel Dashboard > Your Project > Deployments
   - Click "..." on latest deployment > Redeploy

2. **Check build logs:**
   - Look for environment variable errors
   - Check for Google Sheets API errors

3. **Verify root directory:**
   - Ensure root directory is set to `web_app_new_next`

## 🔍 Step 3: Verification Commands

### Check Diagnostics Endpoint:
```
https://your-app.vercel.app/api/vercel-diagnostics
```

**Expected Response:**
```json
{
  "status": "HEALTHY",
  "environmentVariables": {
    "status": "6/6 present"
  },
  "authentication": {
    "status": "SUCCESS"
  },
  "googleSheets": {
    "isCorrect": true
  }
}
```

### Check Production Health:
```
https://your-app.vercel.app/api/production-check
```

### Test Sheet Connection:
```
https://your-app.vercel.app/api/debug/sheets
```

## 🛠️ Step 4: Manual Verification Steps

### 1. Environment Variables Check
In Vercel Dashboard:
- ✅ All 6 variables present
- ✅ Set for Production, Preview, AND Development
- ✅ Private key has correct format with quotes and \n

### 2. Google Sheet Permissions Check
- ✅ Service account email added as Editor
- ✅ Sheet ID matches: `1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98`

### 3. Deployment Check
- ✅ Latest deployment after adding environment variables
- ✅ No build errors in Vercel logs
- ✅ Root directory set to `web_app_new_next`

## 🚨 Step 5: Emergency Fixes

### If Nothing Works:

1. **Delete and Re-add Environment Variables:**
   - Remove all Google-related environment variables
   - Wait 5 minutes
   - Re-add them with correct format
   - Redeploy

2. **Check Service Account Status:**
   - Go to Google Cloud Console
   - Navigate to IAM & Admin > Service Accounts
   - Verify `web-jsr@task-management-449805.iam.gserviceaccount.com` exists
   - Check if it has Sheets API access

3. **Create New Deployment:**
   - Force a new deployment from Vercel dashboard
   - Check deployment logs for specific errors

## 📞 Quick Diagnostic Checklist

Run through this checklist:

- [ ] All 6 environment variables added to Vercel
- [ ] Variables set for Production, Preview, AND Development
- [ ] Private key has correct format with quotes and \n characters
- [ ] Service account email added to Google Sheet with Editor permissions
- [ ] Redeployed after adding environment variables
- [ ] No build errors in Vercel deployment logs
- [ ] Diagnostics endpoint shows "HEALTHY" status

## 🎯 Most Common Solution

**90% of issues are caused by incorrect private key format.**

Make sure your `GOOGLE_PRIVATE_KEY` in Vercel looks EXACTLY like this:
```
"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

After fixing the private key format, redeploy and test the diagnostics endpoint.

**Need immediate help?** Check the diagnostics endpoint first - it will tell you exactly what's wrong!
