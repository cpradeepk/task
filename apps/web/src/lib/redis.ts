/**
 * Redis cache service for distributed caching in production
 * Uses Redis Cloud (redis.io) with ioredis client
 * Falls back to in-memory cache in development or when Redis is unavailable
 *
 * NOTE: This module should only be imported on the server side (API routes, server components)
 * Do NOT import in client components as ioredis requires Node.js built-in modules
 */

import type Redis from 'ioredis'

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class RedisCache {
  private redis: Redis | null = null
  private memoryCache = new Map<string, CacheItem<any>>()
  private isRedisAvailable = false
  private connectionAttempted = false

  constructor() {
    this.initializeRedis()
  }

  private initializeRedis() {
    // Only initialize Redis on server side
    if (typeof window !== 'undefined') {
      console.log('⚠️ Redis client cannot be initialized on client side, using in-memory cache')
      this.isRedisAvailable = false
      this.connectionAttempted = true
      return
    }

    try {
      const redisHost = process.env.REDIS_HOST
      const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379
      const redisPassword = process.env.REDIS_PASSWORD

      if (redisHost && redisPassword) {
        // Dynamically import ioredis only on server side
        const RedisClient = require('ioredis').default

        this.redis = new RedisClient({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          retryStrategy: (times: number) => {
            // Stop retrying after 3 attempts to avoid log spam
            if (times > 3) {
              console.log('⚠️ Redis Cloud connection failed after 3 attempts, falling back to in-memory cache')
              return null // Stop retrying
            }
            // Retry connection with exponential backoff
            const delay = Math.min(times * 50, 2000)
            return delay
          },
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
          connectTimeout: 10000,
          // TLS configuration for Redis Cloud
          tls: {
            rejectUnauthorized: false,
            // Suppress SSL handshake errors in logs
            checkServerIdentity: () => undefined
          }
        })

        // Handle connection events
        if (this.redis) {
          let errorLogged = false // Prevent duplicate error logs

          this.redis.on('connect', () => {
            console.log('🔵 Connecting to Redis Cloud...')
            errorLogged = false // Reset error flag on new connection attempt
          })

          this.redis.on('ready', () => {
            this.isRedisAvailable = true
            this.connectionAttempted = true
            console.log('✅ Redis Cloud cache initialized successfully')
            console.log(`   Host: ${redisHost}:${redisPort}`)
          })

          this.redis.on('error', (error: Error) => {
            // Only log the first error to avoid spam
            if (!errorLogged) {
              console.error('❌ Redis Cloud connection error:', error.message)
              console.log('   Falling back to in-memory cache')
              errorLogged = true
            }
            this.isRedisAvailable = false
            this.connectionAttempted = true
          })

          this.redis.on('close', () => {
            if (this.isRedisAvailable) {
              console.log('⚠️ Redis Cloud connection closed, using in-memory cache')
            }
            this.isRedisAvailable = false
          })

          this.redis.on('reconnecting', () => {
            // Only log reconnection attempts if we were previously connected
            if (this.connectionAttempted && !errorLogged) {
              console.log('🔄 Reconnecting to Redis Cloud...')
            }
          })
        }

      } else {
        console.log('⚠️ Redis Cloud credentials not found, using in-memory cache')
        console.log('   Required: REDIS_HOST, REDIS_PASSWORD')
        this.isRedisAvailable = false
        this.connectionAttempted = true
      }
    } catch (error) {
      console.error('❌ Failed to initialize Redis Cloud:', error)
      this.isRedisAvailable = false
      this.connectionAttempted = true
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, data: T, ttlMinutes: number = 5): Promise<void> {
    const ttlSeconds = ttlMinutes * 60

    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(data))
        return
      } catch (error) {
        console.error('Redis set error, falling back to memory:', error)
        this.isRedisAvailable = false
      }
    }

    // Fallback to memory cache
    const ttl = ttlMinutes * 60 * 1000
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisAvailable && this.redis) {
      try {
        const value = await this.redis.get(key)
        if (value) {
          return JSON.parse(value) as T
        }
        return null
      } catch (error) {
        console.error('Redis get error, falling back to memory:', error)
        this.isRedisAvailable = false
      }
    }

    // Fallback to memory cache
    const item = this.memoryCache.get(key)
    if (!item) {
      return null
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.memoryCache.delete(key)
      return null
    }

    return item.data as T
  }

  /**
   * Check if a key exists in cache
   */
  async has(key: string): Promise<boolean> {
    if (this.isRedisAvailable && this.redis) {
      try {
        const exists = await this.redis.exists(key)
        return exists === 1
      } catch (error) {
        console.error('Redis has error, falling back to memory:', error)
        this.isRedisAvailable = false
      }
    }

    // Fallback to memory cache
    const item = this.memoryCache.get(key)
    if (!item) {
      return false
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.memoryCache.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.del(key)
        return
      } catch (error) {
        console.error('Redis delete error, falling back to memory:', error)
        this.isRedisAvailable = false
      }
    }

    // Fallback to memory cache
    this.memoryCache.delete(key)
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        // Redis Cloud supports SCAN command for pattern matching
        const stream = this.redis.scanStream({
          match: pattern,
          count: 100
        })

        const keys: string[] = []

        stream.on('data', (resultKeys: string[]) => {
          keys.push(...resultKeys)
        })

        await new Promise<void>((resolve, reject) => {
          stream.on('end', () => resolve())
          stream.on('error', (err) => reject(err))
        })

        if (keys.length > 0) {
          await this.redis.del(...keys)
        }

        return
      } catch (error) {
        console.error('Redis deletePattern error, falling back to memory:', error)
        this.isRedisAvailable = false
      }
    }

    // Fallback to memory cache - delete all keys matching pattern
    const regex = new RegExp(pattern.replace('*', '.*'))
    const keysArray = Array.from(this.memoryCache.keys())
    for (const key of keysArray) {
      if (regex.test(key)) {
        this.memoryCache.delete(key)
      }
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.flushdb()
        return
      } catch (error) {
        console.error('Redis clear error, falling back to memory:', error)
        this.isRedisAvailable = false
      }
    }

    // Fallback to memory cache
    this.memoryCache.clear()
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    type: 'redis' | 'memory'
    size?: number
    keys?: string[]
    isAvailable: boolean
    host?: string
    port?: number
  }> {
    if (this.isRedisAvailable && this.redis) {
      try {
        const dbsize = await this.redis.dbsize()
        const info = await this.redis.info('server')

        return {
          type: 'redis',
          size: dbsize,
          isAvailable: true,
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
        }
      } catch (error) {
        console.error('Redis stats error:', error)
      }
    }

    return {
      type: 'memory',
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()),
      isAvailable: false,
    }
  }

  /**
   * Increment a counter in cache
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    if (this.isRedisAvailable && this.redis) {
      try {
        return await this.redis.incrby(key, amount)
      } catch (error) {
        console.error('Redis increment error:', error)
        this.isRedisAvailable = false
      }
    }

    // Fallback to memory cache
    const current = await this.get<number>(key) || 0
    const newValue = current + amount
    await this.set(key, newValue, 60) // 1 hour TTL for counters
    return newValue
  }
}

// Export singleton instance
export const redisCache = new RedisCache()

// Cache keys - same as before but now Redis-compatible
export const CACHE_KEYS = {
  TASKS: 'tasks',
  BUGS: 'bugs',
  USERS: 'users',
  SETTINGS: 'settings',
  DASHBOARD: 'dashboard',
  BUG_STATISTICS: 'bug_statistics',
  BUG_DETAIL: (bugId: string) => `bug:${bugId}`,
  BUG_COMMENTS: (bugId: string) => `bug:${bugId}:comments`,
  USER_DETAIL: (employeeId: string) => `user:${employeeId}`,
  TASK_DETAIL: (taskId: string) => `task:${taskId}`,
  USER_TASKS: (employeeId: string) => `user:${employeeId}:tasks`,
  USER_BUGS: (employeeId: string) => `user:${employeeId}:bugs`,
} as const

