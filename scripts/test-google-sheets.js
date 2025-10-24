#!/usr/bin/env node

/**
 * Direct Google Sheets Connection Test
 * Tests the Google Sheets integration without running the full Next.js server
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if it exists
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
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
  console.log('✅ Loaded environment variables from .env.local');
} else {
  console.log('⚠️  No .env.local file found');
}

async function testGoogleSheetsConnection() {
  console.log('🔍 Testing Google Sheets Connection');
  console.log('=====================================\n');

  // Step 1: Check environment variables
  console.log('📋 Step 1: Environment Variables Check');
  const requiredVars = [
    'GOOGLE_PROJECT_ID',
    'GOOGLE_CLIENT_EMAIL', 
    'GOOGLE_CLIENT_ID',
    'GOOGLE_PRIVATE_KEY_ID',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_CERT_URL'
  ];

  const envStatus = {};
  let allPresent = true;

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    const isPresent = !!value;
    const isValid = isPresent && !value.includes('your-') && !value.includes('placeholder');
    
    envStatus[varName] = {
      present: isPresent,
      valid: isValid,
      length: value ? value.length : 0
    };

    if (varName === 'GOOGLE_PRIVATE_KEY') {
      envStatus[varName].hasBeginMarker = value ? value.includes('-----BEGIN PRIVATE KEY-----') : false;
      envStatus[varName].hasEndMarker = value ? value.includes('-----END PRIVATE KEY-----') : false;
      envStatus[varName].preview = value ? value.substring(0, 50) + '...' : '';
    }

    console.log(`${isValid ? '✅' : '❌'} ${varName}: ${isPresent ? 'Present' : 'Missing'} ${isValid ? '(Valid)' : '(Invalid/Placeholder)'}`);
    
    if (!isValid) allPresent = false;
  });

  if (!allPresent) {
    console.log('\n❌ Environment variables are missing or invalid!');
    console.log('Run: npm run setup-vercel-env');
    console.log('Then set the variables in your Vercel Dashboard or .env.local file');
    return false;
  }

  console.log('\n✅ All environment variables are present and valid');

  // Step 2: Test Google Sheets API
  console.log('\n📊 Step 2: Google Sheets API Test');
  
  try {
    // Import googleapis
    const { google } = require('googleapis');
    
    // Create auth client
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    console.log('🔑 Authenticating with Google Sheets API...');
    await auth.authorize();
    console.log('✅ Authentication successful');

    // Create sheets client
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Test connection to the specific spreadsheet
    const spreadsheetId = '1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98';
    console.log(`🔗 Testing connection to spreadsheet: ${spreadsheetId}`);
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties.title'
    });

    console.log('✅ Successfully connected to Google Sheets!');
    console.log(`📋 Spreadsheet: ${response.data.properties?.title}`);
    console.log(`📄 Available sheets: ${response.data.sheets?.map(s => s.properties?.title).join(', ')}`);

    // Test reading user data
    console.log('\n👥 Step 3: Testing User Data Access');
    try {
      const userResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'UserDetails!A:O'
      });

      const rows = userResponse.data.values || [];
      console.log(`✅ Successfully read ${rows.length} rows from UserDetails sheet`);
      
      if (rows.length > 1) {
        console.log(`📊 Headers: ${rows[0].join(', ')}`);
        console.log(`👤 Sample user data: ${rows[1] ? rows[1].slice(0, 3).join(', ') + '...' : 'No user data'}`);
      }

      return true;
    } catch (userError) {
      console.error('❌ Failed to read user data:', userError.message);
      return false;
    }

  } catch (error) {
    console.error('❌ Google Sheets API test failed:', error.message);
    
    if (error.message.includes('quota')) {
      console.log('\n💡 This appears to be a quota limit issue.');
      console.log('Solutions:');
      console.log('1. Wait a few minutes and try again');
      console.log('2. Check your Google Cloud Console for quota limits');
      console.log('3. Ensure the service account has proper permissions');
    } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
      console.log('\n💡 This appears to be a permissions issue.');
      console.log('Solutions:');
      console.log('1. Share the Google Sheet with the service account email');
      console.log('2. Give the service account "Editor" permissions');
      console.log('3. Check that the sheet ID is correct');
    } else if (error.message.includes('private key')) {
      console.log('\n💡 This appears to be a private key format issue.');
      console.log('Solutions:');
      console.log('1. Ensure the private key includes BEGIN/END markers');
      console.log('2. Check that line breaks are preserved');
      console.log('3. Verify no extra quotes or escaping');
    }
    
    return false;
  }
}

// Run the test
testGoogleSheetsConnection()
  .then(success => {
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('🎉 Google Sheets integration is working correctly!');
      console.log('Your Vercel deployment should work with these settings.');
    } else {
      console.log('❌ Google Sheets integration has issues that need to be resolved.');
      console.log('Please fix the issues above before deploying to Vercel.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
