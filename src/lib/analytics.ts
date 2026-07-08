import { supabase } from './supabase'

export async function getDashboardStats(sessionId: string) {
  const { data, error } = await supabase
    .from('view_attendance_summary')
    .select('*')
    .eq('session_id', sessionId)
    .single()
  return { data, error }
}

export async function getSessionAnomalies(sessionId: string) {
  const { data, error } = await supabase
    .rpc('get_anomalies', { p_session_id: sessionId })
  return { data, error }
}
