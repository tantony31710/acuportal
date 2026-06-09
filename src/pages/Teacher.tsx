import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SiteNav } from '@/components/SiteNav'
import { useIsTeacher } from '@/lib/auth'
import { useAttendanceTick } from '@/lib/hooks'
import { GROUPS, type Group } from '@/lib/roster'
import { supabase } from '../lib/supabase';

// Helper function to trigger browser CSV file generation
function dl(csv: string, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = name
  a.click()
}

// Helper to compile submissions arrays into clean CSV formats
function generateCsvFromSubmissions(session: any, submissions: any[]): string {
  let csv = 'Student ID,Email,Timestamp,Status,IP Address,User Agent\n'
  submissions.forEach(sub => {
    csv += `"${sub.student_id}","${sub.email}","${new Date(sub.created_at).toISOString()}","${sub.status}","${sub.ip_address || ''}","${sub.user_agent || ''}"\n`
  })
  return csv
}

export function Teacher() {
  const teacher = useIsTeacher()
  const navigate = useNavigate()
  useAttendanceTick()

  const [group, setGroup] = useState<Group>('G1')
  const [windowMin, setWindowMin] = useState(15)
  const [mounted, setMounted] = useState(false)

  // Real-time Supabase states
  const [active, setActive] = useState<any>(null)
  const [sessionsHistory, setSessionsHistory] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  // Timer countdown trackers
  const [timeRemaining, setTimeRemaining] = useState({ min: 0, sec: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (teacher === false) navigate('/auth')
  }, [teacher, navigate])

  // Fetch all active sessions and past histories directly from the database
  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Fetch current active session running on the platform
      const { data: activeData } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()

      setActive(activeData)

      // 2. Fetch submissions for the active session if one exists
      if (activeData) {
        const { data: subData } = await supabase
          .from('attendance_submissions')
          .select('*')
          .eq('session_id', activeData.id)
        setSubmissions(subData || [])
      } else {
        setSubmissions([])
      }

      // 3. Fetch full historical record logs
      const { data: historyData } = await supabase
        .from('attendance_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      setSessionsHistory(historyData || [])
    } catch (err) {
      console.error('Failed to sync dashboard streams:', err)
    }
  }

  useEffect(() => {
    if (mounted && teacher) {
      fetchDashboardData()
      // Optional polling backup to keep metric cards fresh every 5 seconds
      const poll = setInterval(fetchDashboardData, 5000)
      return () => clearInterval(poll)
    }
  }, [mounted, teacher])

  // Live timer tick controller
  useEffect(() => {
    if (!active || !active.ends_at) return

    const updateCountdown = () => {
      const msLeft = new Date(active.ends_at).getTime() - Date.now()
      if (msLeft <= 0) {
        setTimeRemaining({ min: 0, sec: 0 })
        // Auto mark expired on UI thread
        fetchDashboardData()
      } else {
        setTimeRemaining({
          min: Math.floor(msLeft / 60000),
          sec: Math.floor((msLeft % 60000) / 1000)
        })
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [active])

  if (!mounted || teacher === null) return null

  // Calculate dynamic dashboard summary metrics locally from db submission states
  const summary = {
    present: submissions.filter(s => s.status === 'present').length,
    flagged: submissions.filter(s => s.status === 'flagged').length
  }

  // Action: Launch a brand-new cloud tracked PIN session
  const handleStartSession = async () => {
    try {
      setActionLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Auto-expire any orphan historical active items first
      await supabase
        .from('attendance_sessions')
        .update({ is_active: false })
        .eq('instructor_id', user.id)

      const generatedPin = Math.floor(1000 + Math.random() * 9000).toString()
      const endsAtTime = new Date(Date.now() + windowMin * 60000).toISOString()

      const { error } = await supabase
        .from('attendance_sessions')
        .insert([
          {
            instructor_id: user.id,
            pin_code: generatedPin,
            group_name: group,
            is_active: true,
            ends_at: endsAtTime
          }
        ])

      if (error) throw error
      await fetchDashboardData()
    } catch (err: any) {
      alert('Error launching session: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Explicitly terminate access parameters early
  const handleCloseSession = async (id: string) => {
    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      await fetchDashboardData()
    } catch (err: any) {
      alert('Error closing session: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Compile historical records for export operations
  const handleExportCsv = async (session: any) => {
    try {
      const { data: subs } = await supabase
        .from('attendance_submissions')
        .select('*')
        .eq('session_id', session.id)

      const csvContent = generateCsvFromSubmissions(session, subs || [])
      dl(csvContent, `session_${session.id}.csv`)
    } catch (err: any) {
      alert('Export pipeline failed: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <section className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />Teacher Control Panel
          </div>
          <h1 className="font-display text-4xl font-semibold text-foreground">Manage Sessions</h1>
          <p className="mt-2 text-muted-foreground">Start PIN-gated sessions; every student device sees them live.</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950 to-blue-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Active Session</h2>
            {active ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs text-slate-400">Session PIN (announce aloud)</div>
                      <div className="pin-digit mb-1 text-4xl font-mono text-blue-300 font-bold">{active.pin_code}</div>
                      <div className="text-xs text-slate-400">
                        Time left: {timeRemaining.min}:{String(timeRemaining.sec).padStart(2, '0')}
                      </div>
                    </div>
                    <div className="space-y-3 text-white">
                      <div><div className="text-xs text-slate-400">Group</div><div className="text-lg font-semibold">{active.group_name}</div></div>
                      <div><div className="text-xs text-slate-400">Present</div><div className="text-2xl font-bold text-emerald-400">{summary.present}</div></div>
                      <div><div className="text-xs text-slate-400">Flagged</div><div className="text-2xl font-bold text-amber-400">{summary.flagged}</div></div>
                      <div><div className="text-xs text-slate-400">Closes at</div><div className="text-sm">{new Date(active.ends_at).toLocaleTimeString()}</div></div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    disabled={actionLoading}
                    onClick={() => handleCloseSession(active.id)}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Close session
                  </button>
                  <button 
                    onClick={() => handleExportCsv(active)}
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Target group</label>
                    <div className="flex flex-wrap gap-2">
                      {(['ALL', ...GROUPS] as Group[]).map(g => (
                        <button key={g} onClick={() => setGroup(g)}
                          className={`rounded-md border px-3 py-1.5 text-sm transition ${group === g ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-blue-400/50'}`}>
                          {g === 'ALL' ? 'All' : g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Window (minutes)</label>
                    <input type="number" min={1} max={180} value={windowMin} onChange={e => setWindowMin(Number(e.target.value) || 15)}
                      className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-white outline-none focus:border-blue-400" />
                  </div>
                </div>
                <button 
                  disabled={actionLoading}
                  onClick={handleStartSession}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  ▶ Start new session
                </button>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950 p-5">
              <div className="text-xs text-emerald-300">Roster size</div>
              <div className="mt-2 text-3xl font-bold text-emerald-300">275</div>
            </div>
            <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-5">
              <div className="text-xs text-slate-400">Total System Sessions</div>
              <div className="mt-2 text-3xl font-bold text-white">{sessionsHistory.length}</div>
            </div>
          </aside>
        </div>

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Session history</h2>
          {sessionsHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No sessions yet. Start one above.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {['Started', 'Group', 'Status', 'Export'].map(h => (
                      <th key={h} className="px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessionsHistory.map(s => {
                    const status = !s.is_active ? 'Closed' : new Date(s.ends_at).getTime() < Date.now() ? 'Expired' : 'Active'
                    return (
                      <tr key={s.id} className="hover:bg-secondary/20">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-foreground">{s.group_name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${status === 'Active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-900 text-zinc-400'}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleExportCsv(s)} className="text-xs text-blue-400 hover:underline">
                            CSV
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
