-- Migration 058: Per-project credentials vault (PostgreSQL)
-- Stores encrypted credentials + env secrets per project/sub-project.
-- Sub-projects are ordinary `projects` rows (parent_project_id set), so both
-- tables key off projects.project_id and no separate sub-project table is needed.
--
-- Secret values are AES-256-GCM ciphertext produced by apps/web/src/lib/crypto/secrets.ts
-- (format iv.authTag.ciphertext, base64). The DB never sees plaintext or the key.

-- ---------------------------------------------------------------------------
-- Structured credentials (DB creds, SSH keys, Firebase keys, API keys, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_credentials (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'other'
        CHECK (type IN ('database', 'ssh', 'ssh_key', 'firebase', 'api_key', 'encryption_key', 'other')),
    value_encrypted TEXT NOT NULL,           -- encrypted JSON blob of the secret fields
    metadata JSONB DEFAULT '{}'::jsonb,      -- non-sensitive labels (host/port/username/notes)
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_credentials_project_id ON project_credentials(project_id);

ALTER TABLE project_credentials
    DROP CONSTRAINT IF EXISTS fk_project_credentials_project_id;
ALTER TABLE project_credentials
    ADD CONSTRAINT fk_project_credentials_project_id
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Environment secrets (Vercel-style key/value, scoped by environment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_env_secrets (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    environment VARCHAR(50) NOT NULL DEFAULT 'production'
        CHECK (environment IN ('development', 'staging', 'production')),
    key VARCHAR(255) NOT NULL,
    value_encrypted TEXT NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_env_secret UNIQUE (project_id, environment, key)
);

CREATE INDEX IF NOT EXISTS idx_project_env_secrets_project_id ON project_env_secrets(project_id);

ALTER TABLE project_env_secrets
    DROP CONSTRAINT IF EXISTS fk_project_env_secrets_project_id;
ALTER TABLE project_env_secrets
    ADD CONSTRAINT fk_project_env_secrets_project_id
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Access/audit log (who viewed/revealed/changed secrets)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credential_access_log (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    credential_id INTEGER NULL,
    accessed_by VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL
        CHECK (action IN ('view', 'reveal', 'create', 'update', 'delete', 'upload', 'export')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credential_access_log_project_id ON credential_access_log(project_id);
CREATE INDEX IF NOT EXISTS idx_credential_access_log_created_at ON credential_access_log(created_at);
