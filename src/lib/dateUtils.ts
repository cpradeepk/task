/**
 * Date utility functions
 * Extracted from businessRules.ts to avoid circular dependencies
 */

// Business rules constants
const BUSINESS_RULES = {
  HOLIDAYS: {
    SATURDAY_WEEKS: [2, 4] // 2nd and 4th Saturday of the month
  }
}

export class DateUtils {
  /**
   * Get today's date in YYYY-MM-DD format
   */
  static getTodayString(): string {
    return new Date().toISOString().split('T')[0]
  }

  /**
   * Check if today is a working day (not a holiday)
   */
  static isTodayWorkingDay(): boolean {
    return !this.isHoliday(new Date())
  }

  /**
   * Check if a date is a holiday (2nd/4th Saturday or Sunday)
   */
  static isHoliday(date: Date): boolean {
    const dayOfWeek = date.getDay()

    // Sunday is always a holiday
    if (dayOfWeek === 0) return true

    // Check for 2nd and 4th Saturday
    if (dayOfWeek === 6) {
      const weekOfMonth = Math.ceil(date.getDate() / 7)
      return BUSINESS_RULES.HOLIDAYS.SATURDAY_WEEKS.includes(weekOfMonth)
    }

    return false
  }

  /**
   * Check if a date is a working day
   */
  static isWorkingDay(date: string): boolean {
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    return dayOfWeek >= 1 && dayOfWeek <= 5
  }

  /**
   * Get date in YYYY-MM-DD format
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * Parse date from string
   */
  static parseDate(dateString: string): Date {
    return new Date(dateString)
  }

  /**
   * Check if date is in the past
   */
  static isDateInPast(date: string): boolean {
    const today = this.getTodayString()
    return date < today
  }

  /**
   * Get days between two dates
   */
  static getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Add days to a date
   */
  static addDays(date: string, days: number): string {
    const dateObj = new Date(date)
    dateObj.setDate(dateObj.getDate() + days)
    return this.formatDate(dateObj)
  }

  /**
   * Parse hours from Hours Log format: 'DD/MM/YYYY - X Hours worked today'
   */
  static parseHoursFromLog(hoursLog: string, targetDate: string): number {
    if (!hoursLog) return 0

    const lines = hoursLog.split('\n').filter(line => line.trim())
    const targetDateFormatted = this.formatDateForLog(targetDate)

    for (const line of lines) {
      if (line.includes(targetDateFormatted)) {
        const match = line.match(/(\d+(?:\.\d+)?)\s*Hours?\s*worked/i)
        if (match) {
          return parseFloat(match[1])
        }
      }
    }

    return 0
  }

  /**
   * Format date for Hours Log (DD/MM/YYYY format)
   */
  static formatDateForLog(dateString: string): string {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  /**
   * Get working days in a month (excluding holidays)
   */
  static getWorkingDaysInMonth(year: number, month: number): number {
    const daysInMonth = new Date(year, month, 0).getDate()
    let workingDays = 0

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      if (!this.isHoliday(date)) {
        workingDays++
      }
    }

    return workingDays
  }

  /**
   * Get current month and year
   */
  static getCurrentMonthYear(): { month: number; year: number } {
    const now = new Date()
    return {
      month: now.getMonth() + 1, // JavaScript months are 0-indexed
      year: now.getFullYear()
    }
  }

  /**
   * Format month name
   */
  static getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[month - 1] || 'Unknown'
  }

  /**
   * Check if date is today
   */
  static isToday(date: string): boolean {
    return date === this.getTodayString()
  }

  /**
   * Check if date is in current month
   */
  static isCurrentMonth(date: string): boolean {
    const dateObj = new Date(date)
    const now = new Date()
    return dateObj.getMonth() === now.getMonth() && 
           dateObj.getFullYear() === now.getFullYear()
  }
}
