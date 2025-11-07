const { Client } = require('pg')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

async function verifySchema() {
  const connectionString = process.env.DATABASE_URL?.replace(':6543', ':5432').replace('?pgbouncer=true', '')
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    
    // Check feed_comments columns
    console.log('📋 Checking feed_comments schema...\n')
    const commentsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'feed_comments'
      ORDER BY ordinal_position
    `)
    
    console.log('feed_comments columns:')
    commentsResult.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(20)} ${row.data_type.padEnd(30)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })
    
    const hasCreatedBy = commentsResult.rows.some(r => r.column_name === 'created_by')
    const hasContent = commentsResult.rows.some(r => r.column_name === 'content')
    console.log(`\n✅ created_by column exists: ${hasCreatedBy}`)
    console.log(`✅ content column exists: ${hasContent}`)
    
    // Check feed_post_topics columns
    console.log('\n📋 Checking feed_post_topics schema...\n')
    const topicsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'feed_post_topics'
      ORDER BY ordinal_position
    `)
    
    console.log('feed_post_topics columns:')
    topicsResult.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(20)} ${row.data_type.padEnd(30)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

verifySchema()

