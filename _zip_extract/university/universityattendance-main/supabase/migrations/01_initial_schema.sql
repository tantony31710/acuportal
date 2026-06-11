-- 1. Create Profile Roles
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');

CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE,
  full_name TEXT,
  role user_role DEFAULT 'student'::user_role,
  student_id TEXT UNIQUE
);

-- 2. Attendance Sessions
CREATE TABLE attendance_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES profiles(id),
  target_group TEXT NOT NULL,
  pin_code VARCHAR(4) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Attendance Logs with Proxy Detection Data
CREATE TABLE attendance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  device_fingerprint TEXT NOT NULL, -- Crucial for proxy checking
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_student_session UNIQUE (session_id, student_id)
);