-- Batch A Migration: Consolidate and Harden RLS

-- 1. Ensure RLS is enabled for all tables
ALTER TABLE IF EXISTS attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Clean existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role only" ON attendance_submissions;
DROP POLICY IF EXISTS "Authenticated users can read" ON attendance_submissions;

-- 3. Define Hardened Policies

-- attendance_submissions: Restricted access
-- Edge Functions (Service Role) can insert. Teachers can read/delete. Students cannot read submissions.
CREATE POLICY "service_role_insert_submissions" ON attendance_submissions
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "teacher_read_submissions" ON attendance_submissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'teacher'));

-- attendance_sessions: Public read, Teacher manage
CREATE POLICY "public_read_sessions" ON attendance_sessions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "teacher_manage_sessions" ON attendance_sessions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'teacher'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'teacher'));

-- user_roles: Restricted access
-- Authenticated users can read their own role, teachers can read all
CREATE POLICY "authenticated_read_own_role" ON user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "teacher_read_all_user_roles" ON user_roles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'teacher'));
