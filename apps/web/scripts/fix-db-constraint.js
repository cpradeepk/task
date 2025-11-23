const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string from src/lib/db/config.ts
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.rbckjkdohzbclomrufrx:W8zTtc%3EqL3%3F@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('Connected.');

        const sqlPath = path.join(__dirname, '../database/migrations/035_fix_personal_topics_constraint.sql');
        console.log(`Reading migration file: ${sqlPath}`);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');
        await client.query(sql);
        console.log('Migration applied successfully.');

        client.release();
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
