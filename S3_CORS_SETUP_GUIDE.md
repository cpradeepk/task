# AWS S3 Bucket CORS Configuration - Quick Setup

This guide shows you how to configure CORS for your S3 bucket to fix the 403 Forbidden error.

---

## 🎯 **Two Ways to Configure CORS**

### **Method 1: AWS Console (Easiest - Visual Interface)**

#### **Step 1: Go to S3 Console**
1. Navigate to: https://s3.console.aws.amazon.com/s3/buckets
2. Sign in with your AWS account

#### **Step 2: Open Your Bucket**
1. Click on your bucket name (e.g., `amtariksha-bucket`)

#### **Step 3: Configure CORS**
1. Click on the **"Permissions"** tab
2. Scroll down to **"Cross-origin resource sharing (CORS)"** section
3. Click **"Edit"** button
4. **Delete any existing CORS configuration**
5. **Paste this JSON**:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedOrigins": [
      "https://task.amtariksha.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

6. Click **"Save changes"**
7. You should see a success message: ✅ **"Successfully edited CORS configuration"**

#### **Step 4: Configure Public Access**
1. Still in the **"Permissions"** tab
2. Scroll to **"Block public access (bucket settings)"**
3. Click **"Edit"**
4. **Uncheck** "Block all public access" ✅
5. Check the acknowledgment box
6. Click **"Save changes"**
7. Type `confirm` when prompted
8. Click **"Confirm"**

#### **Step 5: Add Bucket Policy (For Public Read Access)**
1. Still in the **"Permissions"** tab
2. Scroll to **"Bucket policy"** section
3. Click **"Edit"**
4. **Paste this JSON** (replace `YOUR-BUCKET-NAME` with your actual bucket name):

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

**Example** (if your bucket is named `amtariksha-bucket`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::amtariksha-bucket/*"
    }
  ]
}
```

5. Click **"Save changes"**

---

### **Method 2: AWS CLI (Faster - Command Line)**

#### **Step 1: Apply CORS Configuration**

```bash
aws s3api put-bucket-cors \
  --bucket YOUR-BUCKET-NAME \
  --cors-configuration file://s3-cors-policy.json
```

**Example** (if your bucket is named `amtariksha-bucket`):
```bash
aws s3api put-bucket-cors \
  --bucket amtariksha-bucket \
  --cors-configuration file://s3-cors-policy.json
```

#### **Step 2: Verify CORS Configuration**

```bash
aws s3api get-bucket-cors --bucket YOUR-BUCKET-NAME
```

**Expected output:**
```json
{
    "CORSRules": [
        {
            "AllowedHeaders": [
                "*"
            ],
            "AllowedMethods": [
                "GET",
                "PUT",
                "POST",
                "DELETE",
                "HEAD"
            ],
            "AllowedOrigins": [
                "https://task.amtariksha.com",
                "http://localhost:3000"
            ],
            "ExposeHeaders": [
                "ETag"
            ],
            "MaxAgeSeconds": 3000
        }
    ]
}
```

#### **Step 3: Disable Block Public Access**

```bash
aws s3api put-public-access-block \
  --bucket YOUR-BUCKET-NAME \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

#### **Step 4: Add Bucket Policy**

Create a file named `bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

Apply the policy:
```bash
aws s3api put-bucket-policy \
  --bucket YOUR-BUCKET-NAME \
  --policy file://bucket-policy.json
```

---

## 🧪 **Test File Upload**

After configuring CORS:

1. **Open your browser**: `http://localhost:3000/bugs/create`
2. **Open browser console** (F12) → Network tab
3. **Fill in the bug form** and upload an image
4. **Watch the Network tab**:
   - ✅ `POST /api/upload/presigned-url` → **200 OK**
   - ✅ `OPTIONS https://YOUR-BUCKET.s3.REGION.amazonaws.com/...` → **200 OK** (not 403!)
   - ✅ `PUT https://YOUR-BUCKET.s3.REGION.amazonaws.com/...` → **200 OK**
5. **Submit the bug** and verify the attachment appears

---

## 📝 **Update Environment Variables**

Make sure your `.env.local` has the correct bucket name:

```env
AWS_ACCESS_KEY_ID=AKIAQ3EGWJ5223CPZP5V
AWS_SECRET_ACCESS_KEY=YGjQgEbYfriv5hSqeJi6+pcbBJL3SkMospTPf2Vs
AWS_REGION=ap-south-1
AWS_S3_BUCKET=YOUR-BUCKET-NAME
```

**Replace `YOUR-BUCKET-NAME`** with your actual S3 bucket name!

If you changed the bucket name, **restart the dev server**:
```bash
# Kill the current dev server (Ctrl+C)
cd apps/web
npm run dev
```

---

## ✅ **Success Checklist**

- [ ] CORS configuration applied to S3 bucket
- [ ] Block public access disabled
- [ ] Bucket policy added for public read access
- [ ] Environment variable `AWS_S3_BUCKET` updated with correct bucket name
- [ ] Dev server restarted (if bucket name changed)
- [ ] File upload tested at `http://localhost:3000/bugs/create`
- [ ] No 403 errors in browser console
- [ ] Uploaded file appears in bug details

---

## 🔧 **Troubleshooting**

### **Issue: Still getting 403 Forbidden**
**Solution**:
1. Verify CORS is configured: AWS Console → S3 → Your Bucket → Permissions → CORS
2. Check "Block public access" is disabled
3. Verify bucket policy is applied
4. Clear browser cache and try again

### **Issue: "Access Denied" when viewing uploaded file**
**Solution**:
1. Make sure bucket policy allows `s3:GetObject` for `*` (public)
2. Check "Block public access" is fully disabled

### **Issue: CORS configuration not saving**
**Solution**:
1. Make sure JSON is valid (use a JSON validator)
2. Check you have permission to modify the bucket
3. Try using AWS CLI instead of console

---

## 🎉 **Summary**

**Issue**: 403 Forbidden on file upload (CORS error)  
**Root Cause**: S3 bucket CORS not configured  
**Solution**: Configure CORS via AWS Console or CLI  

**Recommended Method**: AWS Console (Method 1) - easiest and most visual

After configuring CORS, file uploads should work from both localhost and production! 🚀

