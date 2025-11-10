/**
 * Debug Logger Utility
 * Comprehensive logging for debugging mobile app issues
 */

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  category: string
  message: string
  data?: any
}

class DebugLogger {
  private logs: LogEntry[] = []
  private maxLogs = 500 // Keep last 500 logs
  private enabled = true

  /**
   * Log info message
   */
  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data)
    console.log(`[${category}] ${message}`, data || '')
  }

  /**
   * Log warning message
   */
  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data)
    console.warn(`[${category}] ${message}`, data || '')
  }

  /**
   * Log error message
   */
  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data)
    console.error(`[${category}] ${message}`, data || '')
  }

  /**
   * Log debug message
   */
  debug(category: string, message: string, data?: any) {
    this.log('debug', category, message, data)
    if (__DEV__) {
      console.debug(`[${category}] ${message}`, data || '')
    }
  }

  /**
   * Internal log method
   */
  private log(level: LogEntry['level'], category: string, message: string, data?: any) {
    if (!this.enabled) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    }

    this.logs.push(entry)

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category)
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = []
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }
}

// Singleton instance
export const logger = new DebugLogger()

/**
 * Log API request
 */
export const logApiRequest = (method: string, url: string, data?: any) => {
  logger.info('API', `${method} ${url}`, data)
}

/**
 * Log API response
 */
export const logApiResponse = (method: string, url: string, status: number, data?: any) => {
  if (status >= 200 && status < 300) {
    logger.info('API', `${method} ${url} - ${status}`, data)
  } else {
    logger.error('API', `${method} ${url} - ${status}`, data)
  }
}

/**
 * Log API error
 */
export const logApiError = (method: string, url: string, error: any) => {
  logger.error('API', `${method} ${url} - ERROR`, {
    message: error.message,
    stack: error.stack,
    error,
  })
}

/**
 * Log navigation
 */
export const logNavigation = (screen: string, params?: any) => {
  logger.debug('Navigation', `Navigated to ${screen}`, params)
}

/**
 * Log authentication
 */
export const logAuth = (action: string, data?: any) => {
  logger.info('Auth', action, data)
}

