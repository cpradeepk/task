-- ============================================================================
-- Migration 016: Add id_card_photo column to users table
-- ============================================================================
-- Description: 
--   Add id_card_photo column to store AWS S3 URL for employee ID card photos
-- Created: 2025-11-03
-- ============================================================================

-- Add id_card_photo column to users table
ALTER TABLE users ADD COLUMN id_card_photo VARCHAR(500) NULL COMMENT 'AWS S3 URL for employee ID card photo';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
DESCRIBE users;

-- Verify the column exists
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'id_card_photo'
ORDER BY COLUMN_NAME;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 
-- Changes:
-- 1. Added id_card_photo column
--    - Data type: VARCHAR(500)
--    - Nullable: TRUE (optional field)
--    - Purpose: Store AWS S3 URL for employee ID card photo
--    - Example: https://amtariksha.s3.ap-south-1.amazonaws.com/id-cards/1234567890-abc123-photo.jpg
-- 
-- Code Changes Required:
-- 1. Update User interface in apps/web/src/lib/types.ts
-- 2. Update user API endpoints to handle id_card_photo field
-- 3. Update profile page to include photo upload functionality
-- 4. Update IDCard component to display the uploaded photo
-- 
-- ============================================================================

