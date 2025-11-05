-- Migration: Add development_prompt field to bugs table
-- Date: 2025-01-05
-- Description: Adds a development_prompt column to store development instructions for bug fixes

-- Add development_prompt column to bugs table
ALTER TABLE bugs ADD COLUMN IF NOT EXISTS development_prompt TEXT NULL;

-- Add comment to document the column
COMMENT ON COLUMN bugs.development_prompt IS 'Development prompt or instructions for fixing the bug';

