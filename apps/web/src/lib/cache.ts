/**
 * Cache utility - uses Redis in production, in-memory in development
 * This is a compatibility wrapper for existing code
 */

import { redisCache, CACHE_KEYS as REDIS_CACHE_KEYS } from './redis'

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>()
  private useRedis = typeof window === 'undefined' && process.env.NODE_ENV === 'production'

  async set<T>(key: string, data: T, ttlMinutes: number = 5): Promise<void> {
    if (this.useRedis) {
      await redisCache.set(key, data, ttlMinutes)
      return
    }

    const ttl = ttlMinutes * 60 * 1000 // Convert to milliseconds
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis) {
      return await redisCache.get<T>(key)
    }

    const item = this.cache.get(key)

    if (!item) {
      return null
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  async has(key: string): Promise<boolean> {
    if (this.useRedis) {
      return await redisCache.has(key)
    }

    const item = this.cache.get(key)

    if (!item) {
      return false
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  async delete(key: string): Promise<void> {
    if (this.useRedis) {
      await redisCache.delete(key)
      return
    }

    this.cache.delete(key)
  }

  async clear(): Promise<void> {
    if (this.useRedis) {
      await redisCache.clear()
      return
    }

    this.cache.clear()
  }

  // Get cache stats
  async getStats(): Promise<{ size: number; keys: string[]; type?: string }> {
    if (this.useRedis) {
      const stats = await redisCache.getStats()
      return {
        size: stats.size || 0,
        keys: stats.keys || [],
        type: stats.type
      }
    }

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      type: 'memory'
    }
  }
}

// Export a singleton instance
export const cache = new SimpleCache()

// Cache keys - re-export from redis for consistency
export const CACHE_KEYS = REDIS_CACHE_KEYS
