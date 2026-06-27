-- ============================================================================
-- Migration 057: Per-(sub)project release configuration
-- Date: 2026-06-27
-- Database: PostgreSQL/Supabase
-- Description:
--   Add release configuration to projects so a sub-project can enable the
--   release work-item type and own its default release checklist template.
--   - release_enabled: toggle that exposes the 'release' type on the bug form
--     for this (sub)project.
--   - release_checklist: JSONB { "sections": [ ... ] } default template,
--     the single source of truth for release test cases + steps.
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS release_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS release_checklist JSONB;
