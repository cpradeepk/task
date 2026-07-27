#!/usr/bin/env node
/**
 * Create the companies this deployment actually runs, and report where each
 * project currently sits.
 *
 * Migration 062 placed everything in one company (COMP-001, "Amtariksha Tech"),
 * which is the only assumption a migration can safely make. This creates the
 * remaining companies so projects can then be moved into them with
 * scripts/move-project-to-company.js.
 *
 * DRY RUN BY DEFAULT — pass --apply to write.
 *
 *   node scripts/setup-companies.js
 *   node scripts/setup-companies.js --apply
 *
 * Idempotent: a company whose code already exists is left alone, so re-running
 * is safe. Requires DATABASE_URL and migration 062.
 *
 * The `code` becomes that company's employee-ID prefix — AM-0001, SW-0001,
 * TS-0001 — so each company numbers its people independently.
 */

const { Pool } = require('pg')

const APPLY = process.argv.includes('--apply')

/** Companies this deployment should have. COMP-001 already exists as Amtariksha. */
const COMPANIES = [
  { name: 'Amtariksha Tech', code: 'AM' },
  { name: 'Swarg Food', code: 'SW' },
  { name: 'Tattva Silicon', code: 'TS' },
]

async function nextCompanyId(client) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(company_id FROM '^COMP-([0-9]+)$') AS INTEGER)), 0) AS max_num
       FROM companies WHERE company_id ~ '^COMP-[0-9]+$'`
  )
  return rows[0].max_num
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  const client = await pool.connect()

  try {
    const { rows: existing } = await client.query('SELECT company_id, name, code FROM companies ORDER BY company_id')

    console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN — nothing will be written'}\n`)
    console.log('Existing companies:')
    if (existing.length === 0) {
      console.log('  (none — has migration 062 been applied?)')
    }
    for (const c of existing) console.log(`  ${c.company_id.padEnd(10)} ${c.code.padEnd(4)} ${c.name}`)

    const byCode = new Map(existing.map((c) => [c.code.toUpperCase(), c]))
    const toCreate = COMPANIES.filter((c) => !byCode.has(c.code.toUpperCase()))

    console.log('\nTo create:')
    if (toCreate.length === 0) console.log('  (nothing — all present)')
    for (const c of toCreate) console.log(`  ${c.code.padEnd(4)} ${c.name}`)

    // Show where projects sit, so the follow-up moves are obvious.
    const { rows: projects } = await client.query(
      `SELECT p.project_id, p.project_name, p.company_id, p.parent_project_id,
              (SELECT count(*)::int FROM tasks t WHERE t.project_id = p.project_id) AS tasks,
              (SELECT count(*)::int FROM bugs b WHERE b.project_id = p.project_id) AS bugs
         FROM projects p
        WHERE p.deleted_at IS NULL
        ORDER BY p.parent_project_id NULLS FIRST, p.project_id`
    )
    console.log('\nProjects and their current company:')
    for (const p of projects) {
      const indent = p.parent_project_id ? '    └─ ' : '  '
      console.log(
        `${indent}${p.project_id.padEnd(18)} ${String(p.company_id).padEnd(10)} ` +
        `${p.tasks} tasks, ${p.bugs} bugs   ${p.project_name}`
      )
    }

    if (!APPLY) {
      console.log('\nRe-run with --apply to create the missing companies.')
      console.log('Then move each project with:')
      console.log('  node scripts/move-project-to-company.js --project=<id> --company=<COMP-00X>\n')
      return
    }

    if (toCreate.length === 0) {
      console.log('\nNothing to do.\n')
      return
    }

    await client.query('BEGIN')
    let counter = await nextCompanyId(client)
    for (const c of toCreate) {
      counter += 1
      const companyId = `COMP-${String(counter).padStart(3, '0')}`
      await client.query(
        `INSERT INTO companies (company_id, name, code, created_by)
         VALUES ($1, $2, $3, 'system')
         ON CONFLICT (code) DO NOTHING`,
        [companyId, c.name, c.code.toUpperCase()]
      )
      console.log(`  created ${companyId}  ${c.code}  ${c.name}`)
    }
    await client.query('COMMIT')

    console.log('\nDone. Next: move each project into its company, e.g.')
    console.log('  node scripts/move-project-to-company.js --project=swarg --company=<the Swarg COMP id>')
    console.log('Run it without --apply first to see exactly what would change.\n')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('\nFailed, rolled back:', error.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Failed:', error)
  process.exit(1)
})
