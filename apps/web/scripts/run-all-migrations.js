#!/usr/bin/env node

/**
 * Run All Required Migrations
 * 
 * This script ensures all required tables and fields exist in the production database.
 * It's safe to run multiple times (idempotent).
 * 
 * Usage:
 *   node scripts/run-all-migrations.js
 */

const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

// Database configuration from environment variables
// Support both DB_* and MYSQL_* prefixes
const DB_CONFIG = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  port: process.env.DB_PORT || process.env.MYSQL_PORT || 3306,
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'jsr_db',
  multipleStatements: true
}

async function runAllMigrations() {
  let connection

  try {
    console.log('🔌 Connecting to database...')
    console.log(`   Host: ${DB_CONFIG.host}`)
    console.log(`   Database: ${DB_CONFIG.database}`)
    
    connection = await mysql.createConnection(DB_CONFIG)
    console.log('✅ Connected to database\n')

    // ========================================================================
    // Migration 1: Ensure activity_log table exists
    // ========================================================================
    console.log('📝 Migration 1: Checking activity_log table...')
    
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'activity_log'"
    )
    
    if (tables.length === 0) {
      console.log('   Creating activity_log table...')
      
      const migrationPath = path.join(__dirname, '../database/migrations/011_activity_log_table.sql')
      const sql = fs.readFileSync(migrationPath, 'utf8')
      
      // Remove verification queries
      const cleanSql = sql.split('-- Verification Queries')[0]
      
      await connection.query(cleanSql)
      console.log('   ✅ Activity log table created')
    } else {
      console.log('   ✅ Activity log table already exists')
    }

    // ========================================================================
    // Migration 2: Ensure timer fields exist in tasks table
    // ========================================================================
    console.log('\n📝 Migration 2: Checking timer fields in tasks table...')
    
    const [tasksColumns] = await connection.query(
      "SHOW COLUMNS FROM tasks WHERE Field LIKE 'timer%'"
    )
    
    if (tasksColumns.length < 5) {
      console.log('   Adding missing timer fields to tasks table...')
      
      if (!tasksColumns.find(col => col.Field === 'timer_state')) {
        await connection.query('ALTER TABLE tasks ADD COLUMN timer_state VARCHAR(50)')
        console.log('   ✅ Added timer_state')
      }
      
      if (!tasksColumns.find(col => col.Field === 'timer_start_time')) {
        await connection.query('ALTER TABLE tasks ADD COLUMN timer_start_time TIMESTAMP NULL')
        console.log('   ✅ Added timer_start_time')
      }
      
      if (!tasksColumns.find(col => col.Field === 'timer_paused_time')) {
        await connection.query('ALTER TABLE tasks ADD COLUMN timer_paused_time BIGINT')
        console.log('   ✅ Added timer_paused_time')
      }
      
      if (!tasksColumns.find(col => col.Field === 'timer_total_time')) {
        await connection.query('ALTER TABLE tasks ADD COLUMN timer_total_time BIGINT')
        console.log('   ✅ Added timer_total_time')
      }
      
      if (!tasksColumns.find(col => col.Field === 'timer_sessions')) {
        await connection.query('ALTER TABLE tasks ADD COLUMN timer_sessions JSON')
        console.log('   ✅ Added timer_sessions')
      }
    } else {
      console.log('   ✅ All timer fields already exist in tasks table')
    }

    // ========================================================================
    // Migration 3: Ensure timer fields exist in bugs table
    // ========================================================================
    console.log('\n📝 Migration 3: Checking timer fields in bugs table...')
    
    const [bugsColumns] = await connection.query(
      "SHOW COLUMNS FROM bugs WHERE Field LIKE 'timer%'"
    )
    
    if (bugsColumns.length < 5) {
      console.log('   Adding missing timer fields to bugs table...')
      
      if (!bugsColumns.find(col => col.Field === 'timer_state')) {
        await connection.query('ALTER TABLE bugs ADD COLUMN timer_state VARCHAR(50)')
        console.log('   ✅ Added timer_state')
      }
      
      if (!bugsColumns.find(col => col.Field === 'timer_start_time')) {
        await connection.query('ALTER TABLE bugs ADD COLUMN timer_start_time TIMESTAMP NULL')
        console.log('   ✅ Added timer_start_time')
      }
      
      if (!bugsColumns.find(col => col.Field === 'timer_paused_time')) {
        await connection.query('ALTER TABLE bugs ADD COLUMN timer_paused_time BIGINT')
        console.log('   ✅ Added timer_paused_time')
      }
      
      if (!bugsColumns.find(col => col.Field === 'timer_total_time')) {
        await connection.query('ALTER TABLE bugs ADD COLUMN timer_total_time BIGINT')
        console.log('   ✅ Added timer_total_time')
      }
      
      if (!bugsColumns.find(col => col.Field === 'timer_sessions')) {
        await connection.query('ALTER TABLE bugs ADD COLUMN timer_sessions JSON')
        console.log('   ✅ Added timer_sessions')
      }
    } else {
      console.log('   ✅ All timer fields already exist in bugs table')
    }

    // ========================================================================
    // Migration 4: Add indexes for performance
    // ========================================================================
    console.log('\n📝 Migration 4: Adding indexes...')
    
    const indexes = [
      { table: 'tasks', name: 'idx_tasks_timer_state', column: 'timer_state' },
      { table: 'tasks', name: 'idx_tasks_timer_start_time', column: 'timer_start_time' },
      { table: 'bugs', name: 'idx_bugs_timer_state', column: 'timer_state' },
      { table: 'bugs', name: 'idx_bugs_timer_start_time', column: 'timer_start_time' }
    ]
    
    for (const index of indexes) {
      try {
        await connection.query(`CREATE INDEX ${index.name} ON ${index.table}(${index.column})`)
        console.log(`   ✅ Added index ${index.name}`)
      } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME') {
          console.log(`   ℹ️  Index ${index.name} already exists`)
        } else {
          throw err
        }
      }
    }

    // ========================================================================
    // Final Verification
    // ========================================================================
    console.log('\n📊 Final Verification:')
    
    const [finalTables] = await connection.query("SHOW TABLES")
    const tableNames = finalTables.map(t => Object.values(t)[0])
    
    console.log('   ✅ activity_log table:', tableNames.includes('activity_log') ? 'EXISTS' : 'MISSING')
    console.log('   ✅ tasks timer fields:', tasksColumns.length >= 5 ? 'EXISTS' : 'MISSING')
    console.log('   ✅ bugs timer fields:', bugsColumns.length >= 5 ? 'EXISTS' : 'MISSING')

    console.log('\n✅ All migrations completed successfully!')
    console.log('\n🎉 Database is ready for timer functionality!')

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

// Run all migrations
runAllMigrations()

