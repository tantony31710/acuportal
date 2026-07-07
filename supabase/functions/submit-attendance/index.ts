import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const { studentId, pin, fingerprint } = await req.json()
  
  // 1. Verify Active Session & PIN
  const { data: session, error: sessErr } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('is_active', true)
    .single()

  if (sessErr || !session || session.pin_code !== pin) {
    return new Response(JSON.stringify({ ok: false, reason: 'Invalid session or PIN' }), { status: 401 })
  }

  // 2. Logic ported from legacy attendance.ts
  const now = Date.now()
  const startedAt = new Date(session.started_at).getTime()
  const endsAt = new Date(session.ends_at).getTime()
  const isLate = now > startedAt + (endsAt - startedAt) * 0.8

  // 3. Perform Atomic Insertion
  const { error: insErr } = await supabase.from('attendance_submissions').insert({
    session_id: session.id,
    student_id: studentId,
    status: isLate ? 'late' : 'present',
    fingerprint: fingerprint,
    created_at: new Date().toISOString(),
  })

  if (insErr) {
    return new Response(JSON.stringify({ ok: false, reason: 'Submission failed' }), { status: 500 })
  }
  
  return new Response(JSON.stringify({ ok: true, late: isLate }), { headers: { "Content-Type": "application/json" } })
})
