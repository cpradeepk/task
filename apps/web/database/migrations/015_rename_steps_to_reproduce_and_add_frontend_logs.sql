-- ============================================================================
-- Migration 015: Rename steps_to_reproduce to server_logs and add frontend_logs
-- ============================================================================
-- Description: 
--   Part A: Rename existing column steps_to_reproduce to server_logs
--   Part B: Add new column frontend_logs (TEXT, nullable)
-- Created: 2025-11-03
-- ============================================================================

-- Part A: Rename steps_to_reproduce to server_logs
ALTER TABLE bugs RENAME COLUMN steps_to_reproduce TO server_logs;

-- Part B: Add frontend_logs column
ALTER TABLE bugs ADD COLUMN frontend_logs TEXT NULL COMMENT 'Frontend console logs and errors';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
DESCRIBE bugs;

-- Verify the columns exist
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'bugs' 
  AND COLUMN_NAME IN ('server_logs', 'frontend_logs')
ORDER BY COLUMN_NAME;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 
-- Changes:
-- 1. Renamed steps_to_reproduce → server_logs
--    - All existing data is preserved
--    - Column type remains TEXT
--    - Nullable remains TRUE
-- 
-- 2. Added frontend_logs column
--    - Data type: TEXT
--    - Nullable: TRUE (optional field)
--    - Purpose: Store frontend console logs and errors
-- 
-- Code Changes Required:
-- 1. Update Bug interface in apps/web/src/lib/types.ts
-- 2. Update BugFormData interface in apps/web/src/lib/types.ts
-- 3. Update BugRow interface in apps/web/src/lib/db/bugs.ts
-- 4. Update mapBugRowToBug() function in apps/web/src/lib/db/bugs.ts
-- 5. Update createBug() function in apps/web/src/lib/db/bugs.ts
-- 6. Update bug API endpoints in apps/web/src/app/api/bugs/route.ts
-- 7. Update bug creation form in apps/web/src/app/bugs/create/page.tsx
-- 8. Update bug edit modal in apps/web/src/components/bugs/BugEditModal.tsx
-- 9. Update bug detail page in apps/web/src/app/bugs/[bugId]/page.tsx
-- 
-- ============================================================================

