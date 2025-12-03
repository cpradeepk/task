-- Create attendance_request_type_enum
DO $$ BEGIN
    CREATE TYPE attendance_request_type_enum AS ENUM ('SIGN_IN_EDIT', 'SIGN_OUT_EDIT', 'MISSING_ENTRY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create attendance_request_status_enum
DO $$ BEGIN
    CREATE TYPE attendance_request_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create attendance_requests table
CREATE TABLE IF NOT EXISTS attendance_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id TEXT NOT NULL,
    attendance_date DATE NOT NULL,
    request_type attendance_request_type_enum NOT NULL,
    original_time TIMESTAMPTZ,
    new_time TIMESTAMPTZ NOT NULL,
    reason TEXT,
    status attendance_request_status_enum DEFAULT 'PENDING',
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to users table (employee_id)
DO $$ BEGIN
    ALTER TABLE attendance_requests
    ADD CONSTRAINT fk_attendance_requests_user
    FOREIGN KEY (employee_id)
    REFERENCES users(employee_id)
    ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign key to users table (reviewed_by)
DO $$ BEGIN
    ALTER TABLE attendance_requests
    ADD CONSTRAINT fk_attendance_requests_reviewer
    FOREIGN KEY (reviewed_by)
    REFERENCES users(employee_id)
    ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_attendance_requests_employee_id ON attendance_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_requests_status ON attendance_requests(status);
