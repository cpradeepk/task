-- Create attendance_status_enum
DO $$ BEGIN
    CREATE TYPE attendance_status_enum AS ENUM ('full_day', 'half_day');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create attendance_approval_status_enum
DO $$ BEGIN
    CREATE TYPE attendance_approval_status_enum AS ENUM ('pending', 'approved', 'rejected', 'none');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create attendance_logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id TEXT NOT NULL,
    sign_in_time TIMESTAMPTZ NOT NULL,
    sign_out_time TIMESTAMPTZ,
    work_hours DECIMAL(5,2),
    date DATE NOT NULL,
    status attendance_status_enum,
    is_manual_entry BOOLEAN DEFAULT FALSE,
    approval_status attendance_approval_status_enum DEFAULT 'none',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_employee_date UNIQUE (employee_id, date)
);

-- Add foreign key to users table
DO $$ BEGIN
    ALTER TABLE attendance_logs
    ADD CONSTRAINT fk_attendance_user
    FOREIGN KEY (employee_id)
    REFERENCES users(employee_id)
    ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_logs(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(date);
