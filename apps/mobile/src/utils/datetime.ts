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
function parseDate(date: Date | string | number | null | undefined): Date | null {
    if (date === null || date === undefined || date === '') return null;
    if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
    if (typeof date === 'number') {
        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof date === 'string') {
        if (/^\d+$/.test(date)) {
            const d = new Date(parseInt(date, 10));
            return isNaN(d.getTime()) ? null : d;
        }
        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

/**
 * Format a date/time to IST timezone string
 * @param date - Date object, ISO string, or timestamp to format
 * @returns Formatted datetime string in IST (e.g., "06 Dec 2025, 4:30 PM")
 */
export function formatDateTimeIST(date: Date | string | number | null | undefined): string {
    const d = parseDate(date);
    if (!d) return '--';

    try {
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
    } catch (e) {
        return '--';
    }
}

/**
 * Format time only to IST timezone string
 * @param date - Date object, ISO string, or timestamp to format
 * @returns Formatted time string in IST (e.g., "4:30 PM")
 */
export function formatTimeIST(date: Date | string | number | null | undefined): string {
    const d = parseDate(date);
    if (!d) return '--';

    try {
        // Use toLocaleTimeString with Asia/Kolkata timezone
        return d.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return '--';
    }
}

/**
 * Format date only to IST timezone string
 * @param date - Date object, ISO string, or timestamp to format
 * @returns Formatted date string in IST (e.g., "06 Dec 2025")
 */
export function formatDateIST(date: Date | string | number | null | undefined): string {
    const d = parseDate(date);
    if (!d) return '--';

    try {
        return d.toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return '--';
    }
}
