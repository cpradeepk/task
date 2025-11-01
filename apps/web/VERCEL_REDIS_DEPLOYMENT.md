# Redis Cloud Deployment Guide for Vercel

## Overview

This guide provides step-by-step instructions for deploying the JSR Task Management System to Vercel with Redis Cloud caching enabled.

## Prerequisites

- ✅ Redis Cloud account created
- ✅ Redis database created in ap-south-1 region
- ✅ Redis connection details available (host, port, password)
- ✅ Vercel account with project deployed
- ✅ Code pushed to GitHub repository

## Step-by-Step Deployment

### Step 1: Prepare Redis Cloud Credentials

1. **Login to Redis Cloud Console**
   - Go to [https://redis.io/cloud/](https://redis.io/cloud/)
   - Navigate to your database

2. **Copy Connection Details**
   - **Host**: `redis-17948.c301.ap-south-1-1.ec2.redns.redis-cloud.com`
   - **Port**: `17948`
   - **Password**: Click "Show" to reveal the default user password

3. **Test Connection Locally (Optional)**
   ```bash
   # Install redis-cli if not already installed
   brew install redis  # macOS
   sudo apt-get install redis-tools  # Ubuntu
   
   # Test connection
   redis-cli -h redis-17948.c301.ap-south-1-1.ec2.redns.redis-cloud.com \
             -p 17948 \
             -a YOUR_PASSWORD \
             --tls \
             PING
   
   # Expected output: PONG
   ```

### Step 2: Configure Vercel Environment Variables

#### Option A: Via Vercel Dashboard (Recommended)

1. **Open Vercel Dashboard**
   - Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your project (e.g., `jsr-task-management`)

2. **Navigate to Settings**
   - Click "Settings" tab
   - Click "Environment Variables" in the left sidebar

3. **Add Redis Cloud Variables**
   
   Add the following three environment variables:

   | Variable Name | Value | Environments |
   |--------------|-------|--------------|
   | `REDIS_HOST` | `redis-17948.c301.ap-south-1-1.ec2.redns.redis-cloud.com` | ✅ Production<br>✅ Preview<br>✅ Development |
   | `REDIS_PORT` | `17948` | ✅ Production<br>✅ Preview<br>✅ Development |
   | `REDIS_PASSWORD` | `your-actual-password` | ✅ Production<br>✅ Preview<br>✅ Development |

   **Important Notes:**
   - Check all three environment types (Production, Preview, Development)
   - Use your actual Redis password (not the placeholder)
   - Do NOT commit these values to Git

4. **Save Variables**
   - Click "Save" for each variable
   - Verify all three variables are listed

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Add environment variables
vercel env add REDIS_HOST production
# Enter: redis-17948.c301.ap-south-1-1.ec2.redns.redis-cloud.com

vercel env add REDIS_PORT production
# Enter: 17948

vercel env add REDIS_PASSWORD production
# Enter: your-actual-password

# Repeat for preview and development environments
vercel env add REDIS_HOST preview
vercel env add REDIS_PORT preview
vercel env add REDIS_PASSWORD preview

vercel env add REDIS_HOST development
vercel env add REDIS_PORT development
vercel env add REDIS_PASSWORD development
```

### Step 3: Deploy to Vercel

#### Option A: Automatic Deployment (Git Push)

```bash
# Commit and push changes
git add .
git commit -m "Configure Redis Cloud for production"
git push origin main

# Vercel will automatically deploy
# Monitor deployment at: https://vercel.com/dashboard
```

#### Option B: Manual Deployment (Vercel CLI)

```bash
# Deploy to production
vercel --prod

# Or deploy to preview
vercel
```

### Step 4: Verify Deployment

1. **Check Deployment Logs**
   - Go to Vercel Dashboard → Deployments
   - Click on the latest deployment
   - Click "View Function Logs"
   - Look for Redis connection messages:
     ```
     ✅ Redis Cloud cache initialized successfully
        Host: redis-17948.c301.ap-south-1-1.ec2.redns.redis-cloud.com:17948
     ```

2. **Test Cache Stats Endpoint**
   ```bash
   curl https://your-app.vercel.app/api/cache/stats
   ```
   
   **Expected Response:**
   ```json
   {
     "type": "redis",
     "size": 0,
     "isAvailable": true,
     "host": "redis-17948.c301.ap-south-1-1.ec2.redns.redis-cloud.com",
     "port": 17948
   }
   ```

3. **Test Dashboard Load**
   - Navigate to `https://your-app.vercel.app/dashboard`
   - Open browser DevTools → Network tab
   - Refresh the page
   - Verify API calls are reduced (should see GraphQL call)
   - Check response times (should be faster with cache)

4. **Monitor Redis Cloud**
   - Go to Redis Cloud console
   - Check "Metrics" tab
   - Verify operations/sec is increasing
   - Monitor memory usage

### Step 5: Test Cache Functionality

1. **First Request (Cache Miss)**
   ```bash
   curl https://your-app.vercel.app/api/dashboard-data?employeeId=EMP001&role=admin
   # Response time: ~500ms (database query)
   ```

2. **Second Request (Cache Hit)**
   ```bash
   curl https://your-app.vercel.app/api/dashboard-data?employeeId=EMP001&role=admin
   # Response time: ~50ms (from Redis cache)
   ```

3. **Check Cache Keys**
   ```bash
   # Connect to Redis Cloud
   redis-cli -h redis-17948.c301.ap-south-1-1.ec2.redns.redis-cloud.com \
             -p 17948 \
             -a YOUR_PASSWORD \
             --tls
   
   # List all keys
   KEYS *
   
   # Check specific key
   GET dashboard
   
   # Check TTL
   TTL dashboard
   ```

## Troubleshooting

### Issue 1: Environment Variables Not Applied

**Symptoms:**
- Logs show: `⚠️ Redis Cloud credentials not found, using in-memory cache`
- Cache stats show `type: "memory"`

**Solutions:**
1. Verify environment variables are set in Vercel dashboard
2. Ensure variables are set for the correct environment (Production/Preview/Development)
3. Trigger a new deployment after adding variables
4. Check variable names are exactly: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

### Issue 2: Redis Connection Timeout

**Symptoms:**
- Logs show: `❌ Redis Cloud connection error: connect ETIMEDOUT`

**Solutions:**
1. Verify Redis Cloud database is active
2. Check Redis Cloud firewall allows connections from 0.0.0.0/0
3. Ensure TLS is enabled in Redis Cloud settings
4. Test connection from local machine first

### Issue 3: Wrong Password

**Symptoms:**
- Logs show: `❌ Redis Cloud connection error: WRONGPASS invalid username-password pair`

**Solutions:**
1. Copy password directly from Redis Cloud console
2. Ensure no extra spaces in password
3. Use "Default User" password (not custom user)
4. Reset password in Redis Cloud if needed

### Issue 4: Cache Not Working

**Symptoms:**
- Cache stats show `size: 0` even after multiple requests

**Solutions:**
1. Check if cache is being set in API routes
2. Verify TTL is not too short
3. Check Redis Cloud memory limit not exceeded
4. Review application logs for cache errors

## Performance Monitoring

### Vercel Analytics

1. **Enable Vercel Analytics**
   - Go to Vercel Dashboard → Analytics
   - Enable Web Analytics
   - Monitor page load times

2. **Check Function Logs**
   - Go to Deployments → Latest → View Function Logs
   - Filter for Redis-related logs
   - Monitor cache hit/miss rates

### Redis Cloud Metrics

1. **Operations/Second**
   - Monitor Redis commands per second
   - Should increase with traffic

2. **Memory Usage**
   - Track memory consumption
   - Set alerts for 80% usage

3. **Connected Clients**
   - Monitor active connections
   - Should match Vercel function instances

### Application Performance Dashboard

- Navigate to `/performance` in your application
- View real-time metrics:
  - Total requests
  - Average response time
  - Cache hit rate
  - Error rate
  - Requests by endpoint

## Rollback Procedure

If Redis Cloud causes issues, you can quickly rollback:

### Step 1: Remove Environment Variables

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Delete: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
3. Click "Save"

### Step 2: Redeploy

```bash
# Trigger new deployment
vercel --prod

# Or push to Git
git commit --allow-empty -m "Trigger redeploy without Redis"
git push origin main
```

### Step 3: Verify Fallback

```bash
# Check cache stats
curl https://your-app.vercel.app/api/cache/stats

# Expected response:
{
  "type": "memory",
  "size": 0,
  "isAvailable": false
}
```

## Security Best Practices

1. **Never Commit Credentials**
   - Keep `.env.local` in `.gitignore`
   - Use Vercel environment variables for production

2. **Rotate Passwords Regularly**
   - Change Redis password every 90 days
   - Update in Vercel environment variables

3. **Use TLS/SSL**
   - Always use TLS for production (enabled by default)
   - Verify certificate in production

4. **Monitor Access**
   - Review Redis Cloud access logs
   - Set up alerts for unusual activity

## Cost Optimization

### Free Tier Limits
- **Storage**: 30MB
- **Throughput**: 30 ops/sec
- **Connections**: 30 concurrent

### Tips to Stay Within Free Tier
1. Set appropriate TTL values (2-10 minutes)
2. Cache only frequently accessed data
3. Clear old cache regularly
4. Monitor memory usage

### When to Upgrade
- Memory usage consistently > 25MB
- Operations/sec > 25
- Need higher availability SLA

## Next Steps

1. ✅ Configure Redis Cloud environment variables in Vercel
2. ✅ Deploy to production
3. ✅ Verify Redis connection in logs
4. ✅ Test cache functionality
5. ✅ Monitor performance metrics
6. ✅ Set up alerts for high memory usage
7. ✅ Document Redis password in secure location (password manager)

## Support

- **Vercel Documentation**: [https://vercel.com/docs](https://vercel.com/docs)
- **Redis Cloud Support**: [https://redis.io/support/](https://redis.io/support/)
- **Application Logs**: Check Vercel function logs for detailed error messages

