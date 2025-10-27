# Database Quick Fixes

## Common SQL Errors and Solutions

### Error 1052: Column is Ambiguous

**Error Message**:
```
Error Code: 1052. Column 'employee_id' in field list is ambiguous
```

**Cause**: When using `ON DUPLICATE KEY UPDATE`, MySQL doesn't know which table's column you're referring to.

**Original Query (WRONG)**:
```sql
INSERT INTO user_notification_preferences (employee_id) 
SELECT employee_id  
FROM users  
WHERE employee_id NOT IN (
    SELECT employee_id 
    FROM user_notification_preferences
) 
ON DUPLICATE KEY UPDATE employee_id = employee_id
```

**Solution 1: Use Table Aliases**:
```sql
INSERT INTO user_notification_preferences (employee_id) 
SELECT u.employee_id 
FROM users u
WHERE u.employee_id NOT IN (
    SELECT employee_id 
    FROM user_notification_preferences
) 
ON DUPLICATE KEY UPDATE 
    user_notification_preferences.employee_id = VALUES(employee_id);
```

**Solution 2: Use INSERT IGNORE (Recommended)**:
```sql
INSERT IGNORE INTO user_notification_preferences (employee_id) 
SELECT employee_id 
FROM users
WHERE status = 'active';
```

---

## Initialize Notification Preferences for All Users

### Quick Command
```sql
-- Insert default preferences for all active users
INSERT IGNORE INTO user_notification_preferences (employee_id) 
SELECT employee_id 
FROM users
WHERE status = 'active';
```

### Verify Insertion
```sql
-- Check how many users have preferences
SELECT 
    (SELECT COUNT(*) FROM users WHERE status = 'active') as total_active_users,
    (SELECT COUNT(*) FROM user_notification_preferences) as users_with_preferences;
```

### Check Missing Preferences
```sql
-- Find users without notification preferences
SELECT u.employee_id, u.name, u.email
FROM users u
LEFT JOIN user_notification_preferences unp ON u.employee_id = unp.employee_id
WHERE u.status = 'active' AND unp.id IS NULL;
```

---

## Run Migration 009 and 010

### Step 1: Run Migration 009 (Create Table)
```bash
cd /media/pradeep/Work/projects/jsr_web_app-jsr_tool
mysql -h ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com \
      -u u806435594_swarg \
      -p \
      task < apps/web/database/migrations/009_user_notification_preferences.sql
```

### Step 2: Run Migration 010 (Initialize Data)
```bash
mysql -h ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com \
      -u u806435594_swarg \
      -p \
      task < apps/web/database/migrations/010_initialize_notification_preferences.sql
```

### Or Use Node.js Script
```bash
cd /media/pradeep/Work/projects/jsr_web_app-jsr_tool
node scripts/run-migrations.js
```

---

## Verify Table Exists

```sql
-- Check if table exists
SHOW TABLES LIKE 'user_notification_preferences';

-- Check table structure
DESCRIBE user_notification_preferences;

-- Check table data
SELECT COUNT(*) FROM user_notification_preferences;
```

---

## Common Database Operations

### 1. Check All Users
```sql
SELECT employee_id, name, email, status 
FROM users 
ORDER BY employee_id;
```

### 2. Check Notification Preferences
```sql
SELECT 
    unp.employee_id,
    u.name,
    unp.email_enabled,
    unp.telegram_enabled,
    unp.in_app_enabled,
    unp.created_at
FROM user_notification_preferences unp
JOIN users u ON unp.employee_id = u.employee_id
ORDER BY unp.created_at DESC;
```

### 3. Reset Preferences for a User
```sql
-- Delete existing preferences
DELETE FROM user_notification_preferences 
WHERE employee_id = 'AM-0002';

-- Insert default preferences
INSERT INTO user_notification_preferences (employee_id) 
VALUES ('AM-0002');
```

### 4. Update Specific Preference
```sql
-- Enable email notifications for a user
UPDATE user_notification_preferences 
SET email_enabled = 1 
WHERE employee_id = 'AM-0002';

-- Disable all notifications for a user
UPDATE user_notification_preferences 
SET email_enabled = 0, 
    telegram_enabled = 0, 
    in_app_enabled = 0 
WHERE employee_id = 'AM-0002';
```

---

## Troubleshooting

### Issue: Table doesn't exist
**Solution**: Run migration 009
```bash
mysql -h <host> -u <user> -p <database> < apps/web/database/migrations/009_user_notification_preferences.sql
```

### Issue: No preferences for users
**Solution**: Run migration 010
```bash
mysql -h <host> -u <user> -p <database> < apps/web/database/migrations/010_initialize_notification_preferences.sql
```

### Issue: Duplicate key error
**Solution**: Use `INSERT IGNORE` instead of `INSERT`

### Issue: Foreign key constraint fails
**Solution**: Ensure the user exists in the `users` table first
```sql
-- Check if user exists
SELECT * FROM users WHERE employee_id = 'AM-0002';

-- If not, create user first, then add preferences
```

---

## Database Connection Info

### Production Database (AWS RDS)
```
Host: ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com
Port: 3306
User: u806435594_swarg
Database: task
```

### Connect via MySQL CLI
```bash
mysql -h ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com \
      -u u806435594_swarg \
      -p \
      task
```

### Connect via MySQL Workbench
1. Open MySQL Workbench
2. Create new connection
3. Enter connection details above
4. Test connection
5. Connect

---

## Migration Status Check

```sql
-- Check which migrations have been run
-- (Assuming you have a migrations table)
SELECT * FROM migrations ORDER BY id DESC;

-- If no migrations table, check tables manually
SHOW TABLES;
```

---

## Backup Before Changes

```bash
# Backup entire database
mysqldump -h <host> -u <user> -p task > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup specific table
mysqldump -h <host> -u <user> -p task user_notification_preferences > backup_preferences_$(date +%Y%m%d_%H%M%S).sql
```

---

## Quick Reference Commands

```bash
# Run all migrations
cd /media/pradeep/Work/projects/jsr_web_app-jsr_tool
node scripts/run-migrations.js

# Check database connection
mysql -h <host> -u <user> -p -e "SELECT 1"

# List all tables
mysql -h <host> -u <user> -p task -e "SHOW TABLES"

# Count records in table
mysql -h <host> -u <user> -p task -e "SELECT COUNT(*) FROM user_notification_preferences"
```


