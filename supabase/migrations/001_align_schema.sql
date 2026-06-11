-- Run this entire script in Supabase → SQL Editor for project beefbianpgvjmzsdkwvd
-- Fixes roster student IDs, anti-proxy fields, realtime, and pin length

-- 1. student_id must be TEXT (roster IDs like 82510022), not auth UUID
ALTER TABLE attendance_submissions
  DROP CONSTRAINT IF EXISTS attendance_submissions_student_id_fkey;

ALTER TABLE attendance_submissions
  DROP CONSTRAINT IF EXISTS unique_student_session;

ALTER TABLE attendance_submissions
  ALTER COLUMN student_id TYPE TEXT USING student_id::text;

ALTER TABLE attendance_submissions
  ADD CONSTRAINT unique_session_roster_student UNIQUE (session_id, student_id);

-- 2. Anti-proxy / flag fields
ALTER TABLE attendance_submissions
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- user_agent already exists — app stores device fingerprint there

-- 3. Widen PIN to 6 digits (app generates 6-digit codes)
ALTER TABLE attendance_sessions
  ALTER COLUMN pin_code TYPE VARCHAR(6);

-- 4. Enable Realtime so student phones detect new sessions instantly
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_sessions;

-- 5. Optional: drop legacy duplicate table (uncomment if you don't need it)
-- DROP TABLE IF EXISTS sessions;

-- 6. RLS policies (enable RLS in dashboard first, or leave disabled for testing)
-- ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can read active sessions (students don't log in)
-- CREATE POLICY "public_read_sessions" ON attendance_sessions
--   FOR SELECT TO anon, authenticated USING (true);

-- Anyone can insert a check-in row
-- CREATE POLICY "public_insert_submissions" ON attendance_submissions
--   FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Teachers can manage sessions
-- CREATE POLICY "teacher_manage_sessions" ON attendance_sessions
--   FOR ALL TO authenticated
--   USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'teacher'))
--   WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'teacher'));

-- Teachers can read/delete all submissions
-- CREATE POLICY "teacher_read_submissions" ON attendance_submissions
--   FOR SELECT TO authenticated
--   USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'teacher'));

-- CREATE POLICY "teacher_delete_submissions" ON attendance_submissions
--   FOR DELETE TO authenticated
--   USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'teacher'));
