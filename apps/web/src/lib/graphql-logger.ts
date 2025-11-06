/**
 * GraphQL Logger Utility
 * Comprehensive logging system for GraphQL queries, mutations, and errors
 * with color-coding, grouping, and performance monitoring
 */

const isDevelopment = process.env.NODE_ENV === 'development'

// Color codes for console styling
const colors = {
  success: '#10b981', // green
  error: '#ef4444',   // red
  warning: '#f59e0b', // yellow
  info: '#3b82f6',    // blue
  mutation: '#8b5cf6', // purple
  query: '#06b6d4',   // cyan
  reset: '#6b7280'    // gray
}

// Emoji indicators
const emoji = {
  query: '🔍',
  mutation: '✏️',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  timer: '⏱️',
  data: '📦',
  variables: '🔧',
  resolver: '⚙️',
  database: '🗄️'
}

/**
 * Extract operation name from GraphQL query string
 */
function extractOperationName(query: string): string {
  const match = query.match(/(?:query|mutation)\s+(\w+)/)
  return match ? match[1] : 'UnnamedOperation'
}

/**
 * Extract operation type (query or mutation)
 */
function extractOperationType(query: string): 'query' | 'mutation' {
  return query.trim().startsWith('mutation') ? 'mutation' : 'query'
}

/**
 * Format timestamp
 */
function getTimestamp(): string {
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const ms = now.getMilliseconds().toString().padStart(3, '0')
  return `${time}.${ms}`
}

/**
 * Truncate long strings for preview
 */
function truncate(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength) + '...'
}

/**
 * Client-side: Log GraphQL operation start
 */
export function logOperationStart(
  query: string,
  variables: any = {},
  operationName?: string
): { startTime: number; opName: string; opType: 'query' | 'mutation' } {
  if (!isDevelopment || typeof window === 'undefined') {
    return { startTime: Date.now(), opName: '', opType: 'query' }
  }

  const startTime = Date.now()
  const opName = operationName || extractOperationName(query)
  const opType = extractOperationType(query)
  const color = opType === 'mutation' ? colors.mutation : colors.query
  const icon = opType === 'mutation' ? emoji.mutation : emoji.query

  console.groupCollapsed(
    `%c${icon} [GraphQL ${opType.toUpperCase()}] ${opName} %c${getTimestamp()}`,
    `color: ${color}; font-weight: bold; font-size: 12px;`,
    `color: ${colors.reset}; font-weight: normal; font-size: 10px;`
  )

  console.log('%c📝 Operation:', 'color: #6b7280; font-weight: bold;', opName)
  console.log('%c🔤 Type:', 'color: #6b7280; font-weight: bold;', opType)
  
  if (Object.keys(variables).length > 0) {
    console.log(`%c${emoji.variables} Variables:`, 'color: #6b7280; font-weight: bold;')
    console.table(variables)
  }

  console.log('%c📄 Query:', 'color: #6b7280; font-weight: bold;')
  console.log(query)

  console.groupEnd()

  return { startTime, opName, opType }
}

/**
 * Client-side: Log GraphQL operation success
 */
export function logOperationSuccess(
  opName: string,
  opType: 'query' | 'mutation',
  data: any,
  startTime: number
): void {
  if (!isDevelopment || typeof window === 'undefined') return

  const duration = Date.now() - startTime
  const color = opType === 'mutation' ? colors.mutation : colors.query

  console.groupCollapsed(
    `%c${emoji.success} [GraphQL ${opType.toUpperCase()}] ${opName} %c${duration}ms`,
    `color: ${colors.success}; font-weight: bold; font-size: 12px;`,
    `color: ${colors.reset}; font-weight: normal; font-size: 10px;`
  )

  console.log(`%c${emoji.timer} Duration:`, 'color: #6b7280; font-weight: bold;', `${duration}ms`)
  console.log(`%c${emoji.data} Response Data:`, 'color: #6b7280; font-weight: bold;')
  
  // Show data preview
  if (data && typeof data === 'object') {
    const keys = Object.keys(data)
    if (keys.length > 0) {
      keys.forEach(key => {
        const value = data[key]
        if (Array.isArray(value)) {
          console.log(`  ${key}: Array(${value.length})`, value.slice(0, 3))
        } else if (value && typeof value === 'object') {
          console.log(`  ${key}:`, value)
        } else {
          console.log(`  ${key}:`, value)
        }
      })
    }
  }

  console.groupEnd()
}

/**
 * Client-side: Log GraphQL operation error
 */
export function logOperationError(
  opName: string,
  opType: 'query' | 'mutation',
  error: any,
  startTime: number
): void {
  if (!isDevelopment || typeof window === 'undefined') return

  const duration = Date.now() - startTime

  console.groupCollapsed(
    `%c${emoji.error} [GraphQL ${opType.toUpperCase()}] ${opName} FAILED %c${duration}ms`,
    `color: ${colors.error}; font-weight: bold; font-size: 12px;`,
    `color: ${colors.reset}; font-weight: normal; font-size: 10px;`
  )

  console.log(`%c${emoji.timer} Duration:`, 'color: #6b7280; font-weight: bold;', `${duration}ms`)

  // Parse GraphQL errors
  if (error.graphQLErrors && error.graphQLErrors.length > 0) {
    console.log(`%c${emoji.error} GraphQL Errors:`, 'color: #ef4444; font-weight: bold;')
    error.graphQLErrors.forEach((gqlError: any, index: number) => {
      console.group(`Error ${index + 1}:`)
      console.log('Message:', gqlError.message)
      if (gqlError.path) {
        console.log('Path:', gqlError.path.join(' → '))
      }
      if (gqlError.extensions) {
        console.log('Extensions:', gqlError.extensions)
      }
      if (gqlError.originalError) {
        console.log('Original Error:', gqlError.originalError)
      }
      console.groupEnd()
    })
  }

  // Network errors
  if (error.networkError) {
    console.log(`%c${emoji.warning} Network Error:`, 'color: #f59e0b; font-weight: bold;')
    console.error(error.networkError)
  }

  // Full error object
  console.log('%c🔍 Full Error Object:', 'color: #6b7280; font-weight: bold;')
  console.error(error)

  // Stack trace
  if (error.stack) {
    console.log('%c📚 Stack Trace:', 'color: #6b7280; font-weight: bold;')
    console.log(error.stack)
  }

  console.groupEnd()
}

/**
 * Server-side: Log resolver execution start
 */
export function logResolverStart(
  resolverName: string,
  args: any = {},
  parentType?: string
): { startTime: number } {
  if (!isDevelopment) {
    return { startTime: Date.now() }
  }

  const startTime = Date.now()
  const prefix = parentType ? `${parentType}.${resolverName}` : resolverName

  console.log(
    `${emoji.resolver} [Resolver] ${prefix} ${emoji.timer} ${getTimestamp()}`
  )

  if (Object.keys(args).length > 0) {
    console.log(`  ${emoji.variables} Args:`, JSON.stringify(args, null, 2))
  }

  return { startTime }
}

/**
 * Server-side: Log resolver execution success
 */
export function logResolverSuccess(
  resolverName: string,
  result: any,
  startTime: number,
  parentType?: string
): void {
  if (!isDevelopment) return

  const duration = Date.now() - startTime
  const prefix = parentType ? `${parentType}.${resolverName}` : resolverName

  let resultPreview = ''
  if (Array.isArray(result)) {
    resultPreview = `Array(${result.length})`
  } else if (result && typeof result === 'object') {
    resultPreview = `Object(${Object.keys(result).length} keys)`
  } else {
    resultPreview = String(result)
  }

  console.log(
    `  ${emoji.success} [Resolver] ${prefix} completed in ${duration}ms → ${truncate(resultPreview, 50)}`
  )
}

/**
 * Server-side: Log resolver execution error
 */
export function logResolverError(
  resolverName: string,
  error: any,
  startTime: number,
  parentType?: string
): void {
  if (!isDevelopment) return

  const duration = Date.now() - startTime
  const prefix = parentType ? `${parentType}.${resolverName}` : resolverName

  console.error(
    `  ${emoji.error} [Resolver] ${prefix} FAILED in ${duration}ms`
  )
  console.error(`    Error: ${error.message}`)

  if (error.code) {
    console.error(`    Code: ${error.code}`)
  }

  if (error.detail) {
    console.error(`    Detail: ${error.detail}`)
  }

  if (error.stack) {
    console.error(`    Stack: ${error.stack}`)
  }
}

/**
 * Server-side: Log database query
 */
export function logDatabaseQuery(
  query: string,
  params: any[] = [],
  context?: string
): { startTime: number } {
  if (!isDevelopment) {
    return { startTime: Date.now() }
  }

  const startTime = Date.now()
  const contextStr = context ? ` [${context}]` : ''

  console.log(`  ${emoji.database} [DB Query]${contextStr}`)
  console.log(`    SQL: ${truncate(query, 200)}`)

  if (params.length > 0) {
    console.log(`    Params:`, params)
  }

  return { startTime }
}

/**
 * Server-side: Log database query result
 */
export function logDatabaseResult(
  rowCount: number,
  startTime: number,
  context?: string
): void {
  if (!isDevelopment) return

  const duration = Date.now() - startTime
  const contextStr = context ? ` [${context}]` : ''

  console.log(
    `  ${emoji.success} [DB Result]${contextStr} ${rowCount} rows in ${duration}ms`
  )
}

/**
 * Server-side: Log database error
 */
export function logDatabaseError(
  error: any,
  startTime: number,
  context?: string
): void {
  if (!isDevelopment) return

  const duration = Date.now() - startTime
  const contextStr = context ? ` [${context}]` : ''

  console.error(`  ${emoji.error} [DB Error]${contextStr} after ${duration}ms`)
  console.error(`    Message: ${error.message}`)

  if (error.code) {
    console.error(`    Code: ${error.code}`)
  }

  if (error.detail) {
    console.error(`    Detail: ${error.detail}`)
  }

  if (error.hint) {
    console.error(`    Hint: ${error.hint}`)
  }
}

/**
 * Production-safe error logger (minimal logging for production)
 */
export function logProductionError(
  operation: string,
  error: any
): void {
  // In production, only log minimal error info
  console.error(`[GraphQL Error] ${operation}:`, error.message)

  // Log to external error tracking service here if needed
  // e.g., Sentry, LogRocket, etc.
}


