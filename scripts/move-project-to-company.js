#!/usr/bin/env node
/**
 * Move a project — with its sub-projects and every work item under them — to a
 * different company.
 *
 * Migration 062 put ALL existing data into one company, because that is the only
 * safe assumption a migration can make. If a deployment has been using top-level
 * projects to separate genuinely different businesses, this splits them apart
 * afterwards.
 *
 * DRY RUN BY DEFAULT. Nothing is written unless you pass --apply.
 *
 *   node scripts/move-project-to-company.js --project=swarg --company=COMP-002
 *   node scripts/move-project-to-company.js --project=swarg --company=COMP-002 --apply
 *
 * Optionally move the project's members' DEFAULT company too, so they land in
 * the right tenant on next sign-in. Membership of the original company is kept
 * unless --exclusive is given, because someone may legitimately work in both:
 *
 *   ... --apply --move-members
 *   ... --apply --move-members --exclusive
 *
 * Everything runs in one transaction: a failure leaves the database untouched.
 * Requires DATABASE_URL, and migrations 062 and 063 to have been applied.
 */

const { Pool } = require('pg')

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : fallback
}
const flag = (name) => process.argv.includes(`--${name}`)

const projectId = arg('project')
const companyId = arg('company')
const APPLY = flag('apply')
const MOVE_MEMBERS = flag('move-members')
const EXCLUSIVE = flag('exclusive')

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }
  if (!projectId || !companyId) {
    console.error('Usage: --project=<project_id> --company=<company_id> [--apply] [--move-members] [--exclusive]')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  const client = await pool.connect()

  try {
    const { rows: companyRows } = await client.query(
      'SELECT company_id, name FROM companies WHERE company_id = $1',
      [companyId]
    )
    if (companyRows.length === 0) {
      console.error(`Company ${companyId} does not exist. Create it first (Settings > Companies, or POST /api/companies).`)
      process.exit(1)
    }

    const { rows: projectRows } = await client.query(
      `SELECT project_id, project_name, company_id, parent_project_id
         FROM projects
        WHERE project_id = $1 OR parent_project_id = $1
        ORDER BY parent_project_id NULLS FIRST, project_id`,
      [projectId]
    )
    if (projectRows.length === 0) {
      console.error(`Project ${projectId} not found.`)
      process.exit(1)
    }
    const root = projectRows.find((p) => p.project_id === projectId)
    if (!root) {
      console.error(`Project ${projectId} not found (only sub-projects matched).`)
      process.exit(1)
    }
    if (root.parent_project_id) {
      console.error(
        `${projectId} is a SUB-project of ${root.parent_project_id}. Move the parent instead — a ` +
        `sub-project must stay in its parent's company.`
      )
      process.exit(1)
    }

    const projectIds = projectRows.map((p) => p.project_id)

    const counts = {}
    for (const table of ['tasks', 'bugs', 'requirements']) {
      const { rows } = await client.query(
        `SELECT count(*)::int AS n FROM ${table} WHERE project_id = ANY($1)`,
        [projectIds]
      )
      counts[table] = rows[0].n
    }

    const { rows: members } = await client.query(
      `SELECT DISTINCT pu.employee_id, u.name
         FROM project_users pu JOIN users u ON u.employee_id = pu.employee_id
        WHERE pu.project_id = ANY($1)
        ORDER BY pu.employee_id`,
      [projectIds]
    )

    console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN — nothing will be written'}`)
    console.log(`\nMove to: ${companyRows[0].company_id}  (${companyRows[0].name})`)
    console.log(`\nProjects (${projectRows.length}) — currently in ${root.company_id}:`)
    for (const p of projectRows) {
      console.log(`  ${p.parent_project_id ? '  └─ ' : ''}${p.project_id.padEnd(16)} ${p.project_name}`)
    }
    console.log(`\nWork items that move with them:`)
    console.log(`  tasks         ${counts.tasks}`)
    console.log(`  bugs          ${counts.bugs}`)
    console.log(`  requirements  ${counts.requirements}`)
    console.log(`\nProject members (${members.length}):`)
    for (const m of members) console.log(`  ${m.employee_id.padEnd(12)} ${m.name}`)
    if (MOVE_MEMBERS) {
      console.log(
        `\n  --move-members: each gains membership of ${companyId} and it becomes their DEFAULT.` +
        (EXCLUSIVE ? `\n  --exclusive: their membership of ${root.company_id} is REMOVED.` : '\n  Their existing membership is kept (pass --exclusive to remove it).')
      )
    } else {
      console.log(`\n  Members are NOT moved. Pass --move-members to move them too.`)
    }

    if (!APPLY) {
      console.log('\nRe-run with --apply to perform the move.\n')
      return
    }

    await client.query('BEGIN')

    await client.query('UPDATE projects SET company_id = $1 WHERE project_id = ANY($2)', [companyId, projectIds])
    for (const table of ['tasks', 'bugs', 'requirements']) {
      await client.query(`UPDATE ${table} SET company_id = $1 WHERE project_id = ANY($2)`, [companyId, projectIds])
    }

    if (MOVE_MEMBERS && members.length > 0) {
      const ids = members.map((m) => m.employee_id)
      // Clear existing defaults first — a partial unique index allows only one.
      await client.query('UPDATE user_companies SET is_default = FALSE WHERE employee_id = ANY($1)', [ids])
      await client.query(
        `INSERT INTO user_companies (employee_id, company_id, company_role, is_default)
         SELECT unnest($1::text[]), $2, 'member', TRUE
         ON CONFLICT (employee_id, company_id)
         DO UPDATE SET is_default = TRUE, updated_at = NOW()`,
        [ids, companyId]
      )
      if (EXCLUSIVE) {
        await client.query(
          'DELETE FROM user_companies WHERE employee_id = ANY($1) AND company_id = $2',
          [ids, root.company_id]
        )
      }
    }

    await client.query('COMMIT')
    console.log('\nDone. Affected users must sign out and back in to pick up the new company.\n')
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
