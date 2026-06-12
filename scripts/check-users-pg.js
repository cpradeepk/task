#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// 1. Manual .env.local parsing
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

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL');
        
        const res = await client.query('SELECT employee_id, name, email, role FROM users ORDER BY name');
        console.log('\n📊 Users in PostgreSQL database:');
        console.table(res.rows);
    } catch (err) {
        console.error('❌ Failed:', err);
    } finally {
        await client.end();
    }
}

main();
