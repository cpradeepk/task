/**
 * Datetime Utility Functions
 * 
 * Provides standardized datetime formatting without milliseconds
 * to reduce database storage overhead and improve consistency.
 * 
 * Standard format: YYYY-MM-DD HH:MM:SS
 */

/**
 * Get current datetime in YYYY-MM-DD HH:MM:SS format
 * @returns Current datetime as string (e.g., "2025-12-03 14:32:50")
 */
export function getCurrentDateTime(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns Current date as string (e.g., "2025-12-03")
 */
export function getCurrentDate(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

/**
 * Convert Date object to YYYY-MM-DD HH:MM:SS format
 * @param date - Date object to format
 * @returns Formatted datetime string
 */
export function formatDateTime(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Convert Date object to YYYY-MM-DD format
 * @param date - Date object to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

/**
 * Parse datetime string (handles both ISO and standard formats)
 * @param dateStr - Date string to parse
 * @returns Date object
 */
export function parseDateTime(dateStr: string): Date {
    // Handle YYYY-MM-DD HH:MM:SS format
    if (dateStr.includes(' ') && !dateStr.includes('T')) {
        const [datePart, timePart] = dateStr.split(' ')
        return new Date(`${datePart}T${timePart}Z`)
    }
    // Handle ISO format and other standard formats
    return new Date(dateStr)
}
