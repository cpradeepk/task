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
    // Use connection pooler with SSL
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
        console.error('❌ DATABASE_URL not found in environment')
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
        const migrationPath = path.join(__dirname, '..', 'apps', 'web', 'database', 'migrations', '038_create_project_users_table.sql')
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

        console.log('\n🔄 Running migration 038: Create project_users table...\n')

        // Execute migration
        await client.query(migrationSQL)

        console.log('✅ Migration 038 completed successfully!')
        console.log('\nChanges made:')
        console.log('  - Created project_users junction table')
        console.log('  - Added foreign keys (project_id, employee_id, assigned_by)')
        console.log('  - Added indexes for project_id, employee_id, assigned_by')
        console.log('  - Added unique constraint on (project_id, employee_id)')

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
