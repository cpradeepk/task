# Vercel Deployment Instructions - PostgreSQL Migration

## ✅ Migration Status

The MySQL to PostgreSQL migration is **COMPLETE** and has been successfully tested locally:

- ✅ Database connection pool working correctly
- ✅ All SQL queries converted to PostgreSQL syntax
- ✅ Settings API tested and working (200 OK)
- ✅ Users API tested and working (11 users returned)
- ✅ Projects API tested and working (13 projects returned)
- ✅ Code committed and pushed to GitHub (commit: 8b6fb49)

## 🚀 Vercel Deployment Steps

### Step 1: Update Environment Variables in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project (JSR Task Management)
3. Go to **Settings** → **Environment Variables**
4. Update/Add the following environment variable:

**DATABASE_URL** (Production, Preview, Development):
```
postgresql://postgres:W8zTtc%3EqL3%3F@db.rbckjkdohzbclomrufrx.supabase.co:6543/postgres?pgbouncer=true
```

**IMPORTANT NOTES**:
- The password MUST be URL-encoded: `W8zTtc%3EqL3%3F` (not `W8zTtc>qL3?`)
- Use port **6543** (connection pooler with PgBouncer) for serverless
- The `?pgbouncer=true` parameter is required for Supabase connection pooling

5. **Remove old MySQL environment variables** (if they exist):
   - `MYSQL_HOST`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`
   - `MYSQL_PORT`

6. **Keep these environment variables** (they are still needed):
   - `JWT_SECRET`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (email service)
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` (S3 file uploads)
   - Any other non-database environment variables

### Step 2: Monitor Auto-Deployment

1. After updating the environment variables, Vercel will automatically deploy the latest commit from GitHub
2. Go to **Deployments** tab in Vercel dashboard
3. Wait for the deployment to complete (usually 2-3 minutes)
4. Check the deployment logs for any errors:
   - Look for "🔵 [DB] New PostgreSQL connection pool created" message
   - Verify there are no database connection errors
   - Check for any SQL syntax errors

### Step 3: Test Production Application

Once deployment is complete, test the following endpoints:

1. **Database Status Endpoint**:
   ```
   https://your-app.vercel.app/api/db-status
   ```
   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "health": {
         "status": "healthy",
         "warnings": ["Database ping successful"]
       }
     }
   }
   ```

2. **Settings API**:
   ```
   https://your-app.vercel.app/api/settings?grouped=true&activeOnly=true
   ```
   Should return all dropdown settings (departments, severities, priorities, etc.)

3. **Users API**:
   ```
   https://your-app.vercel.app/api/users
   ```
   Should return list of users

4. **Projects API**:
   ```
   https://your-app.vercel.app/api/projects
   ```
   Should return list of projects

5. **Login Functionality**:
   - Try logging in with a test user
   - Verify authentication works correctly

### Step 4: Verify Data Integrity

1. Log into the application and verify:
   - All users are visible
   - All projects are visible
   - All tasks are visible
   - All bugs are visible
   - Settings dropdowns are populated correctly
   - Leave/WFH applications are visible

2. Test CRUD operations:
   - Create a new task
   - Update an existing task
   - Create a new bug
   - Add a comment to a bug
   - Submit a leave application

3. Check Vercel logs for any errors:
   - Go to **Deployments** → Select latest deployment → **Function Logs**
   - Monitor for any database errors or SQL syntax issues

### Step 5: Monitor Connection Pool Health

1. Check the `/api/db-status` endpoint periodically
2. Monitor Vercel function logs for connection pool events:
   - "🔵 [DB] New PostgreSQL connection pool created"
   - "🔵 [DB] New client connected to pool"
   - "🔵 [DB] Client acquired from pool"
   - "🔴 [DB] Client removed from pool"

3. Verify connection pool is not exhausting connections:
   - `totalCount` should stay low (0-3 per serverless instance)
   - `waitingCount` should be 0 (no queued requests)

## 📊 Migration Summary

### What Changed

1. **Database**: MySQL (AWS RDS) → PostgreSQL (Supabase)
2. **Connection Library**: `mysql2` → `pg`
3. **Connection Pooling**: Optimized for Vercel serverless (max: 3 connections per instance)
4. **SQL Syntax**: All queries converted to PostgreSQL syntax
5. **Data Migration**: 100% of data migrated across all 12 tables

### Key Benefits

1. **Better Serverless Support**: Supabase with PgBouncer is designed for serverless
2. **Connection Pooling**: PgBouncer handles connection pooling at the database level
3. **No More Connection Exhaustion**: Eliminates "Too many connections" errors
4. **Better Performance**: PostgreSQL is optimized for modern web applications
5. **Free Tier**: Supabase free tier is more generous than AWS RDS free tier

### Technical Details

- **Connection String**: Uses port 6543 (PgBouncer connection pooler)
- **SSL**: Required and configured (`rejectUnauthorized: false`)
- **Pool Size**: 3 connections per serverless instance (down from 150 in MySQL)
- **Timeouts**: 
  - Connection timeout: 5 seconds
  - Idle timeout: 10 seconds
- **Password**: URL-encoded to handle special characters (`>` and `?`)

## 🔧 Troubleshooting

### If deployment fails:

1. **Check environment variables**:
   - Verify `DATABASE_URL` is set correctly
   - Verify password is URL-encoded: `W8zTtc%3EqL3%3F`
   - Verify port is 6543 (not 5432)

2. **Check deployment logs**:
   - Look for "unsupported startup parameter" errors
   - Look for "Cannot read properties of undefined" errors
   - Look for SQL syntax errors

3. **Check Supabase connection**:
   - Verify Supabase project is active
   - Verify database credentials are correct
   - Check Supabase dashboard for connection errors

### If API endpoints return errors:

1. **Check Vercel function logs**:
   - Go to Deployments → Function Logs
   - Look for database connection errors
   - Look for SQL syntax errors

2. **Test database connection**:
   - Visit `/api/db-status` endpoint
   - Check if `health.status` is "healthy"
   - Check for any warnings

3. **Verify data migration**:
   - Log into Supabase dashboard
   - Check if all tables have data
   - Verify row counts match MySQL database

## 📝 Rollback Plan (If Needed)

If you need to rollback to MySQL:

1. Revert the Git commit:
   ```bash
   git revert 8b6fb49
   git push origin main
   ```

2. Update Vercel environment variables back to MySQL:
   ```
   MYSQL_HOST=ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com
   MYSQL_USER=u806435594_swarg
   MYSQL_PASSWORD=<your-mysql-password>
   MYSQL_DATABASE=task
   MYSQL_PORT=3306
   ```

3. Remove `DATABASE_URL` environment variable

4. Wait for Vercel to redeploy

## ✅ Success Criteria

The migration is successful when:

1. ✅ Vercel deployment completes without errors
2. ✅ `/api/db-status` returns "healthy" status
3. ✅ All API endpoints return data correctly
4. ✅ Login functionality works
5. ✅ CRUD operations work (create, read, update, delete)
6. ✅ No database connection errors in Vercel logs
7. ✅ Connection pool stays healthy (no exhaustion)

## 🎉 Next Steps After Successful Deployment

1. Monitor the application for 24-48 hours
2. Check Vercel logs daily for any errors
3. Monitor connection pool health via `/api/db-status`
4. Consider setting up alerts for database errors
5. Update documentation with new database details
6. Decommission MySQL database (after confirming everything works)

---

**Deployment Date**: 2025-11-02  
**Commit Hash**: 8b6fb49  
**Migration Status**: ✅ COMPLETE  
**Local Testing**: ✅ PASSED  
**Ready for Production**: ✅ YES

