-- 005_analytics_dashboard_assets.sql
-- 1. Aggregated Analytics View
CREATE OR REPLACE VIEW view_attendance_summary AS
SELECT 
    session_id,
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE status = 'present') as present_count,
    COUNT(*) FILTER (WHERE status = 'late') as late_count,
    COUNT(*) FILTER (WHERE flag_reason IS NOT NULL) as flagged_count
FROM attendance_submissions
GROUP BY session_id;

-- 2. Anomaly Detection Function (Heuristic: Z-Score > 2)
CREATE OR REPLACE FUNCTION get_anomalies(p_session_id TEXT)
RETURNS TABLE (student_id TEXT, z_score FLOAT) AS $$
DECLARE
    v_mean FLOAT;
    v_stddev FLOAT;
BEGIN
    RETURN QUERY
    WITH submission_times AS (
        SELECT 
            s.student_id,
            EXTRACT(EPOCH FROM (s.created_at - sess.started_at)) as seconds_from_start
        FROM attendance_submissions s
        JOIN attendance_sessions sess ON s.session_id = sess.id
        WHERE s.session_id = p_session_id
    ),
    stats AS (
        SELECT AVG(seconds_from_start) as avg_time, STDDEV(seconds_from_start) as std_time
        FROM submission_times
    )
    SELECT 
        st.student_id,
        ABS(st.seconds_from_start - stats.avg_time) / NULLIF(stats.std_time, 0) as z_score
    FROM submission_times st, stats
    WHERE ABS(st.seconds_from_start - stats.avg_time) / NULLIF(stats.std_time, 0) > 2;
END;
$$ LANGUAGE plpgsql;

-- 3. Security: RLS Policy for Analytics
-- (Note: Ensure RLS is enabled on the view if your Supabase version requires it)
-- Note: User roles table must exist for this policy to work
CREATE POLICY "Teacher access only" ON view_attendance_summary
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'teacher'));
