# Developer Handover Document
## AWS S3 File Upload Configuration - Session Summary

**Date**: 2025-10-31  
**Project**: JSR Task Management Web Application  
**Focus Area**: AWS S3 File Upload Configuration & CORS Setup  
**Status**: ⚠️ **IN PROGRESS** - Credentials updated, CORS configuration pending

---

## 📋 Executive Summary

This session focused on resolving AWS S3 file upload issues for the bug creation feature. The user was experiencing a 403 Forbidden error when attempting to upload image files while creating bugs. The root cause was identified as missing CORS configuration on the S3 bucket.

### **Key Achievements**
- ✅ Identified and fixed AWS environment variable typo (`AWSECRET_ACCESS_KEY` → `AWS_SECRET_ACCESS_KEY`)
- ✅ Moved AWS credentials to correct location (`apps/web/.env.local`)
- ✅ Discovered user was using AWS Lightsail bucket (no CORS UI support)
- ✅ User migrated to standard AWS S3 bucket (`amtariksha`)
- ✅ Created CORS configuration file (`s3-cors-policy.json`)
- ✅ Created comprehensive setup guides (`S3_CORS_SETUP_GUIDE.md`, `LIGHTSAIL_CORS_SETUP.md`)
- ✅ Updated AWS credentials with new IAM user credentials
- ⏳ **PENDING**: Apply CORS configuration to S3 bucket and test file upload

---

## 🗂️ Files Modified/Created

### **Files Created**
1. **`s3-cors-policy.json`** (Root directory)
   - CORS configuration for S3 bucket
   - Allows requests from `https://task.amtariksha.com` and `http://localhost:3000`
   - Supports GET, PUT, POST, DELETE, HEAD methods

2. **`S3_CORS_SETUP_GUIDE.md`** (Root directory)
   - Complete guide for configuring CORS on standard S3 buckets
   - Includes both AWS Console and CLI methods
   - Step-by-step instructions with screenshots references
   - Troubleshooting section

3. **`LIGHTSAIL_CORS_SETUP.md`** (Root directory)
   - Guide for AWS Lightsail buckets (deprecated - user switched to S3)
   - Kept for reference in case needed later

### **Files Modified**
1. **`apps/web/.env.local`** (Lines 20-26)
   - **Before**:
     ```env
     AWS_ACCESS_KEY_ID=AKIAQ3EGWJ5223CPZP5V
     AWS_SECRET_ACCESS_KEY=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
     AWS_REGION=ap-south-1
     AWS_S3_BUCKET=amtariksha-bucket
     ```
   - **After**:
     ```env
     AWS_ACCESS_KEY_ID=AKIA2JGJ2OTO4M3JH6MR
     AWS_SECRET_ACCESS_KEY=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
     AWS_REGION=ap-south-1
     AWS_S3_BUCKET=amtariksha
     ```
   - **Changes**:
     - Updated Access Key ID (new IAM user)
     - Updated Secret Access Key (new IAM user)
     - Changed bucket name from `amtariksha-bucket` to `amtariksha`

2. **`S3_CORS_SETUP_GUIDE.md`** (User manually updated)
   - Line 79: Updated bucket ARN from `YOUR-BUCKET-NAME` to `amtariksha`

---

## 🔍 Problem Analysis

### **Initial Issue**
```
AWS S3 is not configured. Please add AWS credentials to environment variables.
```

### **Root Causes Identified**
1. **Typo in environment variable**: `AWSECRET_ACCESS_KEY` instead of `AWS_SECRET_ACCESS_KEY`
2. **Wrong file location**: Credentials in root `.env.local` instead of `apps/web/.env.local`
3. **Invalid credentials**: Original credentials (`AKIAQ3EGWJ5223CPZP5V`) were invalid/expired
4. **Missing CORS configuration**: S3 bucket not configured to allow cross-origin requests

### **Secondary Issue (After Fixing Credentials)**
```
403 Forbidden - OPTIONS request failed
No 'Access-Control-Allow-Origin' header is present
```

**Root Cause**: S3 bucket CORS policy not configured

---

## 🛠️ Technical Details

### **AWS S3 Configuration**

#### **Bucket Information**
- **Bucket Name**: `amtariksha`
- **Region**: `ap-south-1` (Mumbai)
- **Purpose**: Store bug attachments (images, files)
- **Access**: Public read access required (for viewing uploaded files)

#### **IAM User Credentials**
- **Access Key ID**: `AKIA2JGJ2OTO4M3JH6MR`
- **Secret Access Key**: `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`
- **Required Permissions**:
  - `s3:PutObject` (upload files)
  - `s3:GetObject` (download/view files)
  - `s3:DeleteObject` (delete files - optional)
  - `s3:ListBucket` (list bucket contents - optional)

#### **CORS Configuration** (`s3-cors-policy.json`)
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "https://task.amtariksha.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**Explanation**:
- **AllowedOrigins**: Production domain and local development
- **AllowedMethods**: All HTTP methods needed for file operations
- **AllowedHeaders**: All headers (including Content-Type)
- **ExposeHeaders**: ETag for file verification
- **MaxAgeSeconds**: Cache preflight response for 50 minutes

---

## 🚀 Current Status

### **✅ Completed**
1. Environment variables configured in `apps/web/.env.local`
2. AWS credentials updated with new IAM user
3. Bucket name updated to `amtariksha`
4. CORS configuration file created (`s3-cors-policy.json`)
5. Comprehensive setup guides created

### **⚠️ CRITICAL ISSUE DETECTED**
**AWS Credentials Validation Failed**:
```
An error occurred (InvalidAccessKeyId) when calling the ListObjectsV2 operation:
The AWS Access Key Id you provided does not exist in our records.
```

**Possible Causes**:
1. IAM user not fully created/activated yet
2. Access Key ID copied incorrectly
3. Credentials from wrong AWS account
4. IAM user deleted or deactivated

**Required Action**: Verify IAM user exists and credentials are correct before proceeding.

### **⏳ Pending (CRITICAL - Must Complete)**
1. **VERIFY AWS CREDENTIALS** - Test that Access Key ID `AKIA2JGJ2OTO4M3JH6MR` exists and is active
2. **Apply CORS configuration to S3 bucket** (see instructions below)
3. **Disable "Block public access"** on S3 bucket
4. **Add bucket policy** for public read access
5. **Restart dev server** to pick up new environment variables
6. **Test file upload** at `http://localhost:3000/bugs/create`
7. **Verify uploaded files** are accessible

---

## 📝 Next Steps for Continuation

### **Step 0: VERIFY AWS CREDENTIALS (CRITICAL - Do This First!)**

The credentials in `.env.local` failed validation. Before proceeding, verify they are correct.

#### **Test Credentials**

```bash
# Test if credentials work
aws s3 ls s3://amtariksha/ --region ap-south-1
```

**If you get "InvalidAccessKeyId" error**:

1. **Go to IAM Console**: https://console.aws.amazon.com/iam/home#/users
2. **Find the user** that owns Access Key `AKIA2JGJ2OTO4M3JH6MR`
3. **Verify**:
   - User exists and is active
   - Access Key is active (not deleted/deactivated)
   - Access Key ID matches exactly: `AKIA2JGJ2OTO4M3JH6MR`
4. **If Access Key doesn't exist**:
   - Create a new Access Key for the user
   - Update `apps/web/.env.local` with new credentials
   - Restart dev server

**If credentials are correct but still failing**:
- Check you're using the correct AWS account
- Verify IAM user has S3 permissions attached
- Try creating a new IAM user with `AmazonS3FullAccess` policy

**Once credentials work**, you should see bucket contents (or empty list if bucket is empty):
```
# Success looks like:
2025-10-31 12:34:56       1234 test-file.txt

# Or empty bucket:
(no output, but no error)
```

---

### **Step 1: Apply CORS Configuration to S3 Bucket**

**Method A: AWS Console (Recommended - Easiest)**

1. Go to: https://s3.console.aws.amazon.com/s3/buckets
2. Click on bucket: **`amtariksha`**
3. Go to **"Permissions"** tab
4. Scroll to **"Cross-origin resource sharing (CORS)"**
5. Click **"Edit"**
6. Paste the contents of `s3-cors-policy.json`:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedOrigins": [
         "https://task.amtariksha.com",
         "http://localhost:3000"
       ],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```
7. Click **"Save changes"**
8. Verify success message appears

**Method B: AWS CLI (Faster)**

```bash
aws s3api put-bucket-cors \
  --bucket amtariksha \
  --cors-configuration file://s3-cors-policy.json
```

**Verify CORS was applied**:
```bash
aws s3api get-bucket-cors --bucket amtariksha
```

---

### **Step 2: Configure Bucket Permissions**

#### **2.1: Disable Block Public Access**

**AWS Console**:
1. In bucket **"Permissions"** tab
2. Scroll to **"Block public access (bucket settings)"**
3. Click **"Edit"**
4. **Uncheck** "Block all public access"
5. Check acknowledgment box
6. Click **"Save changes"**
7. Type `confirm` and click **"Confirm"**

**AWS CLI**:
```bash
aws s3api put-public-access-block \
  --bucket amtariksha \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

#### **2.2: Add Bucket Policy (Public Read Access)**

**AWS Console**:
1. In bucket **"Permissions"** tab
2. Scroll to **"Bucket policy"**
3. Click **"Edit"**
4. Paste this JSON:
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
5. Click **"Save changes"**

**AWS CLI**:
```bash
# Create bucket-policy.json first
cat > bucket-policy.json << 'EOF'
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
EOF

# Apply the policy
aws s3api put-bucket-policy \
  --bucket amtariksha \
  --policy file://bucket-policy.json
```

---

### **Step 3: Restart Dev Server**

The dev server needs to be restarted to pick up the new environment variables.

```bash
# Kill the current dev server (Ctrl+C in the terminal running it)
# Then restart:
cd apps/web
npm run dev
```

**Verify environment variables are loaded**:
```bash
cd apps/web
node -e "require('dotenv').config({ path: '.env.local' }); console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID); console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY?.substring(0, 10) + '...'); console.log('AWS_REGION:', process.env.AWS_REGION); console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);"
```

**Expected output**:
```
AWS_ACCESS_KEY_ID: AKIA2JGJ2OTO4M3JH6MR
AWS_SECRET_ACCESS_KEY: GzE1OMjCmT...
AWS_REGION: ap-south-1
AWS_S3_BUCKET: amtariksha
```

---

### **Step 4: Test File Upload**

1. **Open browser**: `http://localhost:3000/bugs/create`
2. **Open browser console** (F12) → Network tab
3. **Fill in bug form**:
   - Title: "Test S3 Upload"
   - Description: "Testing file upload to S3"
   - Project: Select any project
   - Subproject: Select any subproject
   - Priority: Select any priority
   - Severity: Select any severity
4. **Upload a test image** (small PNG/JPEG file)
5. **Watch Network tab** for these requests:
   - ✅ `POST /api/upload/presigned-url` → **200 OK**
   - ✅ `OPTIONS https://amtariksha.s3.ap-south-1.amazonaws.com/bugs/...` → **200 OK** (not 403!)
   - ✅ `PUT https://amtariksha.s3.ap-south-1.amazonaws.com/bugs/...` → **200 OK**
6. **Submit the bug**
7. **Verify**:
   - Bug created successfully
   - Attachment appears in bug details page
   - Clicking attachment opens the image (publicly accessible)

---

## 🔧 Troubleshooting Guide

### **Issue: Still getting "AWS S3 is not configured"**
**Solution**:
1. Verify `.env.local` is in `apps/web/` directory (not root)
2. Check no typos in environment variable names
3. Restart dev server
4. Check server logs for AWS warnings

### **Issue: Still getting 403 Forbidden on OPTIONS request**
**Solution**:
1. Verify CORS configuration was applied: AWS Console → S3 → amtariksha → Permissions → CORS
2. Check CORS JSON format is correct (use `s3-cors-policy.json`)
3. Clear browser cache and try again
4. Check browser console for exact error message

### **Issue: File uploads but returns 403 when viewing**
**Solution**:
1. Check "Block public access" is fully disabled
2. Verify bucket policy allows `s3:GetObject` for `*` (public)
3. Check bucket policy Resource ARN is `arn:aws:s3:::amtariksha/*` (with `/*`)

### **Issue: "InvalidAccessKeyId" error**
**Solution**:
1. Verify Access Key ID is correct: `AKIA2JGJ2OTO4M3JH6MR`
2. Check Secret Access Key has no extra spaces/newlines
3. Verify IAM user exists and is active
4. Check IAM user has S3 permissions attached

### **Issue: "Access Denied" when uploading**
**Solution**:
1. Verify IAM user has `s3:PutObject` permission
2. Check bucket policy doesn't block uploads
3. Verify bucket name is correct (`amtariksha`)

---

## 📚 Reference Documentation

### **Files to Review**
- **`S3_CORS_SETUP_GUIDE.md`**: Complete S3 setup guide (AWS Console + CLI methods)
- **`s3-cors-policy.json`**: CORS configuration (ready to apply)
- **`apps/web/src/lib/s3Config.ts`**: S3 client configuration and validation
- **`apps/web/src/app/api/upload/presigned-url/route.ts`**: Presigned URL generation API
- **`apps/web/src/app/bugs/create/page.tsx`**: Bug creation page with file upload

### **Key Code Locations**
- **S3 Configuration**: `/apps/web/src/lib/s3Config.ts` (lines 11-63)
- **Presigned URL API**: `/apps/web/src/app/api/upload/presigned-url/route.ts` (lines 53-120)
- **File Upload Logic**: `/apps/web/src/app/bugs/create/page.tsx` (lines 297-348)
- **Environment Variables**: `/apps/web/.env.local` (lines 20-26)

### **AWS Resources**
- **S3 Bucket**: https://s3.console.aws.amazon.com/s3/buckets/amtariksha
- **IAM Users**: https://console.aws.amazon.com/iam/home#/users
- **S3 CORS Documentation**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html

---

## ⚠️ Important Notes

1. **Security**: The Secret Access Key (`GzE1OMjCmTmahXMMUtRWNW8jsOjJ0WQ8UoWhSa9I`) is sensitive. Ensure it's not committed to Git (`.env.local` is in `.gitignore`).

2. **Production Deployment**: When deploying to Vercel/production, add these environment variables to the deployment platform:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `AWS_S3_BUCKET`

3. **CORS Origins**: Currently allows both production (`https://task.amtariksha.com`) and localhost (`http://localhost:3000`). This is correct for development and production.

4. **Public Access**: The bucket policy allows public read access to all files. This is required for viewing bug attachments. If you need private files, implement signed URLs for downloads.

5. **File Organization**: Files are uploaded to `bugs/` folder in the S3 bucket with format: `bugs/{timestamp}-{filename}`

---

## ✅ Success Criteria

The configuration is complete when:
- [ ] CORS configuration applied to S3 bucket
- [ ] Block public access disabled
- [ ] Bucket policy added for public read access
- [ ] Dev server restarted with new environment variables
- [ ] File upload tested successfully at `/bugs/create`
- [ ] No 403 errors in browser console
- [ ] Uploaded file appears in bug details
- [ ] Uploaded file is publicly accessible (can be viewed in browser)

---

## 🎯 Summary

**What Was Done**:
- Fixed AWS environment variable configuration
- Migrated from Lightsail to standard S3 bucket
- Created CORS configuration and setup guides
- Updated IAM credentials

**What's Pending**:
- Apply CORS configuration to S3 bucket (5 minutes)
- Configure bucket permissions (5 minutes)
- Test file upload (2 minutes)

**Estimated Time to Complete**: 15 minutes

**Priority**: HIGH - File upload feature is currently broken

---

**Handover Complete** ✅  
Next agent should start with **Step 1: Apply CORS Configuration** above.

