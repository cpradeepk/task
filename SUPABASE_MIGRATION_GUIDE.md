# 🚀 Supabase Migration Guide - MySQL to PostgreSQL

**Estimated Time**: 10-20 hours (1-2 days)  
**Difficulty**: Medium  
**Cost**: $0/month (Free tier sufficient for internal app)  
**Recommended**: ✅ YES - Best long-term solution for serverless

---

## 📊 WHY MIGRATE TO SUPABASE?

### Current Problem (AWS RDS MySQL + Vercel Serverless)
- ❌ Each serverless instance creates its own connection pool
- ❌ Limited by max_connections (66-100 on free tier)
- ❌ Requires careful connection management
- ❌ Not designed for serverless architecture

### Supabase Solution
- ✅ **Built-in Connection Pooling**: Supavisor handles unlimited connections
- ✅ **Serverless-Native**: Designed for serverless/edge functions
- ✅ **No Connection Limits**: Pooler handles thousands of connections
- ✅ **Free Tier**: 500MB database, 2GB bandwidth, unlimited API requests
- ✅ **Better Performance**: Optimized for serverless workloads
- ✅ **Additional Features**: Auth, Storage, Realtime, Edge Functions

---

## 🎯 MIGRATION OVERVIEW

### Phase 1: Preparation (2-3 hours)
1. Create Supabase project
2. Export MySQL schema and data
3. Convert schema to PostgreSQL

### Phase 2: Schema Migration (2-4 hours)
1. Create tables in Supabase
2. Set up indexes and constraints
3. Verify schema

### Phase 3: Data Migration (1-2 hours)
1. Export data from MySQL
2. Import data to Supabase
3. Verify data integrity

### Phase 4: Code Changes (4-8 hours)
1. Update database connection config
2. Update SQL queries (MySQL → PostgreSQL syntax)
3. Test all queries

### Phase 5: Testing & Deployment (4-8 hours)
1. Test all features locally
2. Deploy to staging
3. Final testing
4. Deploy to production

---

## 📝 PHASE 1: PREPARATION

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in details:
   - **Name**: JSR Task Management
   - **Database Password**: (generate strong password)
   - **Region**: ap-south-1 (Mumbai) - same as your RDS
   - **Pricing Plan**: Free
5. Wait 2-3 minutes for project creation

### Step 2: Get Connection Details

After project creation, go to **Settings → Database**:

```
Host: db.xxxxxxxxxxxxx.supabase.co
Database: postgres
Port: 5432
User: postgres
Password: [your-password]

Connection String:
postgresql://postgres:[password]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

Connection Pooler (for serverless):
postgresql://postgres:[password]@db.xxxxxxxxxxxxx.supabase.co:6543/postgres?pgbouncer=true
```

**IMPORTANT**: Use the **Connection Pooler** (port 6543) for Vercel serverless!

---

## 🔄 PHASE 2: SCHEMA MIGRATION

### Step 1: Export MySQL Schema

```bash
# Export schema only (no data)
mysqldump \
  --host=ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com \
  --user=u806435594_swarg \
  --password='W8zTtc>qL3?' \
  --no-data \
  --skip-add-drop-table \
  --skip-comments \
  task > mysql_schema.sql
```

### Step 2: Convert MySQL to PostgreSQL

**Key Differences**:

| MySQL | PostgreSQL | Example |
|-------|------------|---------|
| `AUTO_INCREMENT` | `SERIAL` or `GENERATED ALWAYS AS IDENTITY` | `id SERIAL PRIMARY KEY` |
| `INT` | `INTEGER` | `id INTEGER` |
| `DATETIME` | `TIMESTAMP` | `created_at TIMESTAMP` |
| `TEXT` | `TEXT` | `description TEXT` |
| `JSON` | `JSONB` | `metadata JSONB` |
| `ENUM('a','b')` | `CHECK (col IN ('a','b'))` | `status VARCHAR(20) CHECK (status IN ('active','inactive'))` |
| `` backticks `` | `"double quotes"` | `"user"` (reserved word) |
| `FIND_IN_SET(val, list)` | `val = ANY(string_to_array(list, ','))` | - |

**Automated Conversion** (recommended):

Use online converter: [https://www.convert-in.com/mysql-to-postgres-sql-converter.htm](https://www.convert-in.com/mysql-to-postgres-sql-converter.htm)

Or use `pgloader` (command-line tool):

```bash
# Install pgloader
brew install pgloader  # macOS
# or
apt-get install pgloader  # Ubuntu

# Convert and load in one step
pgloader mysql://u806435594_swarg:W8zTtc>qL3?@ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com/task \
         postgresql://postgres:[password]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

**Manual Conversion Example**:

MySQL:
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role ENUM('employee', 'management', 'top_management', 'admin') DEFAULT 'employee',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

PostgreSQL:
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) CHECK (role IN ('employee', 'management', 'top_management', 'admin')) DEFAULT 'employee',
  status VARCHAR(20) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger for updated_at (PostgreSQL doesn't have ON UPDATE)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 3: Create Tables in Supabase

1. Go to Supabase Dashboard → **SQL Editor**
2. Paste converted schema
3. Click **Run**
4. Verify tables created: **Table Editor** tab

---

## 📦 PHASE 3: DATA MIGRATION

### Step 1: Export Data from MySQL

```bash
# Export data only (no schema)
mysqldump \
  --host=ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com \
  --user=u806435594_swarg \
  --password='W8zTtc>qL3?' \
  --no-create-info \
  --skip-extended-insert \
  --complete-insert \
  task > mysql_data.sql
```

### Step 2: Convert Data Format

**Replace MySQL-specific syntax**:

```bash
# Replace backticks with double quotes
sed -i "s/\`/\"/g" mysql_data.sql

# Replace MySQL INSERT syntax
sed -i "s/INSERT INTO/INSERT INTO/g" mysql_data.sql
```

### Step 3: Import Data to Supabase

**Option A: Using Supabase SQL Editor**
1. Go to **SQL Editor**
2. Paste data SQL
3. Click **Run**

**Option B: Using psql (faster for large datasets)**
```bash
psql "postgresql://postgres:[password]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres" < mysql_data.sql
```

### Step 4: Verify Data

```sql
-- Check row counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'bugs', COUNT(*) FROM bugs
UNION ALL
SELECT 'projects', COUNT(*) FROM projects;
```

---

## 💻 PHASE 4: CODE CHANGES

### Step 1: Update Database Connection Config

**File**: `apps/web/src/lib/db/config.ts`

```typescript
import { Pool } from 'pg'  // Change from mysql2 to pg

// Database connection configuration
export const DB_CONFIG = {
  // Use Supabase connection pooler (port 6543) for serverless
  connectionString: process.env.DATABASE_URL || 
    'postgresql://postgres:[password]@db.xxxxxxxxxxxxx.supabase.co:6543/postgres?pgbouncer=true',
  
  // Connection pool settings - OPTIMIZED FOR SERVERLESS
  max: 3,  // Maximum connections (was connectionLimit)
  idleTimeoutMillis: 10000,  // Close idle connections after 10 seconds
  connectionTimeoutMillis: 5000,  // 5 seconds to establish connection
}

// Create connection pool
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(DB_CONFIG)
    
    pool.on('connect', () => {
      console.log('🔵 [DB] New connection established')
    })
    
    pool.on('error', (err) => {
      console.error('❌ [DB] Unexpected error on idle client', err)
    })
  }
  return pool
}

// Execute a query with automatic connection management
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T> {
  const pool = getPool()
  const result = await pool.query(sql, params)
  return result.rows as T
}

// Execute a query and return the first row
export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T[]>(sql, params)
  return rows.length > 0 ? rows[0] : null
}
```

### Step 2: Update SQL Queries

**Common Changes Needed**:

#### 1. Parameter Placeholders
MySQL uses `?`, PostgreSQL uses `$1, $2, $3`

**Before (MySQL)**:
```typescript
await query('SELECT * FROM users WHERE email = ? AND status = ?', [email, status])
```

**After (PostgreSQL)**:
```typescript
await query('SELECT * FROM users WHERE email = $1 AND status = $2', [email, status])
```

#### 2. FIND_IN_SET() Function
**Before (MySQL)**:
```typescript
await query('SELECT * FROM tasks WHERE FIND_IN_SET(?, support) > 0', [employeeId])
```

**After (PostgreSQL)**:
```typescript
await query('SELECT * FROM tasks WHERE $1 = ANY(string_to_array(support, \',\'))', [employeeId])
```

Or better, use JSONB array:
```typescript
// If support is JSONB array: ["AM-001", "AM-002"]
await query('SELECT * FROM tasks WHERE support @> $1::jsonb', [JSON.stringify([employeeId])])
```

#### 3. JSON Functions
**Before (MySQL)**:
```typescript
await query('SELECT * FROM settings WHERE JSON_EXTRACT(metadata, "$.key") = ?', [value])
```

**After (PostgreSQL)**:
```typescript
await query('SELECT * FROM settings WHERE metadata->>\'key\' = $1', [value])
```

#### 4. LIMIT with Offset
**Before (MySQL)**:
```typescript
await query('SELECT * FROM tasks LIMIT ?, ?', [offset, limit])
```

**After (PostgreSQL)**:
```typescript
await query('SELECT * FROM tasks LIMIT $1 OFFSET $2', [limit, offset])
```

### Step 3: Update Environment Variables

**File**: `apps/web/.env.local`

```bash
# Old MySQL config (comment out)
# MYSQL_HOST=ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com
# MYSQL_PORT=3306
# MYSQL_USER=u806435594_swarg
# MYSQL_PASSWORD=W8zTtc>qL3?
# MYSQL_DATABASE=task

# New Supabase config
DATABASE_URL=postgresql://postgres:[password]@db.xxxxxxxxxxxxx.supabase.co:6543/postgres?pgbouncer=true
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Vercel Environment Variables**:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
3. Redeploy

---

## 🧪 PHASE 5: TESTING & DEPLOYMENT

### Step 1: Local Testing

```bash
# Install PostgreSQL client
npm install pg
npm install --save-dev @types/pg

# Run development server
cd apps/web
npm run dev

# Test all features:
# - Login
# - Dashboard
# - Create/Edit/Delete tasks
# - Create/Edit/Delete bugs
# - User management
# - Projects
# - Leave/WFH applications
```

### Step 2: Verify All Queries Work

Create a test script:

```typescript
// test-db.ts
import { query } from './src/lib/db/config'

async function testQueries() {
  try {
    // Test 1: Simple SELECT
    const users = await query('SELECT * FROM users LIMIT 5')
    console.log('✅ Users query:', users.length)
    
    // Test 2: Parameterized query
    const user = await query('SELECT * FROM users WHERE employee_id = $1', ['AM-0001'])
    console.log('✅ Parameterized query:', user.length)
    
    // Test 3: JOIN query
    const tasks = await query(`
      SELECT t.*, u.name as assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.employee_id
      LIMIT 5
    `)
    console.log('✅ JOIN query:', tasks.length)
    
    console.log('\n✅ All tests passed!')
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testQueries()
```

### Step 3: Deploy to Production

```bash
# Commit changes
git add -A
git commit -m "feat: Migrate from MySQL to Supabase PostgreSQL"
git push origin main

# Vercel will auto-deploy
# Monitor deployment logs for errors
```

---

## 📊 POST-MIGRATION CHECKLIST

- [ ] All tables migrated
- [ ] All data migrated and verified
- [ ] All queries updated (MySQL → PostgreSQL syntax)
- [ ] Environment variables updated
- [ ] Local testing passed
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] Monitor for errors (24-48 hours)
- [ ] Verify connection pool metrics (`/api/db-status`)
- [ ] Update documentation

---

## 🎉 BENEFITS AFTER MIGRATION

### Before (MySQL + Vercel)
- ❌ 3 connections × 20 instances = 60 connections (at limit)
- ❌ Constant connection monitoring required
- ❌ Risk of "Too many connections" errors
- ❌ Manual connection pool management

### After (Supabase + Vercel)
- ✅ Unlimited connections via Supavisor pooler
- ✅ No connection limit worries
- ✅ Better serverless performance
- ✅ Additional features (Auth, Storage, Realtime)
- ✅ Free tier sufficient for internal app

---

## 💰 COST COMPARISON

| Provider | Tier | Database | Bandwidth | Price |
|----------|------|----------|-----------|-------|
| AWS RDS MySQL | Free | 20GB | Limited | $0 (12 months) |
| AWS RDS MySQL | t3.micro | 20GB | Unlimited | $15-30/month |
| **Supabase** | **Free** | **500MB** | **2GB/month** | **$0** |
| **Supabase** | **Pro** | **8GB** | **50GB/month** | **$25/month** |

**For your internal app**: Supabase Free tier is sufficient

---

## 🆘 TROUBLESHOOTING

### Issue: "relation does not exist"
**Cause**: Table name case sensitivity  
**Fix**: Use lowercase table names or quote them: `"Users"`

### Issue: "syntax error near ?"
**Cause**: Using MySQL placeholders  
**Fix**: Replace `?` with `$1, $2, $3`

### Issue: "column does not exist"
**Cause**: Column name case sensitivity  
**Fix**: Use lowercase or quote: `"employeeId"`

### Issue: Connection timeout
**Cause**: Not using connection pooler  
**Fix**: Use port 6543 with `?pgbouncer=true`

---

**Estimated Total Time**: 10-20 hours  
**Recommended Timeline**: 1-2 days  
**Priority**: 🟡 MEDIUM (Emergency fixes already deployed)  
**ROI**: ✅ HIGH (Eliminates connection issues permanently)

