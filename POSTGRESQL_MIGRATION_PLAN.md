# PostgreSQL Migration Plan - MySQL to Supabase

**Date**: 2025-11-02  
**Status**: 🟡 IN PROGRESS  
**Database**: MySQL (AWS RDS) → PostgreSQL (Supabase)

---

## 📊 MIGRATION OVERVIEW

### Supabase Connection Details
- **Host**: `db.rbckjkdohzbclomrufrx.supabase.co`
- **Port**: `6543` (connection pooler - for Vercel serverless)
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: `W8zTtc>qL3?`
- **Connection String**: `postgresql://postgres:W8zTtc>qL3?@db.rbckjkdohzbclomrufrx.supabase.co:6543/postgres?pgbouncer=true`

---

## 📋 FILES REQUIRING CHANGES

### 1. Database Configuration (1 file)
- ✅ `apps/web/src/lib/db/config.ts` - Replace mysql2 with pg library

### 2. Database Service Files (13 files)
All files in `apps/web/src/lib/db/`:
- ✅ `activityLog.ts` - Update SQL queries
- ✅ `bugSubtasks.ts` - Update SQL queries
- ✅ `bugs.ts` - Update SQL queries
- ✅ `index.ts` - No changes needed (just exports)
- ✅ `leaves.ts` - Update SQL queries
- ✅ `notificationPreferences.ts` - Update SQL queries
- ✅ `permissions.ts` - Update SQL queries
- ✅ `projects.ts` - Update SQL queries (CAST AS UNSIGNED)
- ✅ `settings.ts` - Update SQL queries
- ✅ `subtasks.ts` - Update SQL queries
- ✅ `tasks.ts` - Update SQL queries
- ✅ `users.ts` - Update SQL queries
- ✅ `wfh.ts` - Update SQL queries

### 3. GraphQL Resolvers (1 file)
- ✅ `apps/web/src/graphql/resolvers.ts` - Update SQL queries (FIND_IN_SET)

### 4. API Routes (40+ files)
All files in `apps/web/src/app/api/**/route.ts` - Most don't need changes (use service layer)

### 5. Environment Variables
- ✅ `apps/web/.env.local` - Update database connection
- ✅ Vercel Environment Variables - Update in dashboard

### 6. Package Dependencies
- ✅ `apps/web/package.json` - Add `pg` and `@types/pg`, remove `mysql2`

---

## 🔄 SQL SYNTAX CONVERSIONS NEEDED

### 1. Parameter Placeholders (CRITICAL - ALL QUERIES)
**MySQL**: `?`  
**PostgreSQL**: `$1, $2, $3`

**Example**:
```typescript
// Before (MySQL)
await query('SELECT * FROM users WHERE email = ? AND status = ?', [email, status])

// After (PostgreSQL)
await query('SELECT * FROM users WHERE email = $1 AND status = $2', [email, status])
```

**Files Affected**: ALL database service files (13 files)

---

### 2. FIND_IN_SET() Function
**MySQL**: `FIND_IN_SET(?, support) > 0`  
**PostgreSQL**: `$1 = ANY(string_to_array(support, ','))`

**Example**:
```typescript
// Before (MySQL)
await query('SELECT * FROM tasks WHERE FIND_IN_SET(?, support) > 0', [employeeId])

// After (PostgreSQL)
await query('SELECT * FROM tasks WHERE $1 = ANY(string_to_array(support, \',\'))', [employeeId])
```

**Files Affected**:
- `apps/web/src/graphql/resolvers.ts` (dashboard query)
- Any other files using support field

---

### 3. CAST(... AS UNSIGNED)
**MySQL**: `CAST(SUBSTRING(project_id, 5) AS UNSIGNED)`  
**PostgreSQL**: `CAST(SUBSTRING(project_id, 5) AS INTEGER)`

**Example**:
```typescript
// Before (MySQL)
'SELECT MAX(CAST(SUBSTRING(project_id, 5) AS UNSIGNED)) as max_id FROM projects'

// After (PostgreSQL)
'SELECT MAX(CAST(SUBSTRING(project_id FROM 5) AS INTEGER)) as max_id FROM projects'
```

**Files Affected**:
- `apps/web/src/lib/db/projects.ts` (getNextProjectId function)

---

### 4. SUBSTRING() Function
**MySQL**: `SUBSTRING(str, pos, len)` or `SUBSTRING(str, pos)`  
**PostgreSQL**: `SUBSTRING(str FROM pos FOR len)` or `SUBSTRING(str FROM pos)`

**Example**:
```typescript
// Before (MySQL)
SUBSTRING(project_id, 5)

// After (PostgreSQL)
SUBSTRING(project_id FROM 5)
```

---

### 5. LIMIT with Offset
**MySQL**: `LIMIT offset, limit`  
**PostgreSQL**: `LIMIT limit OFFSET offset`

**Example**:
```typescript
// Before (MySQL)
await query('SELECT * FROM tasks LIMIT ?, ?', [offset, limit])

// After (PostgreSQL)
await query('SELECT * FROM tasks LIMIT $1 OFFSET $2', [limit, offset])
```

---

## 🗄️ SCHEMA CONVERSION

### 1. AUTO_INCREMENT → SERIAL
**MySQL**:
```sql
id INT AUTO_INCREMENT PRIMARY KEY
```

**PostgreSQL**:
```sql
id SERIAL PRIMARY KEY
```

---

### 2. ENUM → CHECK Constraint
**MySQL**:
```sql
role ENUM('employee', 'management', 'top_management', 'admin') DEFAULT 'employee'
```

**PostgreSQL**:
```sql
role VARCHAR(20) CHECK (role IN ('employee', 'management', 'top_management', 'admin')) DEFAULT 'employee'
```

---

### 3. DATETIME → TIMESTAMP
**MySQL**:
```sql
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

**PostgreSQL**:
```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

---

### 4. ON UPDATE CURRENT_TIMESTAMP → Trigger
**MySQL**:
```sql
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

**PostgreSQL**:
```sql
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- Add trigger
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

---

### 5. ON DUPLICATE KEY UPDATE → ON CONFLICT
**MySQL**:
```sql
INSERT INTO users (employee_id, name) VALUES (?, ?)
ON DUPLICATE KEY UPDATE name = VALUES(name)
```

**PostgreSQL**:
```sql
INSERT INTO users (employee_id, name) VALUES ($1, $2)
ON CONFLICT (employee_id) DO UPDATE SET name = EXCLUDED.name
```

---

## 📦 PACKAGE CHANGES

### Remove
```json
"mysql2": "^3.11.5"
```

### Add
```json
"pg": "^8.11.3",
"@types/pg": "^8.10.9"
```

---

## 🔧 IMPLEMENTATION STEPS

### Step 1: Export MySQL Schema and Data ✅
```bash
# Export schema
mysqldump \
  --host=ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com \
  --user=u806435594_swarg \
  --password='W8zTtc>qL3?' \
  --no-data \
  --skip-add-drop-table \
  task > mysql_schema.sql

# Export data
mysqldump \
  --host=ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com \
  --user=u806435594_swarg \
  --password='W8zTtc>qL3?' \
  --no-create-info \
  --complete-insert \
  task > mysql_data.sql
```

### Step 2: Convert Schema to PostgreSQL ✅
- Convert AUTO_INCREMENT → SERIAL
- Convert ENUM → CHECK constraints
- Convert DATETIME → TIMESTAMP
- Add triggers for updated_at fields
- Convert backticks to double quotes

### Step 3: Import to Supabase ✅
```bash
# Import schema
psql "postgresql://postgres:W8zTtc>qL3?@db.rbckjkdohzbclomrufrx.supabase.co:5432/postgres" < postgres_schema.sql

# Import data
psql "postgresql://postgres:W8zTtc>qL3?@db.rbckjkdohzbclomrufrx.supabase.co:5432/postgres" < postgres_data.sql
```

### Step 4: Update Code ✅
1. Update `apps/web/src/lib/db/config.ts` - Replace mysql2 with pg
2. Update all database service files - Convert SQL syntax
3. Update GraphQL resolvers - Convert SQL syntax
4. Update package.json - Add pg, remove mysql2

### Step 5: Update Environment Variables ✅
```bash
# .env.local
DATABASE_URL=postgresql://postgres:W8zTtc>qL3?@db.rbckjkdohzbclomrufrx.supabase.co:6543/postgres?pgbouncer=true
```

### Step 6: Test Locally ✅
- Test all CRUD operations
- Test all features
- Verify data integrity

### Step 7: Deploy to Production ✅
- Update Vercel environment variables
- Deploy to production
- Monitor for errors

---

## ✅ VERIFICATION CHECKLIST

- [ ] Schema exported from MySQL
- [ ] Data exported from MySQL
- [ ] Schema converted to PostgreSQL
- [ ] Schema imported to Supabase
- [ ] Data imported to Supabase
- [ ] Row counts match (MySQL vs PostgreSQL)
- [ ] config.ts updated (mysql2 → pg)
- [ ] All service files updated (? → $1, $2)
- [ ] FIND_IN_SET() converted
- [ ] CAST AS UNSIGNED converted
- [ ] GraphQL resolvers updated
- [ ] package.json updated
- [ ] .env.local updated
- [ ] Local testing passed
- [ ] Vercel env vars updated
- [ ] Production deployment successful
- [ ] All features working

---

**Status**: Ready to begin implementation  
**Next Step**: Export MySQL schema and data

