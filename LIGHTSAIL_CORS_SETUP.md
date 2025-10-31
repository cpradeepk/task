# AWS Lightsail Bucket CORS Configuration

This guide shows you how to configure CORS for your Lightsail bucket to fix the 403 Forbidden error when uploading files.

---

## 🔍 **The Problem**

When trying to upload files to your Lightsail bucket from the browser, you get:
```
403 Forbidden - OPTIONS request failed
No 'Access-Control-Allow-Origin' header is present
```

This happens because Lightsail buckets require CORS configuration to allow cross-origin requests from your web application.

---

## ✅ **Solution: Configure CORS Using AWS CLI**

Lightsail buckets **do not have CORS configuration in the web console**. You must use the AWS CLI.

### **Step 1: Install AWS CLI (if not already installed)**

**Check if AWS CLI is installed:**
```bash
aws --version
```

**If not installed, install it:**

**Linux/macOS:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Windows:**
Download from: https://awscli.amazonaws.com/AWSCLIV2.msi

---

### **Step 2: Configure AWS CLI Credentials**

Run this command and enter your AWS credentials:
```bash
aws configure
```

**Enter these values:**
- **AWS Access Key ID**: `AKIAQ3EGWJ5223CPZP5V`
- **AWS Secret Access Key**: `YGjQgEbYfriv5hSqeJi6+pcbBJL3SkMospTPf2Vs`
- **Default region name**: `ap-south-1`
- **Default output format**: `json`

---

### **Step 3: Apply CORS Configuration**

The CORS configuration file `s3-cors-policy.json` has been created for you with the correct format for Lightsail.

**Apply the CORS configuration:**
```bash
aws lightsail update-bucket \
  --bucket-name amtariksha-bucket \
  --cors file://s3-cors-policy.json
```

**Expected output:**
```json
{
    "operations": [
        {
            "id": "...",
            "resourceName": "amtariksha-bucket",
            "resourceType": "Bucket",
            "createdAt": "...",
            "location": {
                "availabilityZone": "all",
                "regionName": "ap-south-1"
            },
            "isTerminal": true,
            "operationDetails": "...",
            "operationType": "UpdateBucket",
            "status": "Succeeded",
            "statusChangedAt": "...",
            "errorCode": "",
            "errorDetails": ""
        }
    ]
}
```

---

### **Step 4: Verify CORS Configuration**

**Check that CORS was applied successfully:**
```bash
aws lightsail get-buckets \
  --bucket-name amtariksha-bucket \
  --include-cors
```

**Expected output (should include CORS rules):**
```json
{
    "buckets": [
        {
            "name": "amtariksha-bucket",
            "arn": "...",
            "bundleId": "...",
            "createdAt": "...",
            "location": {
                "availabilityZone": "all",
                "regionName": "ap-south-1"
            },
            "resourceType": "Bucket",
            "corsRules": [
                {
                    "allowedOrigins": [
                        "https://task.amtariksha.com",
                        "http://localhost:3000"
                    ],
                    "allowedMethods": [
                        "GET",
                        "PUT",
                        "POST",
                        "DELETE",
                        "HEAD"
                    ],
                    "allowedHeaders": [
                        "*"
                    ],
                    "exposeHeaders": [
                        "ETag"
                    ],
                    "maxAgeSeconds": 3000
                }
            ]
        }
    ]
}
```

---

### **Step 5: Configure Bucket Permissions**

Lightsail buckets also need proper access permissions. Set your bucket to allow public read access:

**Option 1: Using Lightsail Console (Recommended)**
1. Go to: https://lightsail.aws.amazon.com/ls/webapp/home/storage
2. Click on **`amtariksha-bucket`**
3. Go to **"Permissions"** tab
4. Under **"Bucket access permissions"**, select:
   - ✅ **Individual objects can be made public**
5. Click **"Save"**

**Option 2: Using AWS CLI**
```bash
aws lightsail update-bucket \
  --bucket-name amtariksha-bucket \
  --access-rules '{"getObject":"public","allowPublicOverrides":true}'
```

---

### **Step 6: Test File Upload**

1. **Open your browser** and go to: `http://localhost:3000/bugs/create`
2. **Open browser console** (F12) → Network tab
3. **Fill in the bug form** and upload an image
4. **Watch the Network tab**:
   - ✅ `OPTIONS` request to Lightsail bucket → **200 OK** (not 403!)
   - ✅ `PUT` request to Lightsail bucket → **200 OK**
5. **Submit the bug** and verify the attachment appears

---

## 🔧 **Troubleshooting**

### **Issue: "aws: command not found"**
**Solution**: Install AWS CLI (see Step 1)

### **Issue: "Unable to locate credentials"**
**Solution**: Run `aws configure` and enter your credentials (see Step 2)

### **Issue: "An error occurred (AccessDeniedException)"**
**Solution**: 
- Verify your AWS Access Key ID and Secret Access Key are correct
- Make sure the IAM user has Lightsail permissions

### **Issue: Still getting 403 after applying CORS**
**Solution**:
1. Verify CORS was applied: `aws lightsail get-buckets --bucket-name amtariksha-bucket --include-cors`
2. Check bucket permissions are set to allow public read access
3. Clear browser cache and try again
4. Check browser console for the exact error message

### **Issue: "Bucket not found"**
**Solution**: 
- Verify bucket name is exactly `amtariksha-bucket`
- Check you're in the correct AWS region (`ap-south-1`)

---

## 📋 **CORS Configuration Explained**

The `s3-cors-policy.json` file contains:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://task.amtariksha.com",  // Production domain
        "http://localhost:3000"          // Local development
      ],
      "AllowedMethods": [
        "GET",     // Download files
        "PUT",     // Upload files
        "POST",    // Alternative upload method
        "DELETE",  // Delete files (if needed)
        "HEAD"     // Check file existence
      ],
      "AllowedHeaders": [
        "*"        // Allow all headers (Content-Type, etc.)
      ],
      "ExposeHeaders": [
        "ETag"     // Expose ETag header for file verification
      ],
      "MaxAgeSeconds": 3000  // Cache preflight response for 50 minutes
    }
  ]
}
```

---

## 🎯 **Quick Command Reference**

**Apply CORS:**
```bash
aws lightsail update-bucket --bucket-name amtariksha-bucket --cors file://s3-cors-policy.json
```

**Verify CORS:**
```bash
aws lightsail get-buckets --bucket-name amtariksha-bucket --include-cors
```

**Remove CORS (if needed):**
```bash
aws lightsail update-bucket --bucket-name amtariksha-bucket --cors '{"rules":[]}'
```

**Set public read access:**
```bash
aws lightsail update-bucket --bucket-name amtariksha-bucket --access-rules '{"getObject":"public","allowPublicOverrides":true}'
```

---

## ✅ **Success Checklist**

- [ ] AWS CLI installed and configured
- [ ] CORS configuration applied to `amtariksha-bucket`
- [ ] CORS verified with `get-buckets --include-cors`
- [ ] Bucket permissions set to allow public read access
- [ ] File upload tested at `http://localhost:3000/bugs/create`
- [ ] No 403 errors in browser console
- [ ] Uploaded file appears in bug details

---

## 🎉 **Summary**

**Issue**: 403 Forbidden on file upload (CORS error)  
**Root Cause**: Lightsail bucket CORS not configured  
**Solution**: Use AWS CLI to apply CORS configuration  
**Command**: `aws lightsail update-bucket --bucket-name amtariksha-bucket --cors file://s3-cors-policy.json`

After applying CORS, file uploads should work from both localhost and production! 🚀

