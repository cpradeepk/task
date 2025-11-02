#!/usr/bin/env node

/**
 * SQL Syntax Converter - MySQL to PostgreSQL
 * 
 * This script converts MySQL SQL syntax to PostgreSQL syntax in all TypeScript files.
 * 
 * Conversions:
 * 1. Parameter placeholders: ? → $1, $2, $3
 * 2. FIND_IN_SET(val, list) → val = ANY(string_to_array(list, ','))
 * 3. CAST(... AS UNSIGNED) → CAST(... AS INTEGER)
 * 4. SUBSTRING(str, pos) → SUBSTRING(str FROM pos)
 * 5. LIMIT offset, limit → LIMIT limit OFFSET offset
 * 
 * Usage:
 *   node scripts/convert-sql-syntax.js
 */

const fs = require('fs')
const path = require('path')

// Files to convert
const FILES_TO_CONVERT = [
  'apps/web/src/lib/db/users.ts',
  'apps/web/src/lib/db/tasks.ts',
  'apps/web/src/lib/db/bugs.ts',
  'apps/web/src/lib/db/projects.ts',
  'apps/web/src/lib/db/leaves.ts',
  'apps/web/src/lib/db/wfh.ts',
  'apps/web/src/lib/db/subtasks.ts',
  'apps/web/src/lib/db/bugSubtasks.ts',
  'apps/web/src/lib/db/settings.ts',
  'apps/web/src/lib/db/activityLog.ts',
  'apps/web/src/lib/db/permissions.ts',
  'apps/web/src/lib/db/notificationPreferences.ts',
  'apps/web/src/graphql/resolvers.ts'
]

/**
 * Convert MySQL parameter placeholders (?) to PostgreSQL ($1, $2, $3)
 */
function convertParameterPlaceholders(content) {
  // This is complex because we need to track parameter positions
  // We'll use a regex to find SQL queries and convert them
  
  let result = content
  let modified = false

  // Find all query() and queryOne() calls
  const queryRegex = /(query(?:One)?<[^>]+>\s*\(\s*`([^`]+)`\s*,\s*\[([^\]]*)\])/g
  
  result = result.replace(queryRegex, (match, fullMatch, sql, params) => {
    // Count the number of ? in the SQL
    const questionMarks = (sql.match(/\?/g) || []).length
    
    if (questionMarks === 0) {
      return match // No placeholders to convert
    }

    // Replace ? with $1, $2, $3, etc.
    let paramIndex = 1
    const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`)
    
    modified = true
    return `query${fullMatch.includes('queryOne') ? 'One' : ''}<${fullMatch.match(/<([^>]+)>/)[1]}>(\`${convertedSql}\`, [${params}]`
  })

  // Also handle single-line queries
  const singleLineRegex = /(query(?:One)?<[^>]+>\s*\(\s*'([^']+)'\s*,\s*\[([^\]]*)\])/g
  
  result = result.replace(singleLineRegex, (match, fullMatch, sql, params) => {
    const questionMarks = (sql.match(/\?/g) || []).length
    
    if (questionMarks === 0) {
      return match
    }

    let paramIndex = 1
    const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`)
    
    modified = true
    return `query${fullMatch.includes('queryOne') ? 'One' : ''}<${fullMatch.match(/<([^>]+)>/)[1]}>('${convertedSql}', [${params}]`
  })

  return { result, modified }
}

/**
 * Convert FIND_IN_SET() to PostgreSQL equivalent
 */
function convertFindInSet(content) {
  let result = content
  let modified = false

  // FIND_IN_SET(?, support) > 0 → $1 = ANY(string_to_array(support, ','))
  const findInSetRegex = /FIND_IN_SET\(\$(\d+),\s*(\w+)\)\s*>\s*0/g
  
  result = result.replace(findInSetRegex, (match, paramNum, column) => {
    modified = true
    return `$${paramNum} = ANY(string_to_array(${column}, ','))`
  })

  return { result, modified }
}

/**
 * Convert CAST(... AS UNSIGNED) to CAST(... AS INTEGER)
 */
function convertCastUnsigned(content) {
  let result = content
  let modified = false

  // CAST(... AS UNSIGNED) → CAST(... AS INTEGER)
  const castRegex = /CAST\(([^)]+)\s+AS\s+UNSIGNED\)/gi
  
  result = result.replace(castRegex, (match, expression) => {
    modified = true
    return `CAST(${expression} AS INTEGER)`
  })

  return { result, modified }
}

/**
 * Convert SUBSTRING() to PostgreSQL syntax
 */
function convertSubstring(content) {
  let result = content
  let modified = false

  // SUBSTRING(str, pos) → SUBSTRING(str FROM pos)
  // SUBSTRING(str, pos, len) → SUBSTRING(str FROM pos FOR len)
  const substringRegex = /SUBSTRING\(([^,]+),\s*(\d+)(?:,\s*(\d+))?\)/g
  
  result = result.replace(substringRegex, (match, str, pos, len) => {
    modified = true
    if (len) {
      return `SUBSTRING(${str} FROM ${pos} FOR ${len})`
    } else {
      return `SUBSTRING(${str} FROM ${pos})`
    }
  })

  return { result, modified }
}

/**
 * Convert mysql2 imports to pg
 */
function convertImports(content) {
  let result = content
  let modified = false

  // Remove mysql2 imports
  if (content.includes('mysql2')) {
    result = result.replace(/import\s+{\s*RowDataPacket,\s*ResultSetHeader\s*}\s+from\s+['"]mysql2['"]/g, '')
    result = result.replace(/import\s+{\s*ResultSetHeader\s*}\s+from\s+['"]mysql2['"]/g, '')
    result = result.replace(/import\s+{\s*RowDataPacket\s*}\s+from\s+['"]mysql2['"]/g, '')
    modified = true
  }

  // Remove RowDataPacket and ResultSetHeader type annotations
  if (content.includes('RowDataPacket') || content.includes('ResultSetHeader')) {
    result = result.replace(/:\s*RowDataPacket\[\]/g, '[]')
    result = result.replace(/<RowDataPacket\[\]>/g, '<any[]>')
    result = result.replace(/<ResultSetHeader>/g, '<any>')
    result = result.replace(/interface\s+\w+Row\s+extends\s+RowDataPacket\s+{/g, (match) => {
      return match.replace('extends RowDataPacket ', '')
    })
    modified = true
  }

  return { result, modified }
}

/**
 * Convert a single file
 */
function convertFile(filePath) {
  console.log(`\n📝 Converting ${filePath}...`)
  
  try {
    const fullPath = path.join(__dirname, '..', filePath)
    let content = fs.readFileSync(fullPath, 'utf8')
    let totalModifications = 0

    // Apply all conversions
    const conversions = [
      { name: 'Parameter placeholders', fn: convertParameterPlaceholders },
      { name: 'FIND_IN_SET()', fn: convertFindInSet },
      { name: 'CAST AS UNSIGNED', fn: convertCastUnsigned },
      { name: 'SUBSTRING()', fn: convertSubstring },
      { name: 'Imports', fn: convertImports }
    ]

    for (const conversion of conversions) {
      const { result, modified } = conversion.fn(content)
      if (modified) {
        content = result
        totalModifications++
        console.log(`   ✅ ${conversion.name} converted`)
      }
    }

    if (totalModifications > 0) {
      fs.writeFileSync(fullPath, content, 'utf8')
      console.log(`   💾 Saved ${totalModifications} modifications`)
    } else {
      console.log(`   ⏭️  No modifications needed`)
    }

  } catch (error) {
    console.error(`   ❌ Error converting ${filePath}:`, error.message)
  }
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Starting SQL syntax conversion (MySQL → PostgreSQL)...\n')
  console.log(`📋 Files to convert: ${FILES_TO_CONVERT.length}\n`)

  for (const file of FILES_TO_CONVERT) {
    convertFile(file)
  }

  console.log('\n\n✅ Conversion completed!')
  console.log('\n📊 Next steps:')
  console.log('1. Review the converted files')
  console.log('2. Test all database operations')
  console.log('3. Fix any remaining syntax issues manually')
  console.log('4. Run the application and verify functionality')
}

// Run conversion
if (require.main === module) {
  main()
}

module.exports = { convertParameterPlaceholders, convertFindInSet, convertCastUnsigned, convertSubstring, convertImports }

