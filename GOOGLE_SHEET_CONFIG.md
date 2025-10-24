# Google Sheet Configuration - Data Preservation

## 🎯 **IMPORTANT: Your Data is Safe**

The JSR Task Management System is configured to use your existing Google Sheet:

**Google Sheet URL**: https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit?gid=1829622745#gid=1829622745

**Sheet ID**: `1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98`

**⚠️ IMPORTANT**: This Google Sheet ID is PERMANENTLY configured and should NEVER be changed.

## ✅ **Configuration Status**

### **Hardcoded in Application**
The Google Sheet ID is permanently configured in the application code:

**File**: `src/lib/sheets/config.ts`
```typescript
export const SHEETS_CONFIG = {
  // The Google Sheets ID from the URL
  SPREADSHEET_ID: '1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98',
  // ... rest of configuration
}
```

### **No Data Migration Required**
- ✅ **Existing Data**: All your current data remains intact
- ✅ **Same Sheet**: Application uses your existing Google Sheet
- ✅ **No Changes**: No need to copy or move data
- ✅ **Seamless**: Direct integration with your current setup

## 📋 **Required Sheet Tabs**

Your Google Sheet should have these tabs (create if missing):

1. **UserDetails** - Employee information and credentials
2. **JSR** - Task management data
3. **Leave_Applications** - Leave requests and approvals
4. **WFH_Applications** - Work from home requests

## 🔑 **Service Account Access**

Ensure your Google Sheet is shared with the service account:

**Service Account Email**: `web-jsr@task-management-449805.iam.gserviceaccount.com`

### **How to Share:**
1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit
2. Click "Share" button (top right)
3. Add: `web-jsr@task-management-449805.iam.gserviceaccount.com`
4. Set permission: **Editor**
5. Uncheck "Notify people"
6. Click "Share"

## 🚀 **Deployment Notes**

### **Environment Variables**
When deploying to Vercel, only these environment variables are needed:

```env
GOOGLE_PROJECT_ID=task-management-449805
GOOGLE_PRIVATE_KEY_ID=22c9d3067c883d8fc05e1db451f501578696ab23
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[YOUR_PRIVATE_KEY]\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=web-jsr@task-management-449805.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=109515916893293632227
GOOGLE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/web-jsr%40task-management-449805.iam.gserviceaccount.com
```

### **No Sheet ID Configuration**
- ❌ **No need** to configure Sheet ID in environment variables
- ❌ **No need** to change any configuration files
- ✅ **Sheet ID** is hardcoded in the application for data safety

## 🔒 **Data Security**

### **Your Data Protection**
- ✅ **Preserved**: All existing data remains untouched
- ✅ **Secure**: Only authorized service account has access
- ✅ **Backed Up**: Google Sheets provides automatic version history
- ✅ **Controlled**: You maintain ownership and control of the sheet

### **Access Control**
- **Owner**: You (full control)
- **Editor**: Service account (application access only)
- **Viewers**: Any additional users you choose to share with

## 📊 **Data Structure**

### **Current Data Compatibility**
The application is designed to work with your existing data structure:

- **Users**: Employee information and authentication
- **Tasks**: Project tasks and time tracking
- **Leave Applications**: Leave requests and approvals
- **WFH Applications**: Work from home requests

### **No Schema Changes Required**
- ✅ **Compatible**: Works with your current data format
- ✅ **Flexible**: Adapts to existing column structures
- ✅ **Safe**: No destructive operations on existing data

## 🎯 **Summary**

**Your Google Sheet**: https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit

**Status**: ✅ **CONFIGURED AND PROTECTED**

- Data stays exactly where it is
- No migration or copying required
- Application connects directly to your existing sheet
- All current data remains accessible and intact

**Next Steps**: Simply deploy the application and it will automatically connect to your existing Google Sheet with all your data preserved.
