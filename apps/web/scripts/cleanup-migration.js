#!/usr/bin/env node

/**
 * Cleanup Script: Remove temporary migration columns
 * 
 * This script removes any leftover columns from a failed migration attempt
 */

const mysql = require('mysql2/promise')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const DB_CONFIG = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
}

async function cleanup() {
  let connection

  try {
    console.log('🔵 Connecting to database...')
    connection = await mysql.createConnection(DB_CONFIG)
    console.log('✅ Connected to database')

    console.log('🔵 Cleaning up temporary columns...')
    
    // Drop temporary columns if they exist
    try {
      await connection.execute('ALTER TABLE tasks DROP COLUMN new_task_id')
      console.log('✅ Dropped tasks.new_task_id column')
    } catch (error) {
      if (error.message.includes("check that it exists")) {
        console.log('ℹ️  tasks.new_task_id column does not exist (already clean)')
      } else {
        throw error
      }
    }

    try {
      await connection.execute('ALTER TABLE bugs DROP COLUMN new_bug_id')
      console.log('✅ Dropped bugs.new_bug_id column')
    } catch (error) {
      if (error.message.includes("check that it exists")) {
        console.log('ℹ️  bugs.new_bug_id column does not exist (already clean)')
      } else {
        throw error
      }
    }

    console.log('')
    console.log('✅ Cleanup completed successfully!')
    console.log('✅ You can now run the migration script again')

  } catch (error) {
    console.error('')
    console.error('❌ Cleanup failed:', error.message)
    console.error('')
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔵 Database connection closed')
    }
  }
}

cleanup()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error)
    process.exit(1)
  })

