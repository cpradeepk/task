# Google Sheets Setup Guide

## 🎯 **Quick Setup for New Google Sheet**

Your new Google Sheet: https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit

## 📋 **Step-by-Step Instructions**

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: "JSR Task Management"
4. Click "Create"

### 2. Enable Google Sheets API
1. Go to [APIs & Services → Library](https://console.cloud.google.com/apis/library)
2. Search for "Google Sheets API"
3. Click "Enable"

### 3. Create Service Account
1. Go to [APIs & Services → Credentials](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click "Create Credentials" → "Service Account"
3. Name: "jsr-sheets-service"
4. Click "Create and Continue" → "Done"
5. Click on the service account
6. Go to "Keys" tab → "Add Key" → "Create new key"
7. Select "JSON" → "Create"
8. **Save the service account email** (you'll need it for step 5)

### 4. Update Environment Variables
1. Open the downloaded JSON file
2. Edit `/Users/kevalshah/Documents/JSR/web_app_new_next/.env.local`
3. Replace the placeholder values:

```env
GOOGLE_PROJECT_ID=your-actual-project-id
GOOGLE_PRIVATE_KEY_ID=your-actual-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Actual-Private-Key\n-----END PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-actual-client-id
GOOGLE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com
```

### 5. Share Google Sheet
1. Open: https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit
2. Click "Share" button
3. Add your service account email (from step 3)
4. Set permission to "Editor"
5. Uncheck "Notify people"
6. Click "Share"

### 6. Test Connection
1. Restart your development server: `npm run dev`
2. Go to: http://localhost:3000/connection-status
3. Click "Test Connection"
4. Should show success with sheet tabs created

## 🔧 **Automatic Sheet Setup**

Once connected, the system will automatically create these tabs in your Google Sheet:

1. **UserDetails** (15 columns) - User management data
2. **JSR** (24 columns) - Task management data  
3. **Leave_Applications** (16 columns) - Leave requests
4. **WFH_Applications** (18 columns) - Work from home requests

## ✅ **Verification Steps**

After setup, verify:
- [ ] Connection test passes
- [ ] 4 tabs are created in Google Sheet
- [ ] Data migration completes (if you had localStorage data)
- [ ] Application works normally

## 🚨 **Troubleshooting**

**Connection fails?**
- Check service account email is correct
- Verify Google Sheet is shared with service account
- Ensure API is enabled
- Check .env.local file format

**Still using localStorage?**
- Check console for credential validation messages
- Restart development server after .env.local changes
- Verify no syntax errors in .env.local

## 🎉 **Success!**

Once connected:
- All data will be stored in Google Sheets
- Real-time collaboration possible
- Automatic backup via Google
- Scalable for multiple users
- localStorage remains as fallback

---

**Need help?** Check the setup wizard at: http://localhost:3000/setup-wizard
