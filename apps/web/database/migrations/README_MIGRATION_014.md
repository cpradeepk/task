# Migration 014: Sequential ID Format

## Overview

This migration converts all task and bug IDs from timestamp-based format to sequential alphanumeric format.

**Before:**
- Tasks: `JSR-1735123456789001234`
- Bugs: `BUG-1735123456789001234`

**After:**
- Tasks: `JSR-0001`, `JSR-0002`, `JSR-0003`, ...
- Bugs: `BUG-0001`, `BUG-0002`, `BUG-0003`, ...

## What This Migration Does

1. ✅ Creates temporary mapping tables for ID conversion
2. ✅ Generates sequential IDs for all existing tasks and bugs (ordered by creation date)
3. ✅ Updates all references:
   - `related_tasks` field in tasks table
   - `related_bugs` field in bugs table
   - `activity_log` table references
   - `subtasks` table references
4. ✅ Updates primary keys (task_id, bug_id)
5. ✅ Cleans up temporary tables

## Prerequisites

### 1. Backup Your Database

**CRITICAL:** Always backup your database before running this migration!

```bash
# Example backup command
mysqldump -h YOUR_HOST -u YOUR_USER -p YOUR_DATABASE > backup_before_migration_014.sql
```

### 2. Verify Environment Variables

Make sure your `.env.local` file has the correct database credentials:

```env
MYSQL_HOST=your-database-host
MYSQL_PORT=3306
MYSQL_USER=your-username
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=your-database-name
```

## How to Run the Migration

### Option 1: Using the Node.js Script (Recommended)

```bash
cd apps/web
node scripts/migrate-to-sequential-ids.js
```

This script will:
- Connect to your database
- Execute the migration SQL file
- Show progress for each step
- Verify the results
- Display sample migrated IDs

### Option 2: Manual SQL Execution

If you prefer to run the SQL manually:

```bash
mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DATABASE < database/migrations/014_migrate_to_sequential_ids.sql
```

## Expected Output

```
======================================================================
  TASK & BUG ID MIGRATION TO SEQUENTIAL FORMAT
======================================================================

🔵 Connecting to database...
✅ Connected to database
🔵 Reading migration file: .../014_migrate_to_sequential_ids.sql
🔵 Found 25 SQL statements to execute

⚠️  WARNING: This will modify all task and bug IDs in the database!
⚠️  Make sure you have a backup before proceeding!

🔵 [1/25] Creating temporary mapping tables...
🔵 [5/25] Generating sequential task IDs...
🔵 [7/25] Generating sequential bug IDs...
🔵 [9/25] Updating tasks with new IDs...
🔵 [11/25] Updating bugs with new IDs...
🔵 [15/25] Updating activity log references...
🔵 [20/25] Applying new task IDs (primary key update)...
🔵 [22/25] Applying new bug IDs (primary key update)...
🔵 [24/25] Cleaning up temporary tables...

✅ Migration completed successfully!
   - 25 statements executed
   - 0 errors

🔵 Verifying migration results...

📋 Sample Task IDs (first 5):
   1. JSR-0001 - Initial project setup...
   2. JSR-0002 - Create database schema...
   3. JSR-0003 - Implement authentication...
   4. JSR-0004 - Build task management UI...
   5. JSR-0005 - Add email notifications...

🐛 Sample Bug IDs (first 5):
   1. BUG-0001 - Login button not working...
   2. BUG-0002 - Dashboard loading slowly...
   3. BUG-0003 - Email notifications failing...

📊 Migration Summary:
   - Total tasks migrated: 150
   - Total bugs migrated: 45

✅ All IDs have been successfully migrated to sequential format!
✅ New tasks and bugs will use the sequential format (JSR-0001, BUG-0001, etc.)

🎉 Migration completed successfully!
```

## What Happens After Migration

### 1. Existing IDs Are Preserved in Order

All existing tasks and bugs keep their chronological order. The oldest task becomes `JSR-0001`, the second oldest becomes `JSR-0002`, and so on.

### 2. New Tasks and Bugs Use Sequential IDs

After the migration, the API will automatically generate sequential IDs:
- New tasks: `JSR-0151`, `JSR-0152`, etc. (continuing from the last migrated ID)
- New bugs: `BUG-0046`, `BUG-0047`, etc.

### 3. All References Are Updated

The migration automatically updates:
- Related tasks/bugs fields
- Activity log entries
- Subtask references
- Any other database references

## Verification

After running the migration, verify the results:

```sql
-- Check task IDs
SELECT task_id, description, created_at 
FROM tasks 
WHERE deleted_at IS NULL 
ORDER BY task_id 
LIMIT 10;

-- Check bug IDs
SELECT bug_id, title, created_at 
FROM bugs 
WHERE deleted_at IS NULL 
ORDER BY bug_id 
LIMIT 10;

-- Check related tasks are updated
SELECT task_id, related_tasks 
FROM tasks 
WHERE related_tasks IS NOT NULL 
LIMIT 5;

-- Check activity log references
SELECT entity_type, entity_id, action, created_at 
FROM activity_log 
WHERE entity_type IN ('task', 'bug') 
ORDER BY created_at DESC 
LIMIT 10;
```

## Rollback

If you need to rollback:

1. Restore from the backup you created before the migration:

```bash
mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DATABASE < backup_before_migration_014.sql
```

2. Revert the code changes that use sequential IDs

## Troubleshooting

### Error: "Duplicate entry for key 'PRIMARY'"

This means the migration was partially run. Restore from backup and try again.

### Error: "Cannot add or update a child row: a foreign key constraint fails"

This means there are orphaned references. Check your data integrity before running the migration.

### Migration Runs But IDs Don't Change

Make sure you're using the updated API code that calls `generateSequentialTaskId()` and `generateSequentialBugId()`.

## Files Modified by This Migration

### Database
- `tasks` table: `task_id` column (primary key)
- `bugs` table: `bug_id` column (primary key)
- `activity_log` table: `entity_id` column (for tasks and bugs)
- `subtasks` table: `parent_task_id` column

### Code
- `apps/web/src/lib/data.ts`: Added `generateSequentialTaskId()` and `generateSequentialBugId()`
- `apps/web/src/app/api/tasks/route.ts`: Uses `generateSequentialTaskId()`
- `apps/web/src/app/api/bugs/route.ts`: Uses `generateSequentialBugId()`
- `apps/web/src/lib/db/tasks.ts`: Added `getLatestTaskId()`
- `apps/web/src/lib/db/bugs.ts`: Added `getLatestBugId()`

## Support

If you encounter any issues during migration, please:
1. Restore from backup immediately
2. Check the error logs
3. Contact the development team with the error details

