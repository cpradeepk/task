#!/usr/bin/env node

/**
 * ============================================================================
 * Karmayog In-App Notification Test Script
 * ============================================================================
 * 
 * DESCRIPTION:
 * This script inserts a dummy in-app notification directly into the 
 * PostgreSQL 'feed_notifications' table for the user 'Keval' (employee_id: AM-0012).
 * 
 * USE CASE:
 * Useful for verifying that:
 * 1. Notifications are stored correctly in the database schema.
 * 2. The front-end application (web or mobile) reads, fetches, and increments 
 *    the notification bell count correctly.
 * 
 * PREREQUISITES:
 * 1. A valid PostgreSQL 'DATABASE_URL' defined in 'apps/web/.env.local'.
 * 
 * RUNNING THE SCRIPT:
 * From the project root, run:
 * $ node scripts/test-in-app-notification.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// ============================================================================
// 1. ENVIRONMENT CONFIGURATION LOADING
// ============================================================================
// Parse apps/web/.env.local to resolve DATABASE_URL for Postgres connection
const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    });
}

// ============================================================================
// 2. MAIN EXECUTION FLOW
// ============================================================================
async function main() {
    // Instantiate PostgreSQL client with SSL requirements (Supabase expects SSL)
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const targetUserId = 'AM-0012'; // Keval / kbshah98@gmail.com
    const actorId = 'AM-0001';      // Pradeep Chandrasekar (User triggering notification)
    const notificationId = `NOTIF-TEST-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    console.log(`🔌 Connecting to database...`);
    
    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL');

        // Confirm target recipient profile exists in the users table
        const userCheck = await client.query('SELECT name FROM users WHERE employee_id = $1', [targetUserId]);
        if (userCheck.rows.length === 0) {
            console.error(`❌ Target user ${targetUserId} not found in database.`);
            process.exit(1);
        }
        const targetUserName = userCheck.rows[0].name;
        console.log(`👤 Found target user: ${targetUserName} (${targetUserId})`);

        // Resolve actor user's display name
        const actorCheck = await client.query('SELECT name FROM users WHERE employee_id = $1', [actorId]);
        const actorName = actorCheck.rows.length > 0 ? actorCheck.rows[0].name : 'System';
        console.log(`👤 Actor: ${actorName} (${actorId})`);

        const title = 'Test In-App Notification 🚀';
        const message = `This is a test notification generated on ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST to verify that in-app alerts are working perfectly.`;
        const linkUrl = '/feed';
        const notificationType = 'comment';

        console.log(`📥 Inserting in-app notification record...`);
        // Prepare database parameters and execute insert statement
        const query = `
            INSERT INTO feed_notifications (
                notification_id, user_id, actor_id, notification_type,
                title, message, link_url, is_read, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, CURRENT_TIMESTAMP)
            RETURNING notification_id, created_at;
        `;
        
        const res = await client.query(query, [
            notificationId,
            targetUserId,
            actorId,
            notificationType,
            title,
            message,
            linkUrl
        ]);

        console.log(`\n🎉 In-app notification created successfully!`);
        console.log(`   ID:         ${res.rows[0].notification_id}`);
        console.log(`   Recipient:  ${targetUserName}`);
        console.log(`   Title:      ${title}`);
        console.log(`   Message:    ${message}`);
        console.log(`   Created At: ${res.rows[0].created_at}`);

        // Read and list the last 3 notifications for the recipient to verify order and read status
        const listRes = await client.query(
            'SELECT notification_id, title, is_read, created_at FROM feed_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3',
            [targetUserId]
        );
        console.log(`\n🔔 Last 3 notifications for ${targetUserName}:`);
        console.table(listRes.rows);

    } catch (err) {
        console.error('❌ Database operation failed:', err);
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed.');
    }
}

main();
