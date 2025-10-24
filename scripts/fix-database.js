#!/usr/bin/env node

/**
 * Database Cleanup Script
 * Fixes corrupted support field in tasks table
 */

const mysql = require('mysql2/promise')

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'u806435594_swarg',
  password: process.env.MYSQL_PASSWORD || 'W8zTtc>qL3?',
  database: process.env.MYSQL_DATABASE || 'task',
  ssl: {
    rejectUnauthorized: false
  }
}

async function fixDatabase() {
  let connection

  try {
    console.log('🔌 Connecting to database...')
    connection = await mysql.createConnection(DB_CONFIG)
    console.log('✅ Connected to database')

    // Step 1: Find tasks with invalid support field
    console.log('\n📊 Checking for tasks with invalid support field...')
    const [invalidTasks] = await connection.execute(`
      SELECT task_id, support, LENGTH(support) as support_length
      FROM tasks
      WHERE support IS NOT NULL 
        AND support != '[]'
      LIMIT 20
    `)

    console.log(`Found ${invalidTasks.length} tasks with non-empty support field`)
    
    if (invalidTasks.length > 0) {
      console.log('\nSample tasks:')
      invalidTasks.slice(0, 5).forEach(task => {
        console.log(`  - ${task.task_id}: "${task.support}" (length: ${task.support_length})`)
      })
    }

    // Step 2: Fix empty or whitespace-only support fields
    console.log('\n🔧 Fixing empty or whitespace-only support fields...')
    const [result1] = await connection.execute(`
      UPDATE tasks
      SET support = '[]'
      WHERE support IS NOT NULL 
        AND (
          support = ''
          OR TRIM(support) = ''
        )
    `)
    console.log(`✅ Fixed ${result1.affectedRows} tasks with empty support field`)

    // Step 3: Fix invalid JSON in support field
    console.log('\n🔧 Fixing invalid JSON in support field...')
    
    // Get all tasks with non-empty support
    const [allTasks] = await connection.execute(`
      SELECT task_id, support
      FROM tasks
      WHERE support IS NOT NULL
        AND support != ''
        AND support != '[]'
    `)

    let fixedCount = 0
    for (const task of allTasks) {
      try {
        // Try to parse the JSON
        JSON.parse(task.support)
      } catch (error) {
        // Invalid JSON, fix it
        console.log(`  Fixing task ${task.task_id}: "${task.support}"`)
        await connection.execute(
          'UPDATE tasks SET support = ? WHERE task_id = ?',
          ['[]', task.task_id]
        )
        fixedCount++
      }
    }
    console.log(`✅ Fixed ${fixedCount} tasks with invalid JSON in support field`)

    // Step 4: Verify the fix
    console.log('\n✅ Verifying fixes...')
    const [verifyTasks] = await connection.execute(`
      SELECT task_id, support
      FROM tasks
      WHERE support IS NOT NULL
      LIMIT 10
    `)

    console.log('\nSample of fixed tasks:')
    verifyTasks.forEach(task => {
      try {
        const parsed = JSON.parse(task.support)
        console.log(`  ✅ ${task.task_id}: ${task.support} (valid JSON, ${parsed.length} items)`)
      } catch (error) {
        console.log(`  ❌ ${task.task_id}: ${task.support} (STILL INVALID!)`)
      }
    })

    console.log('\n🎉 Database cleanup completed successfully!')

  } catch (error) {
    console.error('❌ Error fixing database:', error)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔌 Database connection closed')
    }
  }
}

// Run the script
fixDatabase()

