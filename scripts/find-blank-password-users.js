#!/usr/bin/env node
/**
 * Finds users whose stored password hash matches the EMPTY STRING.
 *
 * Before the fix in lib/db/users.ts, saving a user from the admin modal sent
 * `password: ''` (rowToUser blanks the password on read, and the conditional
 * spread in UserModal never removed it). updateUser tested `!== undefined`
 * rather than truthiness, so it stored bcrypt('') — silently destroying that
 * user's password. Those accounts cannot log in with any real password.
 *
 * This script is READ-ONLY by default: it lists affected accounts.
 * Pass --reset to assign each a fresh random password and print it, so an admin
 * can distribute credentials (or re-send them from the user list UI).
 *
 *   node scripts/find-blank-password-users.js
 *   node scripts/find-blank-password-users.js --reset
 *
 * Requires DATABASE_URL in the environment.
 */

const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const { randomBytes } = require('crypto')

const RESET = process.argv.includes('--reset')

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    const { rows } = await pool.query(
      `SELECT employee_id, name, email, status, password
         FROM users
        ORDER BY employee_id`
    )

    const affected = []
    for (const row of rows) {
      const stored = row.password || ''
      // Only bcrypt hashes can encode the empty string; a legacy plaintext row
      // with an empty password is caught by the stored === '' check.
      const isBlank = stored === ''
        ? true
        : /^\$2[aby]\$/.test(stored) && (await bcrypt.compare('', stored))
      if (isBlank) affected.push(row)
    }

    if (affected.length === 0) {
      console.log('No users with a blank password. Nothing to do.')
      return
    }

    console.log(`Found ${affected.length} user(s) with a blank password:\n`)
    for (const user of affected) {
      console.log(`  ${user.employee_id.padEnd(12)} ${String(user.name).padEnd(24)} ${user.email}  [${user.status}]`)
    }

    if (!RESET) {
      console.log('\nRe-run with --reset to assign each a new random password.')
      return
    }

    console.log('\nResetting passwords...\n')
    for (const user of affected) {
      const newPassword = randomBytes(12).toString('base64url').slice(0, 14)
      const hash = await bcrypt.hash(newPassword, 10)
      await pool.query('UPDATE users SET password = $1 WHERE employee_id = $2', [hash, user.employee_id])
      console.log(`  ${user.employee_id.padEnd(12)} ${user.email.padEnd(32)} ${newPassword}`)
    }
    console.log('\nDone. Share these securely, or resend credentials from the user list.')
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Failed:', error)
  process.exit(1)
})
