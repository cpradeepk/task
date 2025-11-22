-- Migration: Add attendance location tracking and undo functionality
-- Run this migration to add location tracking and sign-out undo features

-- Add location and audit columns to attendance_logs
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS sign_in_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS sign_out_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS sign_out_undone_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS sign_out_undone_by VARCHAR(50);

-- Add setting for undo timeout (default 2 hours)
INSERT INTO settings (key, value, type, is_active, created_at, updated_at)
VALUES ('attendance_undo_timeout_hours', '2', 'number', true, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_date 
ON attendance_logs(employee_id, date);

-- Add comment for documentation
COMMENT ON COLUMN attendance_logs.sign_in_location IS 'IP-based location captured during sign-in';
COMMENT ON COLUMN attendance_logs.sign_out_location IS 'IP-based location captured during sign-out';
COMMENT ON COLUMN attendance_logs.sign_out_undone_at IS 'Timestamp when sign-out was undone';
COMMENT ON COLUMN attendance_logs.sign_out_undone_by IS 'Employee ID who undid the sign-out';
