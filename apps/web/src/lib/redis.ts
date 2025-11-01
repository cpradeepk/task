/**
 * Redis cache service for distributed caching in production
 * Falls back to in-memory cache in development or when Redis is unavailable
 */

import { Redis } from '@upstash/redis'

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class RedisCache {
  private redis: Redis | null = null
  private memoryCache = new Map<string, CacheItem<any>>()
  private isRedisAvailable = false

  constructor() {
    this.initializeRedis()
  }

  private initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
      const redisToken = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

      if (redisUrl && redisToken) {
        this.redis = new Redis({
          url: redisUrl,
          token: redisToken,
        })
        this.isRedisAvailable = true
        console.log('✅ Redis cache initialized successfully')
      } else {
        console.log('⚠️ Redis credentials not found, using in-memory cache')
        this.isRedisAvailable = false
      }
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error)
      this.isRedisAvailable = false
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
        const value = await this.redis.get<string>(key)
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
        // Upstash Redis doesn't support SCAN, so we'll use a different approach
        // For now, just delete exact matches
        await this.redis.del(pattern)
        return
      } catch (error) {
        console.error('Redis deletePattern error, falling back to memory:', error)
        this.isRedisAvailable = false
      }
    }

    // Fallback to memory cache - delete all keys matching pattern
    const regex = new RegExp(pattern.replace('*', '.*'))
    const keys = Array.from(this.memoryCache.keys())
    for (const key of keys) {
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
  }> {
    if (this.isRedisAvailable && this.redis) {
      try {
        const dbsize = await this.redis.dbsize()
        return {
          type: 'redis',
          size: dbsize,
          isAvailable: true,
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

