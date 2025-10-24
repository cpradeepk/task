# Vercel Environment Variables Setup Guide

## 🔧 Required Environment Variables for Google Sheets

### **CRITICAL: Set these EXACT values in Vercel Dashboard**

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

### **1. Google Cloud Project Configuration**

```
GOOGLE_PROJECT_ID = task-management-449805
```

### **2. Service Account Email**

```
GOOGLE_CLIENT_EMAIL = web-jsr@task-management-449805.iam.gserviceaccount.com
```

### **3. Service Account Client ID**

```
GOOGLE_CLIENT_ID = 109515916893293632227
```

### **4. Private Key ID**

```
GOOGLE_PRIVATE_KEY_ID = 22c9d3067c883d8fc05e1db451f501578696ab23
```

### **5. Private Key (MOST CRITICAL)**

```
GOOGLE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCjQlMaftbPIekM
pAvdptUZbuM1SoZiUuOQS2v+NyQG9ZM6bonbNXasoqTzirdDrSZ4q3Cj9xnMe5XY
5G/u1TWPv9FiS8BWEt3s2LiUcNwTtV3YbGYF+XIu5CttVDddgpJxJ7OZu2Yt5Ir+
nXHEQnfnWuedjNJf9SX6Py++YntTl7wafm63kj6kW0jeEP87k15yK5pmc/zuAmbZ
uXFzAdjzoCQEP+ZcmpCAxcR1m5dUTUV4eqeYVENjmjITB0ZmvNB4m6fCRzM66sYN
HAHOqTeq1/87gCau+1tbV1mJ03UjOawc29uqwfYzgB3xrR3fHiNuZ2gOUj366gsN
fHCEAMCJAgMBAAECggEAFy6h0k9UfVEZYJwiuzSnadcfGEAe2PNgMOskyJJX4U0Z
vOBZXvE2iskFlzeJUmjR36yob//0f97Epmm5ozZPRrw8JTMQeqhvLuSPQTTNa1cD
nmm2Cv8iwZnQuNOOkQ6rcLnsfNXpanbbbdA5iV7O2+FCplKKxOlwnRo/0070qCfX
J6ZgtoVHydrbdUAZW13uRIVqRyJ7SbzruLCmZjsWQU7dnxDrE6/5lvsm194+l6EO
57NU04MghypcOCxisyTWV4YbndBPHfGIl+mK/fq8LwqWsUTISxI191dPQFQMlGDO
Zl6yB4QuYhqfmiwoN3wVT+bD9mLdXQdV6keDBuHfoQKBgQDmw4mxvWi2G74SM3XB
TdGrgCNz5Y32jSGiqrTwZiM8KSwMPK89EJfWP5H10QPNtFPeQIvVljLeRWgSS8iJ
2XoyWdsZBl/ttlcqiya6tC1K5Pi2H0LCvxkmDdgjgcABgVprOUWawKoh+vPnP+8k
wEEpHy44RHRl1ESkLEk9J4RaLQKBgQC1HOyyDxHBxsRZtcmM8xzt6Z9tvK64TSz7
RIT/LtR5ydFErSQ3ZHcARENTwlPv+eI5zrtA9Pt8fh+LfUiruqm8bN2hf1SRN1Aj
6cYaKqq9rvae40FdHmpLfMcMcpxP6ehrjQNYBCp7ojXJvHouDtg5anSOHPn3Lyea
qZegyCHFTQKBgFTA4GOdU0X/LnH04HzcnfNFHsBEQT2aXA4ocEgS20IPRRRBfYMK
Axo3Qt5ro9/7KQpp3nHVtl0YVL7TgpXOgCjaA7RPORBPdfg0H0dXQYNOUWJiXNy1
3wCw+P8hemmTHqhe4oeR12qfhtEaFDUFP2lhAFK+IZn8ujEp6sRBLUUJAoGBAKZ/
3dXf5qonKjFy3sSWZ30MroV61YEXagfhOQdDrQ/9ikZBii7mTERRfTfOSc4vAlu0
gw83aM9NP4DD/3/ojcxspN+oKD2MBT/O1VEO8oKJC66MK3YI1R1qq6702mDZH9No
Aq/yvH+GYz5/6C7ZdMxr4pUXbHFix1z3Fi84bVttAoGAK+w211RhHrJrJoKr/4YQ
NklMazl3dH0VOv6epmLx8A5tafjTeZMbrUsG63abc5ef4MJvSoOUnkaCCxqI+NCG
KNuKK2xNJQdqPEuazaJRUxoEiYdJdlnlc9e+aN76bKSUZHPUSW+Cx2iBHikBikD/
rJyEzupWrO1EzgGJqBG4dvY=
-----END PRIVATE KEY-----
```

**⚠️ IMPORTANT PRIVATE KEY NOTES:**

- Copy the ENTIRE private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Do NOT add quotes around the private key
- Preserve all line breaks and formatting
- The key should be exactly as shown in your service account JSON file

### **6. Client Certificate URL**

```
GOOGLE_CLIENT_CERT_URL = https://www.googleapis.com/robot/v1/metadata/x509/web-jsr%40task-management-449805.iam.gserviceaccount.com
```

### **7. Google Sheets Configuration**

```
GOOGLE_SHEET_ID = 1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98
```

## 🔍 Verification Steps

### **Step 1: Check Environment Variables**

After setting variables, test with:

```
https://your-app.vercel.app/api/debug/auth
```

Expected response:

```json
{
  "success": true,
  "debug": {
    "environment": {
      "hasProjectId": true,
      "hasPrivateKeyId": true,
      "hasPrivateKey": true,
      "hasClientEmail": true,
      "hasClientId": true
    },
    "validationChecks": {
      "hasRequiredFields": true,
      "privateKeyFormatValid": true,
      "notPlaceholder": true
    }
  }
}
```

### **Step 2: Test Google Sheets Connection**

```
https://your-app.vercel.app/api/test-auth
```

Expected response:

```json
{
  "success": true,
  "message": "Google Sheets authentication and connection successful"
}
```

### **Step 3: Test User Data Loading**

```
https://your-app.vercel.app/api/users
```

Expected response:

```json
{
  "success": true,
  "data": [...],
  "source": "google_sheets"
}
```

## 🚨 Common Issues & Solutions

### **Issue 1: "Private key format appears invalid"**

**Solution**: Ensure private key includes proper headers and no extra quotes

### **Issue 2: "Google Sheets authentication not available"**

**Solution**: Check all 6 environment variables are set correctly

### **Issue 3: "Connection test failed"**

**Solution**: Verify Google Sheet permissions and service account access

### **Issue 4: Users loading from localStorage instead of Google Sheets**

**Solution**: Check environment variables and authentication flow

## 🎯 Success Indicators

✅ **Environment Variables**: All 6 variables present and valid
✅ **Authentication**: JWT authorization successful
✅ **Google Sheets**: Connection established and data readable
✅ **User Data**: 27+ users loaded from Google Sheets
✅ **Source**: API responses show `"source": "google_sheets"`

## 📞 Support

If issues persist:

1. Check Vercel deployment logs
2. Verify Google Cloud service account permissions
3. Test locally first to confirm configuration
4. Use debug endpoints for detailed troubleshooting
