import { supabase } from './supabase'
import { ROSTER, type Group } from './roster'
import { getFingerprint } from './attendance'

export type DbSession = {
  id: string
  pin_code: string
  group_name: string
  is_active: boolean
  ends_at: string
  created_at: string
  started_at?: string
}

export type DbSubmission = {
  id?: string
  session_id: string
  student_id: string
  email?: string | null
  status: string
  flag_reason?: string | null
  user_agent?: string | null
  ip_address?: string | null
  created_at: string
}

export { getFingerprint }

const LATE_WINDOW_MS = 2 * 60_000

function submissionFingerprint(sub: DbSubmission): string {
  return sub.user_agent ?? ''
}

export async function fetchActiveSession(): Promise<DbSession | null> {
  const { data } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('is_active', true)
    .maybeSingle()
  if (!data) return null
  if (new Date(data.ends_at).getTime() <= Date.now()) {
    await closeSession(data.id)
    return null
  }
  return data
}

export async function fetchAllSessions(): Promise<DbSession[]> {
  const { data } = await supabase
    .from('attendance_sessions')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function fetchSubmissions(sessionId: string): Promise<DbSubmission[]> {
  const { data } = await supabase
    .from('attendance_submissions')
    .select('*')
    .eq('session_id', sessionId)
  return data ?? []
}

export async function closeSession(id: string) {
  await supabase.from('attendance_sessions').update({ is_active: false }).eq('id', id)
}

export async function deleteSession(id: string) {
  await supabase.from('attendance_submissions').delete().eq('session_id', id)
  await supabase.from('attendance_sessions').delete().eq('id', id)
}

export async function autoCloseExpiredSessions() {
  const { data } = await supabase
    .from('attendance_sessions')
    .select('id, ends_at, is_active')
    .eq('is_active', true)
  if (!data) return
  const now = Date.now()
  for (const s of data) {
    if (new Date(s.ends_at).getTime() <= now) await closeSession(s.id)
  }
}

function rosterForGroup(group: string) {
  if (group === 'ALL') return ROSTER
  return ROSTER.filter(r => r.group === group)
}

export function summarizeDbSession(session: DbSession, submissions: DbSubmission[]) {
  const roster = rosterForGroup(session.group_name)
  const presentIds = new Set(submissions.filter(s => s.status === 'present' || s.status === 'late').map(s => s.student_id))
  const flaggedIds = new Set(submissions.filter(s => s.status === 'flagged').map(s => s.student_id))
  const absentList = roster.filter(r => !presentIds.has(r.id) && !flaggedIds.has(r.id))
  return {
    total: roster.length,
    present: presentIds.size,
    flagged: flaggedIds.size,
    absent: absentList.length,
    absentList,
    late: submissions.filter(s => s.status === 'late').length,
  }
}

export type SubmitResult =
  | { ok: true; studentName: string; status: 'present' | 'late' | 'flagged' }
  | { ok: false; reason: string }

export async function submitCheckIn(input: {
  session: DbSession
  studentId: string
  pin: string
  fingerprint?: string
}): Promise<SubmitResult> {
  const fp = input.fingerprint ?? getFingerprint()
  const studentId = input.studentId.trim()
  const pin = input.pin.trim()

  if (new Date(input.session.ends_at).getTime() <= Date.now())
    return { ok: false, reason: 'Session window expired' }
  if (pin !== input.session.pin_code)
    return { ok: false, reason: 'Incorrect PIN' }

  const student = ROSTER.find(s => s.id === studentId)
  if (!student) return { ok: false, reason: 'Student ID not in roster' }
  if (input.session.group_name !== 'ALL' && student.group !== input.session.group_name)
    return { ok: false, reason: `Wrong group — session is for ${input.session.group_name}` }

  const existing = await fetchSubmissions(input.session.id)
  const dup = existing.find(s => s.student_id === studentId)
  if (dup) {
    await insertSubmission({
      session_id: input.session.id,
      student_id: studentId,
      status: 'flagged',
      flag_reason: 'Duplicate attempt (rejected)',
      user_agent: fp,
      created_at: new Date().toISOString(),
    })
    return { ok: false, reason: 'Already checked in — one response per person' }
  }

  const now = Date.now()
  const reuse = existing.find(
    s => submissionFingerprint(s) === fp && s.student_id !== studentId &&
      now - new Date(s.created_at).getTime() < 60_000
  )
  if (reuse) {
    await insertSubmission({
      session_id: input.session.id,
      student_id: studentId,
      status: 'flagged',
      flag_reason: 'Shared device fingerprint (proxy rejected)',
      user_agent: fp,
      created_at: new Date().toISOString(),
    })
    return { ok: false, reason: 'This device already submitted for another student' }
  }

  const msLeft = new Date(input.session.ends_at).getTime() - now
  const status: 'present' | 'late' = msLeft <= LATE_WINDOW_MS ? 'late' : 'present'

  const { error } = await insertSubmission({
    session_id: input.session.id,
    student_id: studentId,
    status,
    user_agent: fp,
    created_at: new Date().toISOString(),
  })
  if (error) return { ok: false, reason: error }

  return { ok: true, studentName: student.name, status }
}

async function insertSubmission(row: DbSubmission) {
  const payload: Record<string, unknown> = {
    session_id: row.session_id,
    student_id: row.student_id,
    status: row.status,
    created_at: row.created_at,
    user_agent: row.user_agent ?? getFingerprint(),
  }
  if (row.email) payload.email = row.email
  if (row.flag_reason) payload.flag_reason = row.flag_reason
  if (row.ip_address) payload.ip_address = row.ip_address

  const { error } = await supabase.from('attendance_submissions').insert([payload])
  if (error?.message?.includes('flag_reason')) {
    delete payload.flag_reason
    const retry = await supabase.from('attendance_submissions').insert([payload])
    return { error: retry.error?.message }
  }
  return { error: error?.message }
}

export function exportSessionCsv(session: DbSession, submissions: DbSubmission[]): string {
  const roster = rosterForGroup(session.group_name)
  const subMap = new Map(submissions.map(s => [s.student_id, s]))
  const rows = [['Student ID', 'Name', 'Group', 'Advisor', 'Status', 'Time', 'Flag Reason']]
  for (const st of roster) {
    const sub = subMap.get(st.id)
    let status = 'ABSENT'
    if (sub) {
      if (sub.status === 'present') status = 'PRESENT'
      else if (sub.status === 'late') status = 'LATE'
      else if (sub.status === 'flagged') status = 'FLAGGED'
      else status = sub.status.toUpperCase()
    }
    rows.push([
      st.id,
      st.name,
      st.group,
      st.advisor,
      status,
      sub ? new Date(sub.created_at).toLocaleTimeString() : '',
      sub?.flag_reason ?? '',
    ])
  }
  return '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function exportFlagsCsv(sessions: DbSession[], allSubs: Map<string, DbSubmission[]>): string {
  const rows = [['Session Date', 'Group', 'Student ID', 'Name', 'Group', 'Reason', 'Timestamp']]
  for (const s of sessions) {
    const subs = allSubs.get(s.id) ?? []
    for (const sub of subs.filter(x => x.status === 'flagged')) {
      const st = ROSTER.find(r => r.id === sub.student_id)
      rows.push([
        new Date(s.created_at).toLocaleString(),
        s.group_name,
        sub.student_id,
        st?.name ?? '',
        st?.group ?? '',
        sub.flag_reason ?? '',
        new Date(sub.created_at).toISOString(),
      ])
    }
  }
  return '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export type StudentAttendanceSummary = {
  id: string
  name: string
  group: string
  sessionsTotal: number
  present: number
  late: number
  flagged: number
  absent: number
  percentage: number
}

export function computeStudentSummaries(
  sessions: DbSession[],
  allSubs: Map<string, DbSubmission[]>
): StudentAttendanceSummary[] {
  const relevantSessions = sessions.filter(s => !s.is_active || new Date(s.ends_at).getTime() <= Date.now())
  return ROSTER.map(st => {
    let present = 0, late = 0, flagged = 0, absent = 0
    for (const sess of relevantSessions) {
      if (sess.group_name !== 'ALL' && sess.group_name !== st.group) continue
      const sub = (allSubs.get(sess.id) ?? []).find(s => s.student_id === st.id)
      if (!sub) { absent++; continue }
      if (sub.status === 'present') present++
      else if (sub.status === 'late') late++
      else if (sub.status === 'flagged') flagged++
      else absent++
    }
    const sessionsTotal = present + late + flagged + absent
    const attended = present + late
    return {
      id: st.id,
      name: st.name,
      group: st.group,
      sessionsTotal,
      present,
      late,
      flagged,
      absent,
      percentage: sessionsTotal ? Math.round((attended / sessionsTotal) * 100) : 0,
    }
  })
}

export function downloadCsv(csv: string, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = name
  a.click()
}

export function exportRosterCsv(): string {
  const rows = [['Student ID', 'Student Name Ar', 'Group', 'Advisor']]
  for (const s of ROSTER) rows.push([s.id, s.name, s.group, s.advisor])
  return '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}
