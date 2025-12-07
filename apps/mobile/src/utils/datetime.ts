/**
 * Datetime Utility Functions for Mobile App
 * 
 * Provides IST (Indian Standard Time, GMT+5:30) timezone formatting
 */

/**
 * Format a date/time to IST timezone string
 * @param date - Date object or ISO string to format
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
 * @param date - Date object or ISO string to format
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

/**
 * Format date only to IST timezone string
 * @param date - Date object or ISO string to format
 * @returns Formatted date string in IST (e.g., "06 Dec 2025")
 */
export function formatDateIST(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);

    return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
