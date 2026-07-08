import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface AttendanceParams {
  studentId: string;
  pin: string;
  fingerprint: string;
  lat: number;
  long: number;
}

export function useAttendance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitAttendance = async (params: AttendanceParams) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data, error: apiError } = await supabase.functions.invoke('submit-attendance', {
        body: params,
      });

      if (apiError || !data.ok) {
        throw new Error(data?.reason || apiError?.message || 'Submission failed');
      }

      setSuccess(true);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { submitAttendance, loading, error, success };
}
