const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.rbckjkdohzbclomrufrx:W8zTtc%3EqL3%3F@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database');

        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS tab_permissions JSONB DEFAULT NULL;');
        console.log('Migration successful: Added tab_permissions column');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
