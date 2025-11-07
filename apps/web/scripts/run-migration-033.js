const { Client } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

async function runMigration() {
  // Use direct connection (port 5432) for migrations, not pooler
  const connectionString = process.env.DATABASE_URL?.replace(':6543', ':5432').replace('?pgbouncer=true', '')
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables')
    process.exit(1)
  }

  console.log('🔄 Connecting to PostgreSQL database...')
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/033_fix_feed_schema_postgresql.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('🔄 Running migration 033: Fix Feed Schema...')
    
    // Execute migration
    await client.query(migrationSQL)
    
    console.log('✅ Migration 033 completed successfully!')

    // Verify the schema
    console.log('\n🔍 Verifying feed_posts schema...')
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'feed_posts'
      ORDER BY ordinal_position
    `)
    
    console.log('\nfeed_posts columns:')
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n✅ Database connection closed')
  }
}

runMigration()

