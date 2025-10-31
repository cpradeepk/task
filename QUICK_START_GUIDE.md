# Quick Start Guide - AWS S3 File Upload Configuration

**⚠️ START HERE** - Quick reference for continuing this work

---

## 🎯 Current Situation

**Problem**: File upload feature broken - 403 Forbidden error when uploading files to S3  
**Root Cause**: S3 bucket CORS not configured  
**Status**: Environment variables updated, CORS config ready, **credentials need verification**

---

## ⚡ Quick Actions (15 Minutes)

### **1. Verify AWS Credentials (2 min)**

```bash
aws s3 ls s3://amtariksha/ --region ap-south-1
```

**If error**: Go to IAM Console → Verify user exists → Create new Access Key if needed → Update `.env.local`

---

### **2. Apply CORS to S3 Bucket (5 min)**

**AWS Console Method** (Easiest):
1. Go to: https://s3.console.aws.amazon.com/s3/buckets/amtariksha
2. Click **Permissions** tab
3. Scroll to **CORS** section
4. Click **Edit**
5. Paste contents of `s3-cors-policy.json`
6. Click **Save**

**OR AWS CLI Method**:
```bash
aws s3api put-bucket-cors \
  --bucket amtariksha \
  --cors-configuration file://s3-cors-policy.json
```

---

### **3. Enable Public Access (5 min)**

**Disable Block Public Access**:
1. In S3 bucket → **Permissions** tab
2. **Block public access** → Click **Edit**
3. **Uncheck** "Block all public access"
4. Click **Save** → Type `confirm`

**Add Bucket Policy**:
1. In S3 bucket → **Permissions** tab
2. **Bucket policy** → Click **Edit**
3. Paste:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::amtariksha/*"
    }
  ]
}
```
4. Click **Save**

---

### **4. Restart Dev Server (1 min)**

```bash
# Kill current server (Ctrl+C)
cd apps/web
npm run dev
```

---

### **5. Test File Upload (2 min)**

1. Open: `http://localhost:3000/bugs/create`
2. Fill form + upload image
3. Check browser console (F12) → Network tab
4. Look for: `OPTIONS` and `PUT` requests to S3 → Should be **200 OK** (not 403)
5. Submit bug → Verify attachment appears

---

## 📋 Key Information

**S3 Bucket**: `amtariksha`  
**Region**: `ap-south-1`  
**Access Key**: `AKIA2JGJ2OTO4M3JH6MR` ⚠️ (needs verification)  
**CORS File**: `s3-cors-policy.json`  
**Env File**: `apps/web/.env.local`

---

## 🔗 Full Documentation

- **Complete Handover**: `DEVELOPER_HANDOVER.md`
- **S3 Setup Guide**: `S3_CORS_SETUP_GUIDE.md`
- **CORS Config**: `s3-cors-policy.json`

---

## ⚠️ Known Issues

1. **AWS credentials may be invalid** - Verify in IAM Console first
2. **CORS not applied yet** - Must be done manually in AWS Console or CLI
3. **Public access blocked** - Must be disabled for file viewing

---

## ✅ Success Checklist

- [ ] AWS credentials verified and working
- [ ] CORS applied to S3 bucket
- [ ] Block public access disabled
- [ ] Bucket policy added
- [ ] Dev server restarted
- [ ] File upload tested successfully
- [ ] No 403 errors in browser console

---

**Estimated Time**: 15 minutes  
**Priority**: HIGH - Feature is currently broken  
**Next Agent**: Start with Step 1 (Verify Credentials)

