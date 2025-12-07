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
export function parseDateTime(dateStr: string | Date | null | undefined): Date {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;

    const str = String(dateStr).trim();

    // Handle YYYY-MM-DD HH:MM:SS format
    // Replace space with T to make it ISO-8601 compliant for Date constructor
    if (str.includes(' ') && !str.includes('T')) {
        return new Date(str.replace(' ', 'T'));
    }

    const date = new Date(str);

    // If invalid, return current date as fallback to prevent crash
    if (isNaN(date.getTime())) {
        return new Date();
    }

    return date;
}

/**
 * Convert a date to IST (Indian Standard Time, GMT+5:30)
 * @param date - Date object or string to convert
 * @returns Date object adjusted to IST
 */
export function toIST(date: Date | string): Date {
    const d = date instanceof Date ? date : new Date(date);
    // IST is UTC+5:30
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const utcTime = d.getTime();
    return new Date(utcTime + istOffset);
}

/**
 * Format a date/time to IST timezone string
 * @param date - Date object or string to format
 * @returns Formatted datetime string in IST (e.g., "06 Dec 2025, 4:30 PM")
 */
export function formatDateTimeIST(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);

    // Use toLocaleString with Asia/Kolkata timezone
    return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Format time only to IST timezone string
 * @param date - Date object or string to format
 * @returns Formatted time string in IST (e.g., "4:30 PM")
 */
export function formatTimeIST(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);

    // Use toLocaleTimeString with Asia/Kolkata timezone
    return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}
