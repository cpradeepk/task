const { Pool } = require('pg');

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.rbckjkdohzbclomrufrx:W8zTtc%3EqL3%3F@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_notification_preferences'
    `);
    console.log('Columns in user_notification_preferences:');
    console.log(res.rows);

    const tasksCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tasks'
    `);
    console.log('Columns in tasks:');
    console.log(tasksCols.rows.map(r => `${r.column_name} (${r.data_type})`));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
