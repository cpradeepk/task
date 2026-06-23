const { Pool } = require('pg');

async function checkProjectUsers() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres.rbckjkdohzbclomrufrx:W8zTtc%3EqL3%3F@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query("SELECT * FROM project_users");
    console.log('Project users count:', res.rows.length);
    console.log('Project users:');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkProjectUsers();
