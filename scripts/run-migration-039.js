const fs = require('fs')
const path = require('path')

// Manual .env parsing
const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local')
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
            const key = match[1].trim()
            const value = match[2].trim().replace(/^["']|["']$/g, '') // Remove quotes
            if (!process.env[key]) {
                process.env[key] = value
            }
        }
    })
}

// Require pg from root node_modules
const pgPath = path.join(__dirname, '..', 'node_modules', 'pg')
const { Client } = require(pgPath)

async function runMigration() {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
        console.error('❌ DATABASE_URL not found in environment')
        console.error('   Set it in apps/web/.env.local or pass it inline:')
        console.error('   DATABASE_URL="postgresql://..." node scripts/run-migration-039.js')
        process.exit(1)
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    })

    try {
        await client.connect()
        console.log('✅ Connected to PostgreSQL database')

        // Read migration file
        const migrationPath = path.join(__dirname, '..', 'apps', 'web', 'database', 'migrations', '039_enable_rls_public_schema.sql')
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

        console.log('\n🔄 Running migration 039: Enable RLS on all public schema tables...\n')

        // Execute migration
        const result = await client.query(migrationSQL)

        console.log('✅ Migration 039 completed successfully!')
        console.log('\nChanges made:')
        console.log('  - Enabled Row Level Security (RLS) on every table in the public schema')
        console.log('  - Anon and authenticated Supabase roles can no longer query these tables')
        console.log('  - The app continues to work because it uses the postgres role (which bypasses RLS)')

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
