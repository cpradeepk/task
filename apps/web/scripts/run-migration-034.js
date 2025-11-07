const { Client } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function runMigration() {
  // Use connection pooler with SSL
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL database')

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '034_fix_feed_topics_unique_constraint.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('\n🔄 Running migration 034: Fix feed_topics unique constraint...\n')

    // Execute migration
    await client.query(migrationSQL)

    console.log('✅ Migration 034 completed successfully!')
    console.log('\nChanges made:')
    console.log('  - Dropped global UNIQUE constraint on topic_name')
    console.log('  - Added partial unique index for public topics')
    console.log('  - Added composite unique index for personal topics (per user)')
    console.log('  - Added composite unique index for saved topics (per user)')
    console.log('\nResult:')
    console.log('  ✅ Each user can now have their own "Personal Notes" topic')
    console.log('  ✅ Each user can now have their own "Saved Posts" topic')
    console.log('  ✅ Public topic names remain globally unique')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n✅ Database connection closed')
  }
}

runMigration()

