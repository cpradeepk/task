const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.rbckjkdohzbclomrufrx:W8zTtc%3EqL3%3F@aws-1-ap-south-1.pooler.supabase.com:6543/postgres'
  });
  
  try {
    await client.connect();
    // insert a test row
    await client.query("INSERT INTO feed_posts (post_id, content_type, created_by, status, media_urls) VALUES ('test_123', 'text', 'EMP001', 'published', '[\"url1\", \"url2\"]') ON CONFLICT DO NOTHING");
    const res = await client.query('SELECT media_urls FROM feed_posts WHERE post_id = $1', ['test_123']);
    console.log(typeof res.rows[0].media_urls);
    console.log(Array.isArray(res.rows[0].media_urls));
    await client.query("DELETE FROM feed_posts WHERE post_id = 'test_123'");
    await client.end();
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

run();
