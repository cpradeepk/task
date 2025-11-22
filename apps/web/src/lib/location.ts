/**
 * Location Helper Utility
 * 
 * Provides IP-based location detection for attendance tracking.
 * Uses ipapi.co free tier (up to 1000 requests/day).
 */

interface LocationData {
    ip: string
    city?: string
    region?: string
    country?: string
    timezone?: string
}

/**
 * Get location from IP address using ipapi.co
 * Falls back to IP address only if API fails
 */
export async function getLocationFromIP(): Promise<string> {
    try {
        // Try to get client IP from request headers (server-side)
        let clientIP = 'unknown'

        // In browser context, we can't directly get the IP
        // The API will use the request's IP automatically
        const response = await fetch('https://ipapi.co/json/', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: LocationData = await response.json()

        // Format: "City, Region, Country (IP: xxx.xxx.xxx.xxx)"
        const parts = []
        if (data.city) parts.push(data.city)
        if (data.region) parts.push(data.region)
        if (data.country) parts.push(data.country)

        const location = parts.length > 0 ? parts.join(', ') : 'Unknown Location'
        return `${location} (IP: ${data.ip})`

    } catch (error) {
        console.error('Failed to get location from IP:', error)
        // Fallback: return a generic message
        return 'Location unavailable'
    }
}

/**
 * Server-side version that accepts IP from request
 * Use this in API routes/resolvers
 */
export async function getLocationFromIPServer(ip: string): Promise<string> {
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: LocationData = await response.json()

        // Format: "City, Region, Country (IP: xxx.xxx.xxx.xxx)"
        const parts = []
        if (data.city) parts.push(data.city)
        if (data.region) parts.push(data.region)
        if (data.country) parts.push(data.country)

        const location = parts.length > 0 ? parts.join(', ') : 'Unknown Location'
        return `${location} (IP: ${ip})`

    } catch (error) {
        console.error('Failed to get location from IP:', error)
        return `IP: ${ip}`
    }
}

/**
 * Extract client IP from request headers
 * Handles various proxy/CDN scenarios
 */
export function getClientIP(request: Request): string {
    // Try various headers in order of preference
    const headers = request.headers

    // Cloudflare
    const cfConnectingIP = headers.get('cf-connecting-ip')
    if (cfConnectingIP) return cfConnectingIP

    // Standard forwarded header
    const xForwardedFor = headers.get('x-forwarded-for')
    if (xForwardedFor) {
        // X-Forwarded-For can contain multiple IPs, take the first one
        return xForwardedFor.split(',')[0].trim()
    }

    // Other common headers
    const xRealIP = headers.get('x-real-ip')
    if (xRealIP) return xRealIP

    // Fallback
    return 'unknown'
}
