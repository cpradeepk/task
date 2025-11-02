#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

/**
 * Convert MySQL query syntax to PostgreSQL syntax
 */
function convertQuerySyntax(content) {
  let converted = content
  
  // 1. Convert parameter placeholders from ? to $1, $2, $3, etc.
  // This is tricky because we need to track the position of each ?
  converted = convertParameterPlaceholders(converted)
  
  // 2. Convert CAST(SUBSTRING(x, y) AS UNSIGNED) to CAST(SUBSTRING(x FROM y) AS INTEGER)
  converted = converted.replace(
    /CAST\(SUBSTRING\(([^,]+),\s*(\d+)\)\s+AS\s+UNSIGNED\)/gi,
    'CAST(SUBSTRING($1 FROM $2) AS INTEGER)'
  )
  
  // 3. Convert FIND_IN_SET(?, column) to ? = ANY(string_to_array(column::text, ','))
  converted = converted.replace(
    /FIND_IN_SET\(\$(\d+),\s*([a-zA-Z_]+)\)\s*>\s*0/g,
    "$$1 = ANY(string_to_array($2::text, ','))"
  )
  
  // 4. Remove mysql2 type imports
  converted = converted.replace(
    /import\s+\{[^}]*RowDataPacket[^}]*\}\s+from\s+['"]mysql2['"]\s*\n?/g,
    ''
  )
  converted = converted.replace(
    /import\s+\{[^}]*ResultSetHeader[^}]*\}\s+from\s+['"]mysql2['"]\s*\n?/g,
    ''
  )
  converted = converted.replace(
    /import\s+\{[^}]*RowDataPacket[^}]*,\s*ResultSetHeader[^}]*\}\s+from\s+['"]mysql2['"]\s*\n?/g,
    ''
  )
  converted = converted.replace(
    /import\s+mysql\s+from\s+['"]mysql2\/promise['"]\s*\n?/g,
    ''
  )

  // 5. Remove RowDataPacket and ResultSetHeader type annotations and interfaces
  converted = converted.replace(/<RowDataPacket\[\]>/g, '<any[]>')
  converted = converted.replace(/<ResultSetHeader>/g, '<any>')
  converted = converted.replace(/extends\s+RowDataPacket/g, '')
  converted = converted.replace(/query<\(RowDataPacket\s+&\s+([^)]+)\)\[\]>/g, 'query<$1[]>')
  converted = converted.replace(/const\s+\[([^\]]+)\]\s+=\s+await\s+pool\.query/g, 'const $1 = await pool.query')
  
  // 6. Clean up multiple empty lines
  converted = converted.replace(/\n\n\n+/g, '\n\n')
  
  return converted
}

/**
 * Convert ? placeholders to $1, $2, $3, etc.
 * This function handles SQL queries within template literals and strings
 * It's more conservative and only converts ? that are clearly SQL parameters
 */
function convertParameterPlaceholders(content) {
  // Match SQL query strings more carefully
  // Look for strings that contain SQL keywords and ? placeholders
  const lines = content.split('\n')
  const result = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check if this line contains a SQL query string
    const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|SET|VALUES|ORDER BY|GROUP BY|HAVING|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|AND|OR|LIKE|IN|NOT|IS|NULL|LIMIT|OFFSET|DISTINCT|COUNT|SUM|AVG|MAX|MIN|CREATE|ALTER|DROP|TRUNCATE|INDEX)\b/i

    if (sqlKeywords.test(line) && line.includes('?')) {
      // This line likely contains a SQL query with ? placeholders
      // Convert ? to $1, $2, $3, etc. but only within quoted strings
      let paramIndex = 1
      let inString = false
      let stringChar = null
      let converted = ''

      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        const prevChar = j > 0 ? line[j - 1] : ''

        // Track if we're inside a string
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          if (!inString) {
            inString = true
            stringChar = char
          } else if (char === stringChar) {
            inString = false
            stringChar = null
          }
        }

        // Convert ? to $N only if we're inside a string (SQL query)
        if (char === '?' && inString) {
          converted += `$${paramIndex++}`
        } else {
          converted += char
        }
      }

      result.push(converted)
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}

/**
 * Process a single file
 */
function processFile(filePath) {
  console.log(`Processing: ${filePath}`)
  
  const content = fs.readFileSync(filePath, 'utf8')
  const converted = convertQuerySyntax(content)
  
  if (content !== converted) {
    fs.writeFileSync(filePath, converted, 'utf8')
    console.log(`  ✅ Converted`)
  } else {
    console.log(`  ⏭️  No changes needed`)
  }
}

/**
 * Main function
 */
function main() {
  const dbDir = path.join(__dirname, '../apps/web/src/lib/db')
  const graphqlFile = path.join(__dirname, '../apps/web/src/graphql/resolvers.ts')
  
  console.log('🔄 Converting MySQL queries to PostgreSQL syntax...\n')
  
  // Process all database service files
  const files = fs.readdirSync(dbDir)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts')
    .map(f => path.join(dbDir, f))
  
  files.forEach(processFile)
  
  // Process GraphQL resolvers
  console.log('\nProcessing GraphQL resolvers:')
  processFile(graphqlFile)
  
  console.log('\n✅ Conversion complete!')
}

main()

