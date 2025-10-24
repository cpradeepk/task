#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Helper
 * Provides exact instructions for setting up Google Sheets integration on Vercel
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 VERCEL ENVIRONMENT VARIABLES SETUP');
console.log('=====================================\n');

// Read the service account JSON file
const serviceAccountPath = path.join(__dirname, '..', 'task-management-449805-22c9d3067c88.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account JSON file not found!');
  console.error('Expected location:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

console.log('📋 STEP 1: Go to Vercel Dashboard');
console.log('1. Login to https://vercel.com');
console.log('2. Select your project');
console.log('3. Go to Settings → Environment Variables');
console.log('');

console.log('📝 STEP 2: Add These Environment Variables');
console.log('Copy each variable name and value exactly as shown below:');
console.log('Set each variable for: Production, Preview, AND Development');
console.log('');

// Environment variables to set
const envVars = [
  {
    name: 'GOOGLE_PROJECT_ID',
    value: serviceAccount.project_id,
    description: 'Google Cloud Project ID'
  },
  {
    name: 'GOOGLE_CLIENT_EMAIL',
    value: serviceAccount.client_email,
    description: 'Service Account Email'
  },
  {
    name: 'GOOGLE_CLIENT_ID',
    value: serviceAccount.client_id,
    description: 'Service Account Client ID'
  },
  {
    name: 'GOOGLE_PRIVATE_KEY_ID',
    value: serviceAccount.private_key_id,
    description: 'Private Key ID'
  },
  {
    name: 'GOOGLE_CLIENT_CERT_URL',
    value: serviceAccount.client_x509_cert_url,
    description: 'Client Certificate URL'
  },
  {
    name: 'GOOGLE_SHEET_ID',
    value: '1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98',
    description: 'Google Sheets Spreadsheet ID'
  }
];

// Display regular variables
envVars.forEach((envVar, index) => {
  console.log(`${index + 1}. ${envVar.name}`);
  console.log(`   Description: ${envVar.description}`);
  console.log(`   Value: ${envVar.value}`);
  console.log('');
});

// Special handling for private key
console.log(`7. GOOGLE_PRIVATE_KEY`);
console.log(`   Description: Service Account Private Key (MOST CRITICAL)`);
console.log(`   Value: Copy the ENTIRE block below (including BEGIN/END lines):`);
console.log('');
console.log('   ┌─────────────────────────────────────────────────────────┐');
console.log('   │ COPY EVERYTHING BETWEEN THESE LINES (including markers) │');
console.log('   └─────────────────────────────────────────────────────────┘');
console.log('');
console.log(serviceAccount.private_key);
console.log('');
console.log('   ┌─────────────────────────────────────────────────────────┐');
console.log('   │ END OF PRIVATE KEY - COPY EVERYTHING ABOVE THIS LINE    │');
console.log('   └─────────────────────────────────────────────────────────┘');
console.log('');

console.log('⚠️  CRITICAL NOTES FOR PRIVATE KEY:');
console.log('- Copy the ENTIRE key including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----');
console.log('- Do NOT add quotes around the key in Vercel');
console.log('- Do NOT modify the formatting or line breaks');
console.log('- The key should be exactly as shown above');
console.log('');

console.log('🔧 STEP 3: Verify Setup');
console.log('After setting all variables in Vercel:');
console.log('1. Deploy your application (or trigger a redeploy)');
console.log('2. Test environment variables: https://your-app.vercel.app/api/vercel-env-check');
console.log('3. Test Google Sheets connection: https://your-app.vercel.app/api/verify-integration');
console.log('4. Test user data: https://your-app.vercel.app/api/users');
console.log('');

console.log('✅ SUCCESS INDICATORS:');
console.log('- /api/vercel-env-check shows "status": "SUCCESS"');
console.log('- /api/verify-integration shows "status": "SUCCESS"');
console.log('- /api/users shows "source": "google_sheets"');
console.log('');

console.log('🚨 TROUBLESHOOTING:');
console.log('If you get errors:');
console.log('1. Check Vercel deployment logs for specific error messages');
console.log('2. Verify all 7 variables are set for ALL environments');
console.log('3. Ensure private key format is exactly as shown above');
console.log('4. Make sure no quotes are added around any values');
console.log('');

console.log('📞 NEED HELP?');
console.log('- Check the deployment logs in Vercel Dashboard');
console.log('- Use /api/vercel-env-check to diagnose issues');
console.log('- Verify the Google Sheet is shared with the service account');
console.log('');

console.log('🎯 SUMMARY:');
console.log('Set all 7 environment variables in Vercel Dashboard exactly as shown above.');
console.log('The most common issue is the private key format - copy it exactly!');
console.log('');
console.log('🚀 Ready to deploy! Your Google Sheets integration will work on Vercel.');

// Create a summary file for reference
const summaryPath = path.join(__dirname, '..', 'vercel-env-summary.txt');
const summaryContent = `VERCEL ENVIRONMENT VARIABLES SUMMARY
Generated: ${new Date().toISOString()}

Set these 7 variables in Vercel Dashboard (Settings → Environment Variables):

${envVars.map(env => `${env.name}=${env.value}`).join('\n')}
GOOGLE_PRIVATE_KEY=${serviceAccount.private_key}

IMPORTANT:
- Set for Production, Preview, AND Development
- Copy private key exactly including BEGIN/END markers
- No quotes around any values
- Deploy after setting variables

Test URLs after deployment:
- https://your-app.vercel.app/api/vercel-env-check
- https://your-app.vercel.app/api/verify-integration
- https://your-app.vercel.app/api/users
`;

fs.writeFileSync(summaryPath, summaryContent);
console.log(`📄 Summary saved to: ${summaryPath}`);
