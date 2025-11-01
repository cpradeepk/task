# Redis Caching Setup Guide

## Overview

The application now supports distributed Redis caching for production environments, with automatic fallback to in-memory caching for development or when Redis is unavailable.

## Benefits

- **Distributed Caching**: Share cache across multiple serverless instances
- **Persistent Cache**: Cache survives serverless function cold starts
- **Scalability**: Handle high traffic with reduced database load
- **Automatic Fallback**: Gracefully degrades to in-memory cache if Redis is unavailable

## Setup Instructions

### Option 1: Upstash Redis (Recommended for Vercel)

1. **Create Upstash Account**
   - Go to [https://upstash.com/](https://upstash.com/)
   - Sign up for a free account

2. **Create Redis Database**
   - Click "Create Database"
   - Choose a region close to your Vercel deployment region
   - Select "Free" tier (sufficient for most use cases)
   - Click "Create"

3. **Get Credentials**
   - In the Upstash console, go to your database
   - Click on "REST API" tab
   - Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

4. **Configure Environment Variables**
   
   **For Local Development:**
   ```bash
   # Add to apps/web/.env.local
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-redis-token-here
   ```

   **For Vercel Production:**
   ```bash
   # Add to Vercel project settings > Environment Variables
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-redis-token-here
   ```

### Option 2: Self-Hosted Redis

1. **Install Redis**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server
   
   # macOS
   brew install redis
   
   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Configure Environment Variables**
   ```bash
   # Add to apps/web/.env.local
   REDIS_URL=redis://localhost:6379
   REDIS_TOKEN=your-redis-password  # Optional, if auth is enabled
   ```

### Option 3: Other Redis Providers

- **AWS ElastiCache**: Use Redis endpoint URL
- **Google Cloud Memorystore**: Use Redis instance IP
- **Azure Cache for Redis**: Use connection string

## Cache Configuration

### Cache Keys

The application uses the following cache key patterns:

```typescript
CACHE_KEYS = {
  TASKS: 'tasks',
  BUGS: 'bugs',
  USERS: 'users',
  SETTINGS: 'settings',
  DASHBOARD: 'dashboard',
  BUG_DETAIL: (bugId) => `bug:${bugId}`,
  USER_DETAIL: (employeeId) => `user:${employeeId}`,
  TASK_DETAIL: (taskId) => `task:${taskId}`,
}
```

### Cache TTL (Time To Live)

- **Dashboard Data**: 2 minutes
- **Users**: 5 minutes
- **Settings**: 10 minutes
- **Individual Records**: 5 minutes

### Cache Invalidation

Cache is automatically invalidated on:
- POST (create) operations
- PUT/PATCH (update) operations
- DELETE operations

## Monitoring

### Check Cache Status

```bash
# Call the cache stats endpoint (to be created)
curl https://your-app.vercel.app/api/cache/stats
```

### Redis CLI (for self-hosted)

```bash
# Connect to Redis
redis-cli

# Check all keys
KEYS *

# Get cache size
DBSIZE

# Check specific key
GET dashboard_admin-001_admin_1

# Clear all cache
FLUSHDB
```

## Performance Impact

### Before Redis (In-Memory Cache)
- Cache lost on serverless cold starts
- Each instance has separate cache
- Cache not shared across regions

### After Redis
- Cache persists across cold starts
- Shared cache across all instances
- Global cache distribution
- Reduced database queries by ~70-90%

## Troubleshooting

### Redis Connection Fails

**Symptom**: Application logs show "Redis credentials not found, using in-memory cache"

**Solution**: 
1. Verify environment variables are set correctly
2. Check Redis URL is accessible from your deployment region
3. Verify Redis credentials are valid

### Cache Not Working

**Symptom**: All requests show `source: 'mysql'` instead of `source: 'cache'`

**Solution**:
1. Check Redis connection in application logs
2. Verify TTL is not too short
3. Check if cache keys are being set correctly

### High Redis Memory Usage

**Solution**:
1. Reduce TTL values
2. Implement cache eviction policies
3. Upgrade to higher Redis tier

## Cost Estimation

### Upstash Free Tier
- 10,000 commands/day
- 256 MB storage
- Sufficient for small to medium applications

### Upstash Pro Tier ($10/month)
- 100,000 commands/day
- 1 GB storage
- Recommended for production

## Next Steps

1. Set up Redis using one of the options above
2. Add environment variables to Vercel
3. Deploy and verify cache is working
4. Monitor cache hit rates
5. Adjust TTL values based on usage patterns

## Support

For issues or questions:
- Check application logs for Redis connection status
- Review Upstash documentation: https://docs.upstash.com/
- Contact support if cache-related errors persist

