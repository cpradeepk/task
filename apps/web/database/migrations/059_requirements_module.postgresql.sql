-- Migration 059: Requirements module
-- Tables: requirements, requirement_sections, requirement_section_revisions (append-only),
--         requirement_approvals (append-only), requirement_dev_links, requirement_baselines (append-only).
-- Conventions follow the repo: SERIAL id PK + human string key as the real FK target,
-- soft delete via deleted_at/deleted_by, updated_at via update_updated_at_column() trigger,
-- CHECK-constraint enums in Title Case, RLS enabled (app connects as postgres and bypasses RLS).

-- ── requirements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requirements (
  id SERIAL PRIMARY KEY,
  requirement_id VARCHAR(50) NOT NULL UNIQUE,            -- REQ-0001 (app-generated)
  project_id VARCHAR(100) NOT NULL,                      -- FK projects(project_id); may itself be a subproject row
  subproject_id VARCHAR(100),                            -- optional attribution to a subproject
  title VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft','In Review','Approved','Rejected','Implemented','Verified','Deprecated')),
  created_by VARCHAR(50) NOT NULL,                       -- FK users(employee_id)
  reviewer_id VARCHAR(50),                               -- designated "project responsible"
  current_approval_id INT,                               -- FK requirement_approvals(id), set on approve
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  deleted_by VARCHAR(50) NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_subproject_id ON requirements(subproject_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_requirement_id ON requirements(requirement_id);

-- ── requirement_sections ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requirement_sections (
  id SERIAL PRIMARY KEY,
  requirement_id VARCHAR(50) NOT NULL,                   -- FK requirements(requirement_id)
  heading VARCHAR(255) NOT NULL,
  label VARCHAR(30) NOT NULL DEFAULT 'Functional'
    CHECK (label IN ('Functional','Non-Functional','Constraint','Acceptance Criteria','Note')),
  content_html TEXT NOT NULL DEFAULT '',
  display_order INT NOT NULL DEFAULT 0,
  lock_version INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  deleted_by VARCHAR(50) NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requirement_sections_requirement ON requirement_sections(requirement_id, display_order);

-- ── requirement_section_revisions (append-only) ─────────────────────────────
CREATE TABLE IF NOT EXISTS requirement_section_revisions (
  id SERIAL PRIMARY KEY,
  section_id INT NOT NULL,                                -- FK requirement_sections(id)
  editor_id VARCHAR(50) NOT NULL,                         -- FK users(employee_id)
  editor_name VARCHAR(255) NOT NULL,                      -- denormalized audit snapshot
  heading VARCHAR(255) NOT NULL,
  label VARCHAR(30) NOT NULL,
  content_html TEXT NOT NULL,
  content_hash CHAR(64) NOT NULL,                         -- sha256 hex
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requirement_section_revisions_section ON requirement_section_revisions(section_id, created_at DESC);

-- ── requirement_approvals (append-only) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS requirement_approvals (
  id SERIAL PRIMARY KEY,
  requirement_id VARCHAR(50) NOT NULL,                    -- FK requirements(requirement_id)
  approver_id VARCHAR(50) NOT NULL,                       -- FK users(employee_id)
  approver_name VARCHAR(255) NOT NULL,                    -- denormalized audit snapshot
  decision VARCHAR(10) NOT NULL CHECK (decision IN ('Approved','Rejected')),
  note TEXT,
  approved_content_hash CHAR(64) NOT NULL,                -- binds the decision to exact content
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requirement_approvals_requirement ON requirement_approvals(requirement_id, created_at DESC);

-- ── requirement_dev_links ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requirement_dev_links (
  id SERIAL PRIMARY KEY,
  requirement_id VARCHAR(50) NOT NULL,                    -- FK requirements(requirement_id)
  dev_id VARCHAR(100) NOT NULL,                           -- FK bugs(bug_id)
  relationship_type VARCHAR(20) NOT NULL DEFAULT 'implements'
    CHECK (relationship_type IN ('implements','relates_to')),
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT requirement_dev_links_unique UNIQUE (requirement_id, dev_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_requirement_dev_links_requirement ON requirement_dev_links(requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirement_dev_links_dev ON requirement_dev_links(dev_id);

-- ── requirement_baselines (append-only) — frozen document versions ──────────
CREATE TABLE IF NOT EXISTS requirement_baselines (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(100) NOT NULL,                       -- freeze scope = the project
  version_label VARCHAR(20) NOT NULL,                     -- '1.0', '1.1', '2.0'
  release_note TEXT,
  snapshot JSONB NOT NULL,                                -- frozen doc (self-contained; see requirements.ts)
  doc_content_hash CHAR(64) NOT NULL,                     -- sha256 over ordered per-requirement hashes
  frozen_by VARCHAR(50) NOT NULL,                         -- FK users(employee_id)
  frozen_by_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT requirement_baselines_unique_version UNIQUE (project_id, version_label)
);

CREATE INDEX IF NOT EXISTS idx_requirement_baselines_project ON requirement_baselines(project_id, created_at DESC);

-- ── Foreign keys (DROP/ADD style, matching migration 058) ───────────────────
ALTER TABLE requirement_sections DROP CONSTRAINT IF EXISTS fk_requirement_sections_requirement;
ALTER TABLE requirement_sections
  ADD CONSTRAINT fk_requirement_sections_requirement
  FOREIGN KEY (requirement_id) REFERENCES requirements(requirement_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE requirement_section_revisions DROP CONSTRAINT IF EXISTS fk_requirement_section_revisions_section;
ALTER TABLE requirement_section_revisions
  ADD CONSTRAINT fk_requirement_section_revisions_section
  FOREIGN KEY (section_id) REFERENCES requirement_sections(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE requirement_approvals DROP CONSTRAINT IF EXISTS fk_requirement_approvals_requirement;
ALTER TABLE requirement_approvals
  ADD CONSTRAINT fk_requirement_approvals_requirement
  FOREIGN KEY (requirement_id) REFERENCES requirements(requirement_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE requirement_dev_links DROP CONSTRAINT IF EXISTS fk_requirement_dev_links_requirement;
ALTER TABLE requirement_dev_links
  ADD CONSTRAINT fk_requirement_dev_links_requirement
  FOREIGN KEY (requirement_id) REFERENCES requirements(requirement_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE requirement_dev_links DROP CONSTRAINT IF EXISTS fk_requirement_dev_links_dev;
ALTER TABLE requirement_dev_links
  ADD CONSTRAINT fk_requirement_dev_links_dev
  FOREIGN KEY (dev_id) REFERENCES bugs(bug_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: audit tables (revisions, approvals, baselines) intentionally have no user FK with CASCADE —
-- history must survive. In practice users are set status='inactive', not hard-deleted.

-- ── updated_at triggers (reuse shared function) ─────────────────────────────
DROP TRIGGER IF EXISTS update_requirements_updated_at ON requirements;
CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_requirement_sections_updated_at ON requirement_sections;
CREATE TRIGGER update_requirement_sections_updated_at BEFORE UPDATE ON requirement_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Immutability: block UPDATE/DELETE on append-only audit tables ────────────
CREATE OR REPLACE FUNCTION prevent_row_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Rows in % are immutable (append-only audit table)', TG_TABLE_NAME;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS requirement_section_revisions_immutable ON requirement_section_revisions;
CREATE TRIGGER requirement_section_revisions_immutable
  BEFORE UPDATE OR DELETE ON requirement_section_revisions
  FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

DROP TRIGGER IF EXISTS requirement_approvals_immutable ON requirement_approvals;
CREATE TRIGGER requirement_approvals_immutable
  BEFORE UPDATE OR DELETE ON requirement_approvals
  FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

DROP TRIGGER IF EXISTS requirement_baselines_immutable ON requirement_baselines;
CREATE TRIGGER requirement_baselines_immutable
  BEFORE UPDATE OR DELETE ON requirement_baselines
  FOR EACH ROW EXECUTE FUNCTION prevent_row_mutation();

-- ── RLS (039 precedent; app uses the postgres role which bypasses RLS) ──────
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_section_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_dev_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_baselines ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE requirements IS 'Project/subproject requirements with approval lifecycle.';
COMMENT ON TABLE requirement_section_revisions IS 'Append-only per-section revision history (immutable).';
COMMENT ON TABLE requirement_approvals IS 'Append-only approval decisions (immutable).';
COMMENT ON TABLE requirement_baselines IS 'Append-only frozen document versions / baselines (immutable JSONB snapshot).';
