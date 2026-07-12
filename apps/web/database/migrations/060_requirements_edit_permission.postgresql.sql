-- Migration 060: Per-user requirements edit permission
-- Every project member can VIEW a project's requirements (incl. history and
-- frozen versions); EDITING additionally requires this per-assignment flag on
-- project_users (granted when assigning the user), or a privileged role
-- (admin/top_management/management). Enforced in the GraphQL resolvers.

ALTER TABLE project_users
  ADD COLUMN IF NOT EXISTS can_edit_requirements BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN project_users.can_edit_requirements IS
  'Per-assignment flag: member may edit this project''s requirements (privileged roles may edit regardless).';
