# AWS S3 Setup Guide for File Uploads

This guide will help you set up AWS S3 for bug attachment uploads in your Vercel-deployed application.

---

## 📋 **Prerequisites**

- AWS Account (create one at https://aws.amazon.com if you don't have one)
- Access to Vercel project dashboard
- ~10 minutes of setup time

---

## 🚀 **Step 1: Create S3 Bucket**

### 1.1 Log in to AWS Console
- Go to https://console.aws.amazon.com
- Sign in with your AWS account

### 1.2 Navigate to S3
- Search for "S3" in the top search bar
- Click on "S3" service

### 1.3 Create Bucket
1. Click **"Create bucket"** button
2. **Bucket name**: Choose a unique name (e.g., `jsr-task-app-uploads` or `task-amtariksha-files`)
   - Must be globally unique
   - Use lowercase letters, numbers, and hyphens only
3. **AWS Region**: Choose closest to your users (e.g., `us-east-1` for US East, `ap-south-1` for India)
4. **Object Ownership**: Select "ACLs disabled (recommended)"
5. **Block Public Access settings**: 
   - ✅ **UNCHECK** "Block all public access"
   - ⚠️ Check the acknowledgment box (we need public read access for bug attachments)
6. **Bucket Versioning**: Disabled (optional: enable if you want version history)
7. **Default encryption**: Enable with SSE-S3
8. Click **"Create bucket"**

---

## 🔐 **Step 2: Configure CORS Policy**

### 2.1 Open Bucket Settings
- Click on your newly created bucket name
- Go to **"Permissions"** tab

### 2.2 Edit CORS Configuration
1. Scroll down to **"Cross-origin resource sharing (CORS)"**
2. Click **"Edit"**
3. Paste the following JSON:

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
            "DELETE"
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

4. Click **"Save changes"**

---

## 🔑 **Step 3: Create IAM User for Programmatic Access**

### 3.1 Navigate to IAM
- Search for "IAM" in the top search bar
- Click on "IAM" service

### 3.2 Create User
1. Click **"Users"** in the left sidebar
2. Click **"Create user"** button
3. **User name**: `jsr-task-app-s3-uploader`
4. Click **"Next"**

### 3.3 Set Permissions
1. Select **"Attach policies directly"**
2. Search for `AmazonS3FullAccess` and check it
   - ⚠️ For production, create a custom policy with limited permissions (see Step 4)
3. Click **"Next"**
4. Click **"Create user"**

### 3.4 Create Access Keys
1. Click on the newly created user
2. Go to **"Security credentials"** tab
3. Scroll to **"Access keys"** section
4. Click **"Create access key"**
5. Select **"Application running outside AWS"**
6. Click **"Next"**
7. (Optional) Add description: "Vercel file upload"
8. Click **"Create access key"**
9. **⚠️ IMPORTANT**: Copy both:
   - **Access key ID** (e.g., `AKIAIOSFODNN7EXAMPLE`)
   - **Secret access key** (e.g., `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
   - ⚠️ **Save these securely** - you won't be able to see the secret key again!

---

## 🔒 **Step 4: Create Custom IAM Policy (Recommended for Production)**

Instead of using `AmazonS3FullAccess`, create a limited policy:

### 4.1 Create Policy
1. In IAM, click **"Policies"** in left sidebar
2. Click **"Create policy"**
3. Click **"JSON"** tab
4. Paste the following (replace `YOUR-BUCKET-NAME`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
        }
    ]
}
```

5. Click **"Next"**
6. **Policy name**: `JSR-Task-S3-Upload-Policy`
7. Click **"Create policy"**

### 4.2 Attach to User
1. Go back to **Users** → Select your user
2. Click **"Add permissions"** → **"Attach policies directly"**
3. Search for `JSR-Task-S3-Upload-Policy`
4. Check it and click **"Add permissions"**
5. Remove the `AmazonS3FullAccess` policy if attached

---

## ⚙️ **Step 5: Configure Vercel Environment Variables**

### 5.1 Go to Vercel Dashboard
- Open https://vercel.com
- Select your project (`task`)

### 5.2 Add Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

| Variable Name | Value | Example |
|---------------|-------|---------|
| `AWS_ACCESS_KEY_ID` | Your access key ID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Your secret access key | `wJalrXUtnFEMI/K7MDENG/...` |
| `AWS_REGION` | Your bucket region | `us-east-1` or `ap-south-1` |
| `AWS_S3_BUCKET` | Your bucket name | `jsr-task-app-uploads` |

3. For each variable:
   - Click **"Add New"**
   - Enter **Name** and **Value**
   - Select **All** environments (Production, Preview, Development)
   - Click **"Save"**

### 5.3 Redeploy
- Go to **Deployments** tab
- Click **"..."** on the latest deployment
- Click **"Redeploy"**
- Wait for deployment to complete

---

## ✅ **Step 6: Test File Upload**

1. Go to https://task.amtariksha.com/bugs/create
2. Fill in bug details
3. Try uploading an image or video
4. Submit the bug
5. Check if the attachment appears in the bug details

### Verify in S3:
1. Go to AWS S3 Console
2. Open your bucket
3. You should see a `bugs/` folder with uploaded files

---

## 💰 **Cost Estimation**

AWS S3 pricing (as of 2025):

| Item | Cost | Notes |
|------|------|-------|
| **Storage** | $0.023/GB/month | First 50 TB |
| **PUT requests** | $0.005 per 1,000 | File uploads |
| **GET requests** | $0.0004 per 1,000 | File downloads |
| **Data transfer OUT** | $0.09/GB | First 10 TB/month |

**Example for 100 bugs with 2 images each (5MB avg):**
- Storage: 1GB = $0.023/month
- Uploads: 200 files = $0.001
- Downloads: 1,000 views = $0.0004
- **Total: ~$0.03/month** (negligible)

**Free Tier (First 12 months):**
- 5GB storage
- 20,000 GET requests
- 2,000 PUT requests
- 100GB data transfer

---

## 🔧 **Troubleshooting**

### Issue: "AWS S3 is not configured"
- **Solution**: Check that all 4 environment variables are set in Vercel
- Redeploy after adding variables

### Issue: "Access Denied" error
- **Solution**: Check IAM policy allows `s3:PutObject` on your bucket
- Verify bucket name matches `AWS_S3_BUCKET` variable

### Issue: CORS error in browser
- **Solution**: Check CORS policy includes your domain
- Make sure `AllowedOrigins` includes `https://task.amtariksha.com`

### Issue: Files upload but can't be viewed
- **Solution**: Check bucket public access settings
- Make sure "Block all public access" is unchecked

---

## 🎯 **Next Steps**

After setup is complete:
1. ✅ Test file upload on production
2. ✅ Verify files are accessible via URL
3. ✅ Monitor S3 usage in AWS Console
4. ✅ Set up S3 lifecycle rules (optional - auto-delete old files)
5. ✅ Enable CloudFront CDN (optional - faster delivery)

---

## 📞 **Support**

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify AWS credentials are correct
4. Ensure bucket region matches `AWS_REGION` variable

---

**Setup complete! Your application now supports file uploads up to 10MB (or larger if you increase the limit) without Vercel's 4.5MB restriction.** 🎉

