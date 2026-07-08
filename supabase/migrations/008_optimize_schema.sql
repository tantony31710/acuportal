-- Batch B Migration: Optimize Schema

-- Add indexes for performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_attendance_submissions_student_id ON attendance_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_submissions_created_at ON attendance_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_submissions_session_id ON attendance_submissions(session_id);
