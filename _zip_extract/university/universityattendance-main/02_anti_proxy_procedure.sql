CREATE OR REPLACE FUNCTION submit_attendance(
  p_session_id UUID,
  p_student_id UUID,
  p_input_pin VARCHAR(4),
  p_device_fingerprint TEXT
)
RETURNS TABLE (success BOOLEAN, message TEXT, flagged BOOLEAN) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_correct_pin VARCHAR(4);
  v_is_active BOOLEAN;
  v_expiry TIMESTAMP WITH TIME ZONE;
  v_device_exists INT;
BEGIN
  -- 1. Fetch session details
  SELECT pin_code, is_active, expires_at 
  INTO v_correct_pin, v_is_active, v_expiry
  FROM attendance_sessions WHERE id = p_session_id;

  -- 2. Validate Session Window
  IF NOT v_is_active OR now() > v_expiry THEN
    RETURN QUERY SELECT false, 'Session has closed or expired.'::text, false;
    RETURN;
  END IF;

  -- 3. Validate PIN
  IF p_input_pin != v_correct_pin THEN
    RETURN QUERY SELECT false, 'Invalid PIN code.'::text, false;
    RETURN;