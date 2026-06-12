#!/usr/bin/env node

/**
 * ============================================================================
 * PostgreSQL User Checker Script
 * ============================================================================
 * 
 * DESCRIPTION:
 * Connects to the PostgreSQL database using settings defined in '.env.local' 
 * and outputs a structured table of all users registered in the system.
 * 
 * USE CASE:
 * Helps identify user employee_ids, emails, names, and roles, which is 
 * critical when targeting specific test users for notification tests.
 * 
 * RUNNING THE SCRIPT:
 * From the project root, run:
 * $ node scripts/check-users-pg.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// ============================================================================
// 1. ENVIRONMENT CONFIGURATION LOADING
// ============================================================================
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
    // Instantiate PostgreSQL client with parsed DATABASE_URL
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL');
        
        // Query employee_id, name, email, and role from users table, ordered by name
        const res = await client.query('SELECT employee_id, name, email, role FROM users ORDER BY name');
        console.log('\n📊 Users in PostgreSQL database:');
        console.table(res.rows);
    } catch (err) {
        console.error('❌ Failed to retrieve users:', err);
    } finally {
        await client.end();
    }
}

main();
