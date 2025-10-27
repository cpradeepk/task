/**
 * Daily Hours Tracking Utilities
 * Handles date-specific hours tracking for tasks
 */

export interface DailyHoursData {
  [date: string]: number // Format: "2025-06-27": 3.5
}

/**
 * Parse daily hours from JSON string
 */
export function parseDailyHours(dailyHoursString?: string): DailyHoursData {
  if (!dailyHoursString) return {}
  
  try {
    return JSON.parse(dailyHoursString)
  } catch (error) {
    console.warn('Failed to parse daily hours:', error)
    return {}
  }
}

/**
 * Convert daily hours data to JSON string
 */
export function stringifyDailyHours(dailyHours: DailyHoursData): string {
  return JSON.stringify(dailyHours)
}

/**
 * Get hours worked on a specific date
 */
export function getHoursForDate(date: string, dailyHoursString?: string): number {
  const dailyHours = parseDailyHours(dailyHoursString)
  return dailyHours[date] || 0
}

/**
 * Add hours to a specific date (additive)
 */
export function addHoursToDate(
  dailyHoursString: string | undefined, 
  date: string, 
  hoursToAdd: number
): string {
  const dailyHours = parseDailyHours(dailyHoursString)
  const currentHours = dailyHours[date] || 0
  dailyHours[date] = currentHours + hoursToAdd
  return stringifyDailyHours(dailyHours)
}

/**
 * Set hours for a specific date (replace)
 */
export function setHoursForDate(
  dailyHoursString: string | undefined, 
  date: string, 
  hours: number
): string {
  const dailyHours = parseDailyHours(dailyHoursString)
  dailyHours[date] = hours
  return stringifyDailyHours(dailyHours)
}

/**
 * Calculate total hours across all dates
 */
export function calculateTotalHours(dailyHoursString?: string): number {
  const dailyHours = parseDailyHours(dailyHoursString)
  return Object.values(dailyHours).reduce((total, hours) => total + hours, 0)
}

/**
 * Get all dates with logged hours
 */
export function getDatesWithHours(dailyHoursString?: string): string[] {
  const dailyHours = parseDailyHours(dailyHoursString)
  return Object.keys(dailyHours).filter(date => dailyHours[date] > 0)
}

/**
 * Format date to YYYY-MM-DD format for consistency
 */
export function formatDateForTracking(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toISOString().split('T')[0]
}

/**
 * Get hours worked in a date range
 */
export function getHoursInDateRange(
  startDate: string,
  endDate: string,
  dailyHoursString?: string
): number {
  const dailyHours = parseDailyHours(dailyHoursString)
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  let totalHours = 0
  
  for (const [dateStr, hours] of Object.entries(dailyHours)) {
    const date = new Date(dateStr)
    if (date >= start && date <= end) {
      totalHours += hours
    }
  }
  
  return totalHours
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return formatDateForTracking(new Date())
}

/**
 * Check if a task was worked on a specific date
 */
export function wasWorkedOnDate(date: string, dailyHoursString?: string): boolean {
  return getHoursForDate(date, dailyHoursString) > 0
}
