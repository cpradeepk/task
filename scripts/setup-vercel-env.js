#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Script
 * 
 * This script helps set up the correct environment variables for Google Sheets integration on Vercel.
 * Run this script to automatically configure your Vercel deployment with the correct credentials.
 */

const fs = require('fs');
const path = require('path');

// Read the service account JSON file
const serviceAccountPath = path.join(__dirname, '..', 'task-management-449805-22c9d3067c88.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account JSON file not found!');
  console.error('Expected location:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Environment variables to set
const envVars = {
  GOOGLE_PROJECT_ID: serviceAccount.project_id,
  GOOGLE_CLIENT_EMAIL: serviceAccount.client_email,
  GOOGLE_CLIENT_ID: serviceAccount.client_id,
  GOOGLE_PRIVATE_KEY_ID: serviceAccount.private_key_id,
  GOOGLE_PRIVATE_KEY: serviceAccount.private_key,
  GOOGLE_CLIENT_CERT_URL: serviceAccount.client_x509_cert_url,
  GOOGLE_SHEET_ID: '1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98'
};

console.log('🔧 Vercel Environment Variables Setup');
console.log('=====================================\n');

console.log('📋 Copy and paste these environment variables into your Vercel Dashboard:');
console.log('Go to: Vercel Dashboard → Your Project → Settings → Environment Variables\n');

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`${key}:`);
  if (key === 'GOOGLE_PRIVATE_KEY') {
    console.log('```');
    console.log(value);
    console.log('```');
  } else {
    console.log(value);
  }
  console.log('');
});

console.log('⚠️  IMPORTANT NOTES:');
console.log('- For GOOGLE_PRIVATE_KEY: Copy the entire key including BEGIN/END lines');
console.log('- Do NOT add quotes around any values');
console.log('- Preserve all line breaks in the private key');
console.log('- Set all variables for Production, Preview, and Development environments');

// Create a .env.local file for local development
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envContent = Object.entries(envVars)
  .map(([key, value]) => {
    if (key === 'GOOGLE_PRIVATE_KEY') {
      // Escape the private key for .env file
      const escapedKey = value.replace(/\n/g, '\\n');
      return `${key}="${escapedKey}"`;
    }
    return `${key}="${value}"`;
  })
  .join('\n');

fs.writeFileSync(envLocalPath, envContent);
console.log(`\n✅ Created .env.local file for local development`);
console.log(`📁 Location: ${envLocalPath}`);

console.log('\n🚀 Next Steps:');
console.log('1. Copy the environment variables above to Vercel Dashboard');
console.log('2. Deploy your application to Vercel');
console.log('3. Test the integration using the verification endpoints');
console.log('4. Check the logs if any issues occur');

console.log('\n🔍 Verification Endpoints:');
console.log('- https://your-app.vercel.app/api/test-env');
console.log('- https://your-app.vercel.app/api/verify-sheet');
console.log('- https://your-app.vercel.app/api/debug/sheets');
