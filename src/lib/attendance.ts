import { supabase } from './supabase'
import { ROSTER, type Group } from './roster'
import { logEvent } from './telemetry'
export type { Group }

export type Session = {
  id: string; pin: string; group: Group
  startedAt: number; endsAt: number; isActive: boolean; windowMinutes: number
}
export type Submission = {
  id: string; sessionId: string; studentId: string
  status: 'present' | 'flagged' | 'late'; flagReason?: string
  fingerprint: string; submittedAt: number
}

function rowToSession(d: any): Session {
  return {
    id: d.id, pin: d.pin_code, group: d.group_name as Group,
    startedAt: new Date(d.started_at ?? d.created_at).getTime(),
    endsAt: new Date(d.ends_at).getTime(),
    isActive: d.is_active, windowMinutes: d.window_minutes ?? 15,
  }
}

export async function getActiveSession(): Promise<Session | null> {
  const { data } = await supabase.from('attendance_sessions').select('*')
    .eq('is_active', true).gt('ends_at', new Date().toISOString())
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data ? rowToSession(data) : null
}

export async function getSessions(): Promise<Session[]> {
  const { data } = await supabase.from('attendance_sessions').select('*').order('created_at', { ascending: false })
  return (data ?? []).map(rowToSession)
}

export async function getSubmissions(sessionId: string): Promise<Submission[]> {
  const { data } = await supabase.from('attendance_submissions').select('*').eq('session_id', sessionId)
  return (data ?? []).map(d => ({
    id: d.id, sessionId: d.session_id, studentId: d.student_id,
    status: d.status as any, flagReason: d.flag_reason ?? undefined,
    fingerprint: d.fingerprint ?? '', submittedAt: new Date(d.created_at).getTime(),
  }))
}

export async function getAllSubmissions(): Promise<Submission[]> {
  const { data } = await supabase.from('attendance_submissions').select('*').order('created_at', { ascending: false })
  return (data ?? []).map(d => ({
    id: d.id, sessionId: d.session_id, studentId: d.student_id,
    status: d.status as any, flagReason: d.flag_reason ?? undefined,
    fingerprint: d.fingerprint ?? '', submittedAt: new Date(d.created_at).getTime(),
  }))
}

export async function startSession(opts: { group: Group; windowMinutes: number }): Promise<Session> {
  await supabase.from('attendance_sessions').update({ is_active: false }).eq('is_active', true)
  const now = new Date()
  const arr = new Uint32Array(6); crypto.getRandomValues(arr)
  const pin = Array.from(arr, n => n % 10).join('')
  const { data, error } = await supabase.from('attendance_sessions').insert({
    pin_code: pin, group_name: opts.group, is_active: true,
    ends_at: new Date(now.getTime() + opts.windowMinutes * 60_000).toISOString(),
    started_at: now.toISOString(), window_minutes: opts.windowMinutes,
  }).select('*').single()
  if (error) throw error
  return rowToSession(data)
}

export async function closeSession(id: string): Promise<void> {
  await supabase.from('attendance_sessions').update({ is_active: false }).eq('id', id)
}

export async function deleteSession(id: string): Promise<void> {
  await supabase.from('attendance_submissions').delete().eq('session_id', id)
  await supabase.from('attendance_sessions').delete().eq('id', id)
}

export async function submitAttendance(input: { studentId: string; pin: string; fingerprint: string; locationFlag?: string }) {
  logEvent('ATTENDANCE_SUBMISSION_ATTEMPT', { studentId: input.studentId })
  const active = await getActiveSession()
  if (!active) return { ok: false, reason: 'No active session' }
  if (Date.now() > active.endsAt) return { ok: false, reason: 'Session expired' }
  if (input.pin.trim() !== active.pin) return { ok: false, reason: 'Incorrect PIN' }
  const student = ROSTER.find(s => s.id === input.studentId.trim())
  if (!student) return { ok: false, reason: 'Student ID not in roster' }
  if (active.group !== 'ALL' && student.group !== active.group)
    return { ok: false, reason: `Wrong group — session is for ${active.group}` }

  const ts = new Date().toISOString()
  const isLate = Date.now() > active.startedAt + (active.endsAt - active.startedAt) * 0.8

  const { data: existing } = await supabase.from('attendance_submissions').select('id')
    .eq('session_id', active.id).eq('student_id', student.id).maybeSingle()
  if (existing) {
    await supabase.from('attendance_submissions').insert({
      session_id: active.id, student_id: student.id, created_at: ts,
      status: 'flagged', flag_reason: 'Duplicate attempt (rejected)', fingerprint: input.fingerprint,
    })
    return { ok: false, reason: 'Already checked in — one response per person' }
  }

  const since = new Date(Date.now() - 60_000).toISOString()
  const { data: reuse } = await supabase.from('attendance_submissions').select('student_id')
    .eq('session_id', active.id).eq('fingerprint', input.fingerprint)
    .neq('student_id', student.id).gte('created_at', since).maybeSingle()
  if (reuse) {
    await supabase.from('attendance_submissions').insert({
      session_id: active.id, student_id: student.id, created_at: ts,
      status: 'flagged', flag_reason: 'Shared device fingerprint (proxy rejected)', fingerprint: input.fingerprint,
    })
    return { ok: false, reason: 'This device was used by another student recently' }
  }

  const { error } = await supabase.from('attendance_submissions').insert({
    session_id: active.id, student_id: student.id, created_at: ts,
    status: input.locationFlag ? 'flagged' : isLate ? 'late' : 'present',
    flag_reason: input.locationFlag ?? null, fingerprint: input.fingerprint,
  })
  if (error) return { ok: false, reason: 'Database error — try again' }
  return { ok: true, studentName: student.name, late: isLate }
}

export function getFingerprint(): string {
  const k = 'ap_fp_v1'; let v = localStorage.getItem(k)
  if (!v) {
    v = Math.random().toString(36).slice(2) + '-' + (navigator.hardwareConcurrency || 0) + '-' + screen.width + 'x' + screen.height
    localStorage.setItem(k, v)
  }
  return v
}

export function exportSessionCsv(session: Session, subs: Submission[]): string {
  const roster = session.group === 'ALL' ? ROSTER : ROSTER.filter(r => r.group === session.group)
  const byId = new Map(subs.map(s => [s.studentId, s]))
  const rows = [['Student ID', 'Name', 'Group', 'Advisor', 'Status', 'Time', 'Flag Reason']]
  for (const st of roster) {
    const sub = byId.get(st.id)
    const status = !sub ? 'ABSENT' : sub.status === 'present' ? 'PRESENT' : sub.status === 'late' ? 'LATE' : 'FLAGGED'
    rows.push([st.id, st.name, st.group, st.advisor, status,
      sub ? new Date(sub.submittedAt).toLocaleTimeString() : '', sub?.flagReason || ''])
  }
  return '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function exportFlagsCsv(subs: Submission[]): string {
  const rows = [['Student ID', 'Name', 'Group', 'Reason', 'Timestamp', 'Fingerprint']]
  for (const s of subs.filter(x => x.status === 'flagged')) {
    const st = ROSTER.find(r => r.id === s.studentId)
    rows.push([s.studentId, st?.name ?? '', st?.group ?? '', s.flagReason ?? '',
      new Date(s.submittedAt).toISOString(), s.fingerprint])
  }
  return '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function exportSummaryCsv(sessions: Session[], allSubs: Submission[]): string {
  const closed = sessions.filter(s => !s.isActive || new Date(s.endsAt) < new Date())
  const rows = [['Student ID', 'Name', 'Group', 'Advisor', 'Present', 'Late', 'Flagged', 'Absent', 'Total', '%']]
  for (const st of ROSTER) {
    const relevant = closed.filter(s => s.group === 'ALL' || s.group === st.group)
    const stSubs = allSubs.filter(s => s.studentId === st.id)
    const p = stSubs.filter(s => s.status === 'present').length
    const l = stSubs.filter(s => s.status === 'late').length
    const f = stSubs.filter(s => s.status === 'flagged').length
    const tot = relevant.length
    const att = p + l
    rows.push([st.id, st.name, st.group, st.advisor,
      String(p), String(l), String(f), String(Math.max(0, tot - att - f)),
      String(tot), tot > 0 ? Math.round((att / tot) * 100) + '%' : '0%'])
  }
  return '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function downloadCsv(content: string, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }))
  a.download = filename; a.click()
}
