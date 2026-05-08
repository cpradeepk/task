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
            const value = match[2].trim().replace(/^["']|["']$/g, '')
            if (!process.env[key]) {
                process.env[key] = value
            }
        }
    })
}

const pgPath = path.join(__dirname, '..', 'node_modules', 'pg')
const { Client } = require(pgPath)

async function runMigration() {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
        console.error('❌ DATABASE_URL not found in environment')
        console.error('   Set it in apps/web/.env.local or pass it inline:')
        console.error('   DATABASE_URL="postgresql://..." node scripts/run-migration-040.js')
        process.exit(1)
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    })

    try {
        await client.connect()
        console.log('✅ Connected to PostgreSQL database')

        const migrationPath = path.join(__dirname, '..', 'apps', 'web', 'database', 'migrations', '040_consolidate_tab_permissions.sql')
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

        console.log('\n🔄 Running migration 040: Consolidate tab_permissions records...\n')

        await client.query(migrationSQL)

        console.log('✅ Migration 040 completed successfully!')
        console.log('\nChanges made:')
        console.log('  - Replaced "users" permission with "user_management" in tab_permissions arrays')
        console.log('  - Removed "master_tasks" and "master_development" from tab_permissions arrays')
        console.log('  - Same cleanup applied to role_permissions table (if it exists)')

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
