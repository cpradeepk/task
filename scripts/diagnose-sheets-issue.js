#!/usr/bin/env node

/**
 * Google Sheets Integration Diagnostic Script
 * Comprehensive diagnosis of Google Sheets connection issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Google Sheets Integration Diagnosis');
console.log('=====================================\n');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  console.log('📁 Loading .env.local file...');
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=');
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Replace escaped newlines with actual newlines
      value = value.replace(/\\n/g, '\n');
      process.env[key] = value;
    }
  });
  console.log('✅ Environment variables loaded from .env.local\n');
} else {
  console.log('❌ No .env.local file found\n');
}

// Check environment variables
console.log('🔑 Environment Variables Status:');
const requiredVars = [
  'GOOGLE_PROJECT_ID',
  'GOOGLE_CLIENT_EMAIL', 
  'GOOGLE_CLIENT_ID',
  'GOOGLE_PRIVATE_KEY_ID',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_CLIENT_CERT_URL'
];

let allVarsPresent = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const isPresent = !!value;
  console.log(`${isPresent ? '✅' : '❌'} ${varName}: ${isPresent ? 'Present' : 'Missing'}`);
  if (varName === 'GOOGLE_PRIVATE_KEY' && isPresent) {
    console.log(`   - Length: ${value.length} characters`);
    console.log(`   - Has BEGIN marker: ${value.includes('-----BEGIN PRIVATE KEY-----')}`);
    console.log(`   - Has END marker: ${value.includes('-----END PRIVATE KEY-----')}`);
    console.log(`   - Preview: ${value.substring(0, 50)}...`);
  }
  if (!isPresent) allVarsPresent = false;
});

if (!allVarsPresent) {
  console.log('\n❌ Some environment variables are missing!');
  console.log('This is likely why Google Sheets integration is failing.');
  console.log('\n💡 Solutions:');
  console.log('1. Ensure .env.local file exists with correct values');
  console.log('2. For Vercel deployment, set environment variables in Vercel Dashboard');
  console.log('3. Run: npm run setup-vercel-env to get the correct values');
  process.exit(1);
}

console.log('\n✅ All environment variables are present');

// Check Google Sheets permissions
console.log('\n📋 Google Sheets Access Check:');
console.log(`Sheet ID: ${process.env.GOOGLE_SHEET_ID || 'Not set'}`);
console.log(`Service Account: ${process.env.GOOGLE_CLIENT_EMAIL}`);

// Analyze the quota error
console.log('\n🔍 Quota Error Analysis:');
console.log('The "quota limits" error you\'re seeing can be caused by:');
console.log('');
console.log('1. 📊 Google Sheets API Quota Exceeded');
console.log('   - Google Sheets API has daily/per-minute limits');
console.log('   - Solution: Wait and try again, or check Google Cloud Console');
console.log('');
console.log('2. 🔐 Authentication Issues');
console.log('   - Service account not properly authenticated');
console.log('   - Private key format issues');
console.log('   - Solution: Verify credentials and permissions');
console.log('');
console.log('3. 📝 Sheet Permissions');
console.log('   - Google Sheet not shared with service account');
console.log('   - Service account lacks edit permissions');
console.log('   - Solution: Share sheet with service account email');
console.log('');
console.log('4. 🌐 Network/API Issues');
console.log('   - Temporary Google API outages');
console.log('   - Network connectivity problems');
console.log('   - Solution: Check Google API status, try again later');

// Provide specific troubleshooting steps
console.log('\n🛠️  Troubleshooting Steps:');
console.log('');
console.log('Step 1: Verify Google Sheet Permissions');
console.log(`- Open: https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/edit`);
console.log(`- Click "Share" button`);
console.log(`- Add: ${process.env.GOOGLE_CLIENT_EMAIL}`);
console.log(`- Give "Editor" permissions`);
console.log('');
console.log('Step 2: Check Google Cloud Console');
console.log('- Go to: https://console.cloud.google.com/');
console.log(`- Project: ${process.env.GOOGLE_PROJECT_ID}`);
console.log('- Navigate to: APIs & Services > Quotas');
console.log('- Check Google Sheets API quota usage');
console.log('');
console.log('Step 3: Test API Access');
console.log('- Try accessing the sheet manually in browser');
console.log('- Check if service account can read/write');
console.log('- Verify API is enabled in Google Cloud Console');
console.log('');
console.log('Step 4: Environment Variables (Vercel)');
console.log('- Go to Vercel Dashboard > Settings > Environment Variables');
console.log('- Ensure all 7 variables are set correctly');
console.log('- Deploy and test again');

// Check for common issues
console.log('\n⚠️  Common Issues:');
console.log('');
console.log('❌ Issue: "Failed to add user. This might be due to Google Sheets quota limits"');
console.log('✅ Solution: Usually a permissions or authentication issue, not actual quota');
console.log('');
console.log('❌ Issue: Data loading from localStorage instead of Google Sheets');
console.log('✅ Solution: Check environment variables and authentication');
console.log('');
console.log('❌ Issue: "Google Sheets not available" in logs');
console.log('✅ Solution: Environment variables missing or authentication failed');

// Next steps
console.log('\n🚀 Immediate Next Steps:');
console.log('');
console.log('1. 📋 Share Google Sheet with service account:');
console.log(`   Email: ${process.env.GOOGLE_CLIENT_EMAIL}`);
console.log(`   Sheet: https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/edit`);
console.log('');
console.log('2. 🔧 Set Vercel Environment Variables:');
console.log('   Run: npm run setup-vercel-env');
console.log('   Copy output to Vercel Dashboard');
console.log('');
console.log('3. 🧪 Test After Deployment:');
console.log('   Visit: https://your-app.vercel.app/api/test-env');
console.log('   Visit: https://your-app.vercel.app/api/verify-integration');
console.log('');
console.log('4. 📊 Monitor Logs:');
console.log('   Check Vercel deployment logs for specific errors');
console.log('   Look for authentication success/failure messages');

console.log('\n' + '='.repeat(50));
console.log('🎯 Summary: The issue is likely permissions or authentication,');
console.log('not actual Google Sheets quota limits. Follow the steps above');
console.log('to resolve the integration issues.');
console.log('='.repeat(50));
