-- 002_security_hardening.sql
-- Enforce strict RLS on attendance tables.

-- Ensure RLS is enabled
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_submissions ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can read active sessions (students need this for check-in)
DROP POLICY IF EXISTS "public_read_sessions" ON attendance_sessions;
CREATE POLICY "public_read_sessions" ON attendance_sessions
  FOR SELECT TO anon, authenticated USING (true);

-- 2. Anyone can insert a check-in row
DROP POLICY IF EXISTS "public_insert_submissions" ON attendance_submissions;
CREATE POLICY "public_insert_submissions" ON attendance_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3. Teachers can manage sessions (Assuming 'user_roles' table exists and links user to role)
-- Note: This assumes a 'user_roles' table exists with columns user_id (UUID) and role (TEXT)
DROP POLICY IF EXISTS "teacher_manage_sessions" ON attendance_sessions;
CREATE POLICY "teacher_manage_sessions" ON attendance_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

-- 4. Teachers can read/delete all submissions
DROP POLICY IF EXISTS "teacher_read_submissions" ON attendance_submissions;
CREATE POLICY "teacher_read_submissions" ON attendance_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "teacher_delete_submissions" ON attendance_submissions;
CREATE POLICY "teacher_delete_submissions" ON attendance_submissions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );
