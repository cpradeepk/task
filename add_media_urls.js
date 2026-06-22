const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.rbckjkdohzbclomrufrx:W8zTtc%3EqL3%3F@aws-1-ap-south-1.pooler.supabase.com:6543/postgres'
  });
  
  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query('ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS media_urls JSONB');
    console.log('Added media_urls column to feed_posts');
    await client.end();
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

run();
