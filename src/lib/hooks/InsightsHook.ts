import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useAttendanceInsights() {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const queryInsights = async (prompt: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('query-insights', {
        body: { prompt },
      });
      if (error) throw error;
      setAnswer(data.answer);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return { queryInsights, answer, loading };
}
