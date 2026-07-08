-- Add missing anti-proxy columns
ALTER TABLE attendance_submissions
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS fingerprint TEXT;
