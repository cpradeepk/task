#!/usr/bin/env node

/**
 * PostgreSQL Single Migration Runner
 * Usage: node scripts/run-single-migration-postgresql.js <migration-file-name>
 */

const fs = require('fs')
const path = require('path')

// Manual .env.local parsing
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
let Client
try {
    Client = require(pgPath).Client
} catch (e) {
    Client = require('pg').Client
}

const filename = process.argv[2]
if (!filename) {
    console.error('❌ Please provide a migration filename')
    console.error('Usage: node scripts/run-single-migration-postgresql.js <migration-file-name>')
    console.error('Example: node scripts/run-single-migration-postgresql.js 041_add_task_time_fields.sql')
    process.exit(1)
}

async function runMigration() {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
        console.error('❌ DATABASE_URL not found in environment or apps/web/.env.local')
        process.exit(1)
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    })

    try {
        await client.connect()
        console.log('✅ Connected to PostgreSQL database')

        const migrationPath = path.join(__dirname, '..', 'apps', 'web', 'database', 'migrations', filename)
        
        if (!fs.existsSync(migrationPath)) {
            console.error(`❌ Migration file not found: ${migrationPath}`)
            process.exit(1)
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

        console.log(`\n🔄 Running migration: ${filename}...\n`)

        await client.query(migrationSQL)

        console.log(`✅ Migration ${filename} completed successfully!`)

    } catch (error) {
        console.error('❌ Migration failed:', error.message)
        process.exit(1)
    } finally {
        await client.end()
        console.log('\n✅ Database connection closed')
    }
}

runMigration()
