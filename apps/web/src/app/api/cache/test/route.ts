import { NextResponse } from 'next/server'
import { redisCache } from '@/lib/redis'

/**
 * Test Redis connection and cache functionality
 * GET /api/cache/test
 */
export async function GET() {
  try {
    const testKey = 'test:connection'
    const testValue = { message: 'Redis connection test', timestamp: Date.now() }

    // Get cache stats
    const stats = await redisCache.getStats()

    // Test write
    await redisCache.set(testKey, testValue, 1) // 1 minute TTL

    // Test read
    const retrieved = await redisCache.get<{ message: string; timestamp: number }>(testKey)

    // Test exists
    const exists = await redisCache.has(testKey)

    // Clean up
    await redisCache.delete(testKey)

    // Check environment variables
    const envCheck = {
      REDIS_HOST: process.env.REDIS_HOST ? '✅ Set' : '❌ Not set',
      REDIS_PORT: process.env.REDIS_PORT ? `✅ Set (${process.env.REDIS_PORT})` : '❌ Not set (will use default 6379)',
      REDIS_PASSWORD: process.env.REDIS_PASSWORD ? '✅ Set (hidden)' : '❌ Not set',
    }

    return NextResponse.json({
      success: true,
      data: {
        cacheType: stats.type,
        isRedisAvailable: stats.isAvailable,
        stats: {
          type: stats.type,
          size: stats.size,
          host: stats.host,
          port: stats.port,
        },
        tests: {
          write: retrieved !== null ? '✅ Success' : '❌ Failed',
          read: retrieved?.message === testValue.message ? '✅ Success' : '❌ Failed',
          exists: exists ? '✅ Success' : '❌ Failed',
        },
        environment: envCheck,
        message: stats.isAvailable
          ? '✅ Redis Cloud is connected and working'
          : '⚠️ Using in-memory cache (Redis not available)',
      },
    })
  } catch (error) {
    console.error('Cache test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: '❌ Cache test failed',
      },
      { status: 500 }
    )
  }
}

