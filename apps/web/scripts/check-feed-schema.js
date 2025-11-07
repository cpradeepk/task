const { Client } = require('pg')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

async function checkSchema() {
  const connectionString = process.env.DATABASE_URL?.replace(':6543', ':5432').replace('?pgbouncer=true', '')
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    
    // Check feed_posts columns
    console.log('📋 Checking feed_posts schema...\n')
    const feedPostsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'feed_posts'
      ORDER BY ordinal_position
    `)
    
    console.log('feed_posts columns:')
    feedPostsResult.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(20)} ${row.data_type.padEnd(30)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })
    
    // Check if created_by exists
    const hasCreatedBy = feedPostsResult.rows.some(r => r.column_name === 'created_by')
    console.log(`\n✅ created_by column exists: ${hasCreatedBy}`)
    
    // Check activity_log schema
    console.log('\n📋 Checking activity_log schema...\n')
    const activityLogResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'activity_log'
      ORDER BY ordinal_position
    `)
    
    console.log('activity_log columns:')
    activityLogResult.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(20)} ${row.data_type.padEnd(30)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })
    
    // Check entity_type constraint
    console.log('\n📋 Checking activity_log entity_type constraint...\n')
    const constraintResult = await client.query(`
      SELECT con.conname, pg_get_constraintdef(con.oid) as definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'activity_log' AND con.contype = 'c'
    `)
    
    console.log('activity_log constraints:')
    constraintResult.rows.forEach(row => {
      console.log(`  ${row.conname}: ${row.definition}`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

checkSchema()

