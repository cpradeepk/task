#!/usr/bin/env node

/**
 * Run Migration 013: Ensure timer fields exist
 * 
 * This script adds timer fields to tasks and bugs tables if they don't exist.
 * It's safe to run multiple times (idempotent).
 * 
 * Usage:
 *   node scripts/run-migration-013.js
 */

const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

// Database configuration from environment variables
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jsr_db',
  multipleStatements: true
}

async function runMigration() {
  let connection

  try {
    console.log('🔌 Connecting to database...')
    console.log(`   Host: ${DB_CONFIG.host}`)
    console.log(`   Database: ${DB_CONFIG.database}`)
    
    connection = await mysql.createConnection(DB_CONFIG)
    console.log('✅ Connected to database\n')

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/013_ensure_timer_fields_exist.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    console.log('📝 Running migration 013: Ensure timer fields exist...\n')

    // Split SQL into individual statements (MySQL doesn't support IF NOT EXISTS in ALTER TABLE)
    // We'll need to check and add columns manually
    
    // Check tasks table
    console.log('🔍 Checking tasks table for timer fields...')
    const [tasksColumns] = await connection.query(
      "SHOW COLUMNS FROM tasks WHERE Field LIKE 'timer%'"
    )
    console.log(`   Found ${tasksColumns.length} timer columns in tasks table`)

    if (tasksColumns.length < 5) {
      console.log('   Adding missing timer fields to tasks table...')
      
      // Add timer_state if missing
      if (!tasksColumns.find(col => col.Field === 'timer_state')) {
        await connection.query('ALTER TABLE tasks ADD COLUMN timer_state VARCHAR(50)')
        console.log('   ✅ Added timer_state')
      }
      
      // Add timer_start_time if missing
      if (!tasksColumns.find(col => col.Field === 'timer_start_time')) {
        await connection.query('ALTER TABLE tasks ADD COLUMN timer_start_time TIMESTAMP NULL')
        console.log('   ✅ Added timer_start_time')
      }
      
      // Add timer_paused_time if missing
      if (!tasksColumns.find(col => col.Field === 'timer_paused_time')) {
        await connection.query('ALTER TABLE tasks ADD COLUMN timer_paused_time BIGINT')
        console.log('   ✅ Added timer_paused_time')
      }
      
      // Add timer_total_time if missing
      if (!tasksColumns.find(col => col.Field === 'timer_total_time')) {
        await connection.query('ALTER TABLE tasks ADD COLUMN timer_total_time BIGINT')
        console.log('   ✅ Added timer_total_time')
      }
      
      // Add timer_sessions if missing
      if (!tasksColumns.find(col => col.Field === 'timer_sessions')) {
        await connection.query('ALTER TABLE tasks ADD COLUMN timer_sessions JSON')
        console.log('   ✅ Added timer_sessions')
      }
    } else {
      console.log('   ✅ All timer fields already exist in tasks table')
    }

    // Check bugs table
    console.log('\n🔍 Checking bugs table for timer fields...')
    const [bugsColumns] = await connection.query(
      "SHOW COLUMNS FROM bugs WHERE Field LIKE 'timer%'"
    )
    console.log(`   Found ${bugsColumns.length} timer columns in bugs table`)

    if (bugsColumns.length < 5) {
      console.log('   Adding missing timer fields to bugs table...')
      
      // Add timer_state if missing
      if (!bugsColumns.find(col => col.Field === 'timer_state')) {
        await connection.query('ALTER TABLE bugs ADD COLUMN timer_state VARCHAR(50)')
        console.log('   ✅ Added timer_state')
      }
      
      // Add timer_start_time if missing
      if (!bugsColumns.find(col => col.Field === 'timer_start_time')) {
        await connection.query('ALTER TABLE bugs ADD COLUMN timer_start_time TIMESTAMP NULL')
        console.log('   ✅ Added timer_start_time')
      }
      
      // Add timer_paused_time if missing
      if (!bugsColumns.find(col => col.Field === 'timer_paused_time')) {
        await connection.query('ALTER TABLE bugs ADD COLUMN timer_paused_time BIGINT')
        console.log('   ✅ Added timer_paused_time')
      }
      
      // Add timer_total_time if missing
      if (!bugsColumns.find(col => col.Field === 'timer_total_time')) {
        await connection.query('ALTER TABLE bugs ADD COLUMN timer_total_time BIGINT')
        console.log('   ✅ Added timer_total_time')
      }
      
      // Add timer_sessions if missing
      if (!bugsColumns.find(col => col.Field === 'timer_sessions')) {
        await connection.query('ALTER TABLE bugs ADD COLUMN timer_sessions JSON')
        console.log('   ✅ Added timer_sessions')
      }
    } else {
      console.log('   ✅ All timer fields already exist in bugs table')
    }

    // Add indexes
    console.log('\n🔍 Adding indexes...')
    
    try {
      await connection.query('CREATE INDEX idx_tasks_timer_state ON tasks(timer_state)')
      console.log('   ✅ Added index idx_tasks_timer_state')
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('   ℹ️  Index idx_tasks_timer_state already exists')
      } else {
        throw err
      }
    }

    try {
      await connection.query('CREATE INDEX idx_tasks_timer_start_time ON tasks(timer_start_time)')
      console.log('   ✅ Added index idx_tasks_timer_start_time')
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('   ℹ️  Index idx_tasks_timer_start_time already exists')
      } else {
        throw err
      }
    }

    try {
      await connection.query('CREATE INDEX idx_bugs_timer_state ON bugs(timer_state)')
      console.log('   ✅ Added index idx_bugs_timer_state')
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('   ℹ️  Index idx_bugs_timer_state already exists')
      } else {
        throw err
      }
    }

    try {
      await connection.query('CREATE INDEX idx_bugs_timer_start_time ON bugs(timer_start_time)')
      console.log('   ✅ Added index idx_bugs_timer_start_time')
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('   ℹ️  Index idx_bugs_timer_start_time already exists')
      } else {
        throw err
      }
    }

    console.log('\n✅ Migration 013 completed successfully!')
    console.log('\n📊 Summary:')
    console.log('   - Timer fields added to tasks table (if missing)')
    console.log('   - Timer fields added to bugs table (if missing)')
    console.log('   - Indexes created for timer queries')
    console.log('\n🎉 Timer functionality is now ready to use!')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error('\nError details:', error)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔌 Database connection closed')
    }
  }
}

// Run the migration
runMigration()

