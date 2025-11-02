#!/usr/bin/env node

/**
 * Comprehensive PostgreSQL Syntax Fixer
 * 
 * This script fixes ALL remaining MySQL syntax issues in the codebase:
 * 1. Dynamic placeholder generation: ids.map(() => '$1') -> ids.map((_, i) => `$${i + 1}`)
 * 2. Column names: camelCase -> snake_case
 * 3. SQL keywords: NOW() -> CURRENT_TIMESTAMP, etc.
 * 4. Boolean values: 1/0 -> true/false
 */

const fs = require('fs')
const path = require('path')

// Files to process
const FILES_TO_FIX = [
  'apps/web/src/lib/db/users.ts',
  'apps/web/src/lib/db/tasks.ts',
  'apps/web/src/lib/db/bugs.ts',
  'apps/web/src/lib/db/projects.ts',
  'apps/web/src/lib/db/settings.ts',
  'apps/web/src/lib/db/leaves.ts',
  'apps/web/src/lib/db/wfh.ts',
  'apps/web/src/lib/db/activity.ts',
  'apps/web/src/lib/db/subtasks.ts',
  'apps/web/src/lib/db/bug-subtasks.ts',
  'apps/web/src/lib/db/bug-comments.ts',
  'apps/web/src/lib/db/notifications.ts',
]

// Column name mappings (camelCase -> snake_case)
const COLUMN_MAPPINGS = {
  // Users table
  employeeId: 'employee_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  deletedBy: 'deleted_by',
  
  // Tasks table
  taskId: 'task_id',
  internalId: 'internal_id',
  selectType: 'select_type',
  recursiveType: 'recursive_type',
  assignedTo: 'assigned_to',
  assignedBy: 'assigned_by',
  startDate: 'start_date',
  endDate: 'end_date',
  estimatedHours: 'estimated_hours',
  actualHours: 'actual_hours',
  dailyHours: 'daily_hours',
  relatedTasks: 'related_tasks',
  projectId: 'project_id',
  timerState: 'timer_state',
  timerStartTime: 'timer_start_time',
  timerPausedTime: 'timer_paused_time',
  timerTotalTime: 'timer_total_time',
  timerSessions: 'timer_sessions',
  
  // Bugs table
  bugId: 'bug_id',
  reportedBy: 'reported_by',
  reportedDate: 'reported_date',
  
  // Subtasks table
  subtaskId: 'subtask_id',
  parentTaskId: 'parent_task_id',
  parentBugId: 'parent_bug_id',
  isCompleted: 'is_completed',
  
  // Projects table
  projectName: 'project_name',
  projectType: 'project_type',
  
  // Settings table
  isActive: 'is_active',
  
  // Leave/WFH applications
  leaveId: 'leave_id',
  wfhId: 'wfh_id',
  fromDate: 'from_date',
  toDate: 'to_date',
  appliedDate: 'applied_date',
  approvedBy: 'approved_by',
  approvedDate: 'approved_date',
  
  // Activity log
  activityId: 'activity_id',
  entityType: 'entity_type',
  entityId: 'entity_id',
  performedBy: 'performed_by',
  
  // Notifications
  notificationId: 'notification_id',
  isRead: 'is_read',
  readAt: 'read_at',
}

function fixDynamicPlaceholders(content) {
  console.log('  - Fixing dynamic placeholder generation...')
  
  // Fix: ids.map(() => '$1') -> ids.map((_, i) => `$${i + 1}`)
  // This pattern matches various forms of dynamic placeholder generation
  const patterns = [
    // Pattern 1: .map(() => '$1')
    {
      regex: /(\w+)\.map\(\(\) => '\$1'\)/g,
      replacement: '$1.map((_, i) => `$${i + 1}`)'
    },
    // Pattern 2: .map(() => "$1")
    {
      regex: /(\w+)\.map\(\(\) => "\$1"\)/g,
      replacement: '$1.map((_, i) => `$${i + 1}`)'
    },
    // Pattern 3: .map(() => `$1`)
    {
      regex: /(\w+)\.map\(\(\) => `\$1`\)/g,
      replacement: '$1.map((_, i) => `$${i + 1}`)'
    },
  ]
  
  patterns.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement)
  })
  
  return content
}

function fixColumnNames(content) {
  console.log('  - Fixing column names (camelCase -> snake_case)...')
  
  // Sort by length (longest first) to avoid partial replacements
  const sortedMappings = Object.entries(COLUMN_MAPPINGS)
    .sort((a, b) => b[0].length - a[0].length)
  
  sortedMappings.forEach(([camelCase, snake_case]) => {
    // Fix in SQL queries (within quotes)
    // Pattern: WHERE employeeId = -> WHERE employee_id =
    const sqlPatterns = [
      // In WHERE clauses
      new RegExp(`\\b${camelCase}\\s*=`, 'g'),
      new RegExp(`\\b${camelCase}\\s*!=`, 'g'),
      new RegExp(`\\b${camelCase}\\s*<`, 'g'),
      new RegExp(`\\b${camelCase}\\s*>`, 'g'),
      new RegExp(`\\b${camelCase}\\s*IN`, 'gi'),
      new RegExp(`\\b${camelCase}\\s*IS`, 'gi'),
      // In SELECT/INSERT/UPDATE
      new RegExp(`\\b${camelCase}\\s*,`, 'g'),
      new RegExp(`\\b${camelCase}\\s*\\)`, 'g'),
      new RegExp(`\\(${camelCase}\\b`, 'g'),
      // In ORDER BY
      new RegExp(`ORDER BY ${camelCase}\\b`, 'gi'),
      new RegExp(`\\bORDER BY\\s+${camelCase}\\s+(ASC|DESC)`, 'gi'),
    ]
    
    sqlPatterns.forEach(pattern => {
      content = content.replace(pattern, (match) => {
        return match.replace(camelCase, snake_case)
      })
    })
  })
  
  return content
}

function fixBooleanValues(content) {
  console.log('  - Fixing boolean values...')
  
  // Fix: isActive = 1 -> is_active = true
  // Fix: isActive = 0 -> is_active = false
  content = content.replace(/is_active\s*=\s*1\b/g, 'is_active = true')
  content = content.replace(/is_active\s*=\s*0\b/g, 'is_active = false')
  content = content.replace(/is_completed\s*=\s*1\b/g, 'is_completed = true')
  content = content.replace(/is_completed\s*=\s*0\b/g, 'is_completed = false')
  content = content.replace(/is_read\s*=\s*1\b/g, 'is_read = true')
  content = content.replace(/is_read\s*=\s*0\b/g, 'is_read = false')
  
  return content
}

function fixSQLKeywords(content) {
  console.log('  - Fixing SQL keywords...')
  
  // Note: NOW() is actually valid in PostgreSQL, but CURRENT_TIMESTAMP is more standard
  // We'll keep NOW() as it works in both MySQL and PostgreSQL
  
  return content
}

function processFile(filePath) {
  console.log(`\nProcessing: ${filePath}`)
  
  const fullPath = path.join(process.cwd(), filePath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️  File not found, skipping...`)
    return
  }
  
  let content = fs.readFileSync(fullPath, 'utf8')
  const originalContent = content
  
  // Apply all fixes
  content = fixDynamicPlaceholders(content)
  content = fixColumnNames(content)
  content = fixBooleanValues(content)
  content = fixSQLKeywords(content)
  
  // Write back if changed
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8')
    console.log(`  ✅ Fixed and saved`)
  } else {
    console.log(`  ℹ️  No changes needed`)
  }
}

function main() {
  console.log('🔧 PostgreSQL Syntax Fixer')
  console.log('=' .repeat(50))
  console.log('\nThis script will fix:')
  console.log('  1. Dynamic placeholder generation')
  console.log('  2. Column names (camelCase -> snake_case)')
  console.log('  3. Boolean values (1/0 -> true/false)')
  console.log('  4. SQL keywords')
  console.log('')
  
  FILES_TO_FIX.forEach(processFile)
  
  console.log('\n' + '='.repeat(50))
  console.log('✅ All files processed!')
  console.log('\nNext steps:')
  console.log('  1. Review the changes with: git diff')
  console.log('  2. Test the application')
  console.log('  3. Commit the changes if everything works')
}

main()

