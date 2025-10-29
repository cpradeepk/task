#!/usr/bin/env node

/**
 * Migration Script: Convert Task and Bug IDs to Sequential Format
 * 
 * This script migrates existing task and bug IDs from timestamp-based format
 * (JSR-1735123456789001234) to sequential alphanumeric format (JSR-0001, JSR-0002, etc.)
 * 
 * IMPORTANT: 
 * - Backup your database before running this script!
 * - This script will update all task and bug IDs and their references
 * - Run this script only once
 * 
 * Usage:
 *   node scripts/migrate-to-sequential-ids.js
 */

const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const DB_CONFIG = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  multipleStatements: true
}

async function runMigration() {
  let connection

  try {
    console.log('🔵 Connecting to database...')
    connection = await mysql.createConnection(DB_CONFIG)
    console.log('✅ Connected to database')

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/migrations/014_migrate_to_sequential_ids.sql')
    console.log('🔵 Reading migration file:', migrationPath)
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Remove comments and split into individual statements
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    console.log(`🔵 Found ${statements.length} SQL statements to execute`)
    console.log('')
    console.log('⚠️  WARNING: This will modify all task and bug IDs in the database!')
    console.log('⚠️  Make sure you have a backup before proceeding!')
    console.log('')

    // Execute each statement
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--')) {
        continue
      }

      try {
        // Show progress for important steps
        if (statement.includes('CREATE TEMPORARY TABLE')) {
          console.log(`🔵 [${i + 1}/${statements.length}] Creating temporary mapping tables...`)
        } else if (statement.includes('INSERT INTO task_id_mapping')) {
          console.log(`🔵 [${i + 1}/${statements.length}] Generating sequential task IDs...`)
        } else if (statement.includes('INSERT INTO bug_id_mapping')) {
          console.log(`🔵 [${i + 1}/${statements.length}] Generating sequential bug IDs...`)
        } else if (statement.includes('UPDATE tasks t') && statement.includes('new_task_id')) {
          console.log(`🔵 [${i + 1}/${statements.length}] Updating tasks with new IDs...`)
        } else if (statement.includes('UPDATE bugs b') && statement.includes('new_bug_id')) {
          console.log(`🔵 [${i + 1}/${statements.length}] Updating bugs with new IDs...`)
        } else if (statement.includes('UPDATE activity_log')) {
          console.log(`🔵 [${i + 1}/${statements.length}] Updating activity log references...`)
        } else if (statement.includes('SET FOREIGN_KEY_CHECKS')) {
          console.log(`🔵 [${i + 1}/${statements.length}] ${statement.includes('= 0') ? 'Disabling' : 'Enabling'} foreign key checks...`)
        } else if (statement.includes('UPDATE tasks SET task_id = new_task_id')) {
          console.log(`🔵 [${i + 1}/${statements.length}] Applying new task IDs (primary key update)...`)
        } else if (statement.includes('UPDATE bugs SET bug_id = new_bug_id')) {
          console.log(`🔵 [${i + 1}/${statements.length}] Applying new bug IDs (primary key update)...`)
        } else if (statement.includes('DROP')) {
          console.log(`🔵 [${i + 1}/${statements.length}] Cleaning up temporary tables...`)
        }

        await connection.execute(statement)
        successCount++
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message)
        console.error('Statement:', statement.substring(0, 100) + '...')
        errorCount++
        
        // Don't stop on SELECT errors (verification queries)
        if (!statement.trim().toUpperCase().startsWith('SELECT')) {
          throw error
        }
      }
    }

    console.log('')
    console.log('✅ Migration completed successfully!')
    console.log(`   - ${successCount} statements executed`)
    console.log(`   - ${errorCount} errors (verification queries)`)
    console.log('')

    // Verify the migration
    console.log('🔵 Verifying migration results...')
    console.log('')

    // Check task IDs
    const [tasks] = await connection.execute(
      'SELECT task_id, description, created_at FROM tasks WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 5'
    )
    console.log('📋 Sample Task IDs (first 5):')
    tasks.forEach((task, i) => {
      console.log(`   ${i + 1}. ${task.task_id} - ${task.description.substring(0, 50)}...`)
    })
    console.log('')

    // Check bug IDs
    const [bugs] = await connection.execute(
      'SELECT bug_id, title, created_at FROM bugs WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 5'
    )
    console.log('🐛 Sample Bug IDs (first 5):')
    if (bugs.length > 0) {
      bugs.forEach((bug, i) => {
        console.log(`   ${i + 1}. ${bug.bug_id} - ${bug.title.substring(0, 50)}...`)
      })
    } else {
      console.log('   (No bugs found)')
    }
    console.log('')

    // Count totals
    const [taskCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM tasks WHERE deleted_at IS NULL'
    )
    const [bugCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM bugs WHERE deleted_at IS NULL'
    )
    
    console.log('📊 Migration Summary:')
    console.log(`   - Total tasks migrated: ${taskCount[0].count}`)
    console.log(`   - Total bugs migrated: ${bugCount[0].count}`)
    console.log('')
    console.log('✅ All IDs have been successfully migrated to sequential format!')
    console.log('✅ New tasks and bugs will use the sequential format (JSR-0001, BUG-0001, etc.)')
    console.log('')

  } catch (error) {
    console.error('')
    console.error('❌ Migration failed:', error.message)
    console.error('')
    console.error('Stack trace:', error.stack)
    console.error('')
    console.error('⚠️  Please restore from backup and check the error above.')
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔵 Database connection closed')
    }
  }
}

// Run the migration
console.log('')
console.log('=' .repeat(70))
console.log('  TASK & BUG ID MIGRATION TO SEQUENTIAL FORMAT')
console.log('=' .repeat(70))
console.log('')

runMigration()
  .then(() => {
    console.log('🎉 Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })

