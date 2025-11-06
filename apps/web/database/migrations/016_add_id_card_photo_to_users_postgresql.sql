-- ============================================================================
-- Migration 016: Add id_card_photo column to users table (PostgreSQL)
-- ============================================================================
-- Description: 
--   Add id_card_photo column to store AWS S3 URL for employee ID card photos
-- Created: 2025-11-06
-- Database: PostgreSQL
-- ============================================================================

-- Add id_card_photo column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_card_photo VARCHAR(500) NULL;

-- Add comment to column (PostgreSQL syntax)
COMMENT ON COLUMN users.id_card_photo IS 'AWS S3 URL for employee ID card photo';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'id_card_photo';

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

