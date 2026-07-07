-- 003_rls_security.sql
-- Enable RLS
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_submissions ENABLE ROW LEVEL SECURITY;

-- Allow only service_role (Edge Functions) to insert/update submissions
CREATE POLICY "Service role only" ON attendance_submissions
  FOR INSERT TO service_role WITH CHECK (true);

-- Allow authenticated users to read submissions
CREATE POLICY "Authenticated users can read" ON attendance_submissions
  FOR SELECT TO authenticated USING (true);
