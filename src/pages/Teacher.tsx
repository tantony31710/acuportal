import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'qrcode'
import { SiteNav } from '../components/SiteNav'
import AttendanceOrb3D from '../components/AttendanceOrb3D'
import { useIsTeacher } from '../lib/auth'
import { GROUPS, type Group } from '../lib/roster'
import { supabase } from '../lib/supabase'
import {
  autoCloseExpiredSessions,
  closeSession,
  deleteSession,
  downloadCsv,
  exportSessionCsv,
  fetchSubmissions,
  summarizeDbSession,
  computeStudentSummaries,
  type DbSession,
  type DbSubmission,
} from '../lib/attendance-api'

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, delay: i * 0.04, ease: 'easeOut' },
  }),
  exit: { opacity: 0, x: 16, transition: { duration: 0.2 } },
}

// ─── Animated SVG progress ring ───────────────────────────────────────────────

function ProgressRing({
  percentage,
  size = 80,
  stroke = 6,
  color = '#22c55e',
}: {
  percentage: number
  size?: number
  stroke?: number
  color?: string
}) {
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const cx = size / 2
  const cy = size / 2

  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden>
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={stroke}
      />
      {/* Animated fill */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{
          strokeDashoffset: circumference - (percentage / 100) * circumference,
        }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'Active' | 'Closed' | 'Expired' }) {
  const styles: Record<typeof status, string> = {
    Active:  'text-emerald-400 border border-emerald-500/30 bg-emerald-950/40',
    Closed:  'text-slate-500  border border-slate-800        bg-transparent',
    Expired: 'text-amber-400  border border-amber-500/30     bg-amber-950/20',
  }

  return (
    <motion.span
      layout
      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${styles[status]}`}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {status}
    </motion.span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Teacher() {
  const teacher = useIsTeacher()
  const navigate = useNavigate()
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const [group, setGroup] = useState<Group>('G1')
  const [windowMin, setWindowMin] = useState(15)
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState<DbSession | null>(null)
  const [sessionsHistory, setSessionsHistory] = useState<DbSession[]>([])
  const [submissions, setSubmissions] = useState<DbSubmission[]>([])
  const [allSubsMap, setAllSubsMap] = useState<Map<string, DbSubmission[]>>(new Map())
  const [actionLoading, setActionLoading] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState({ min: 0, sec: 0 })
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (teacher === false) navigate('/auth') }, [teacher, navigate])

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await autoCloseExpiredSessions()

      const { data: activeData } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()

      const activeSession = activeData && new Date(activeData.ends_at).getTime() > Date.now()
        ? activeData as DbSession
        : null

      if (activeData && !activeSession) {
        await closeSession(activeData.id)
      }

      setActive(activeSession)

      if (activeSession) {
        const subs = await fetchSubmissions(activeSession.id)
        setSubmissions(subs)
      } else {
        setSubmissions([])
      }

      const { data: historyData } = await supabase
        .from('attendance_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      const history = (historyData ?? []) as DbSession[]
      setSessionsHistory(history)

      const subsMap = new Map<string, DbSubmission[]>()
      for (const s of history) {
        subsMap.set(s.id, await fetchSubmissions(s.id))
      }
      setAllSubsMap(subsMap)
    } catch (err) {
      console.error('Failed to sync dashboard:', err)
    }
  }

  useEffect(() => {
    if (mounted && teacher) {
      fetchDashboardData()
      const poll = setInterval(fetchDashboardData, 5000)
      return () => clearInterval(poll)
    }
  }, [mounted, teacher])

  useEffect(() => {
    if (!active?.ends_at) return
    const updateCountdown = async () => {
      const msLeft = new Date(active.ends_at).getTime() - Date.now()
      if (msLeft <= 0) {
        setTimeRemaining({ min: 0, sec: 0 })
        await closeSession(active.id)
        fetchDashboardData()
      } else {
        setTimeRemaining({
          min: Math.floor(msLeft / 60000),
          sec: Math.floor((msLeft % 60000) / 1000),
        })
      }
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [active])

  useEffect(() => {
    if (!active || !qrCanvasRef.current) return
    const checkInUrl = `${window.location.origin}/check-in?pin=${active.pin_code}`
    QRCode.toCanvas(qrCanvasRef.current, checkInUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#1e293b', light: '#ffffff' },
    }).catch(() => {})
  }, [active?.pin_code])

  if (!mounted || teacher === null) return null

  const summary = active ? summarizeDbSession(active, submissions) : null
  const studentSummaries = computeStudentSummaries(sessionsHistory, allSubsMap)

  // Derived stats for the orb
  const presentCount = summary ? summary.present + summary.late : 0
  const absentCount  = summary ? summary.absent : 0
  const totalCount   = summary ? summary.present + summary.late + summary.absent + summary.flagged : 0
  const attendancePct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
  const ringColor = attendancePct >= 75 ? '#22c55e' : attendancePct >= 50 ? '#f59e0b' : '#ef4444'

  const handleStartSession = async () => {
    try {
      setActionLoading(true)
      await supabase.from('attendance_sessions').update({ is_active: false }).eq('is_active', true)

      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString()
      const endsAtTime = new Date(Date.now() + windowMin * 60000).toISOString()

      const now = new Date().toISOString()
      const { error } = await supabase.from('attendance_sessions').insert([{
        pin_code: generatedPin,
        group_name: group,
        is_active: true,
        started_at: now,
        ends_at: endsAtTime,
      }])

      if (error) throw error
      await fetchDashboardData()
    } catch (err: unknown) {
      alert('Error launching session: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseSession = async (id: string) => {
    try {
      setActionLoading(true)
      await closeSession(id)
      await fetchDashboardData()
    } catch (err: unknown) {
      alert('Error closing session: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Delete this session and all its submissions? This cannot be undone.')) return
    try {
      setActionLoading(true)
      await deleteSession(id)
      await fetchDashboardData()
    } catch (err: unknown) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleExportCsv = async (session: DbSession) => {
    const subs = allSubsMap.get(session.id) ?? await fetchSubmissions(session.id)
    downloadCsv(
      exportSessionCsv(session, subs),
      `session_${session.group_name}_${new Date(session.created_at).toISOString().slice(0, 10)}.csv`
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10">

        {/* ── Dashboard header with 3D Orb ── */}
        <section className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-blue-200">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                Teacher Control Panel
              </div>
              <h1 className="text-4xl font-semibold tracking-tight">Manage Sessions</h1>
              <p className="mt-2 text-sm text-slate-400">
                Start PIN-gated sessions; students see them live on their phones.
              </p>
            </div>

            {/* 3D Orb — only rendered when a session is active */}
            {active && summary && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="flex flex-col items-center"
              >
                <AttendanceOrb3D
                  presentCount={presentCount}
                  absentCount={absentCount}
                  totalCount={totalCount}
                />
                <p className="mt-1 text-xs text-slate-500 tracking-wider uppercase">Live attendance</p>
              </motion.div>
            )}
          </div>
        </section>

        {/* ── Stat cards + main panel ── */}
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Main panel */}
          <motion.section
            variants={cardVariants}
            className="lg:col-span-2 rounded-xl border border-blue-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-semibold text-white">Active Session Status</h2>

            {active && summary ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-5">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs text-slate-400 uppercase tracking-wider">Session PIN</div>
                      <div className="mb-3 text-5xl font-mono text-blue-400 font-extrabold tracking-wider">
                        {active.pin_code}
                      </div>
                      <div className="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded w-fit border border-slate-800 mb-4">
                        Time left:{' '}
                        <span className="font-mono text-white font-medium">
                          {timeRemaining.min}:{String(timeRemaining.sec).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mb-1">Scan QR to auto-fill PIN on student phones</div>
                      <div className="inline-block bg-white p-2 rounded-lg">
                        <canvas ref={qrCanvasRef} />
                      </div>
                    </div>

                    <div className="space-y-2.5 border-t border-slate-800 pt-4 sm:border-t-0 sm:pt-0">
                      {/* Attendance ring */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex items-center justify-center">
                          <ProgressRing percentage={attendancePct} color={ringColor} />
                          <span className="absolute text-sm font-bold" style={{ color: ringColor }}>
                            {attendancePct}%
                          </span>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 uppercase tracking-wider">Attendance</div>
                          <div className="text-lg font-bold text-white">{presentCount} / {totalCount}</div>
                        </div>
                      </div>

                      {/* Stats */}
                      {[
                        { label: 'Target Group', value: active.group_name, cls: 'text-blue-400' },
                        { label: 'Present',       value: summary.present,  cls: 'text-emerald-400 font-bold' },
                        { label: 'Late',          value: summary.late,     cls: 'text-amber-300 font-bold' },
                        { label: 'Flagged',       value: summary.flagged,  cls: 'text-amber-400 font-bold' },
                        { label: 'Absent',        value: summary.absent,   cls: 'text-slate-400 font-bold' },
                        { label: 'Closes at',     value: new Date(active.ends_at).toLocaleTimeString(), cls: 'text-slate-300 font-medium' },
                      ].map(({ label, value, cls }) => (
                        <div key={label} className="flex justify-between border-b border-slate-900 pb-1.5 text-sm">
                          <span className="text-slate-400">{label}:</span>
                          <span className={cls}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleCloseSession(active.id)}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
                  >
                    Close Session
                  </button>
                  <button
                    onClick={() => handleExportCsv(active)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Target group
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(['ALL', ...GROUPS] as Group[]).map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGroup(g)}
                          className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                            group === g
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                          }`}
                        >
                          {g === 'ALL' ? 'All' : g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Window (minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={windowMin}
                      onChange={e => setWindowMin(Number(e.target.value) || 15)}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <button
                  disabled={actionLoading}
                  onClick={handleStartSession}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3.5 font-bold text-white tracking-wide transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {actionLoading ? 'Starting...' : '▶ Start New Live Session'}
                </button>
              </div>
            )}
          </motion.section>

          {/* Stat cards */}
          <div className="space-y-4">
            <motion.div
              variants={cardVariants}
              className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-5"
            >
              <div className="text-xs font-semibold tracking-wider uppercase text-emerald-400">Roster</div>
              <div className="mt-2 text-4xl font-extrabold text-emerald-300">275</div>
            </motion.div>

            <motion.div
              variants={cardVariants}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <div className="text-xs font-semibold tracking-wider uppercase text-slate-400">Total Sessions</div>
              <div className="mt-2 text-4xl font-extrabold text-white">{sessionsHistory.length}</div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Student summary ── */}
        <section className="mt-10">
          <button
            onClick={() => setShowSummary(v => !v)}
            className="mb-4 text-sm text-blue-400 hover:text-blue-300 font-semibold"
          >
            {showSummary ? '▼ Hide' : '▶ Show'} semester attendance summary per student
          </button>

          <AnimatePresence>
            {showSummary && (
              <motion.div
                key="summary-table"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="mb-10 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden"
              >
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      {['Student ID', 'Name', 'Group', 'Sessions', 'Present', 'Late', 'Flagged', 'Absent', '%'].map(h => (
                        <th key={h} className="px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    <AnimatePresence>
                      {studentSummaries.map((s, i) => (
                        <motion.tr
                          key={s.id}
                          custom={i}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="hover:bg-slate-900/40"
                        >
                          <td className="px-4 py-2 font-mono text-xs text-slate-400">{s.id}</td>
                          <td className="px-4 py-2 font-arabic" dir="rtl">{s.name}</td>
                          <td className="px-4 py-2">{s.group}</td>
                          <td className="px-4 py-2">{s.sessionsTotal}</td>
                          <td className="px-4 py-2 text-emerald-400">{s.present}</td>
                          <td className="px-4 py-2 text-amber-300">{s.late}</td>
                          <td className="px-4 py-2 text-amber-400">{s.flagged}</td>
                          <td className="px-4 py-2 text-slate-500">{s.absent}</td>
                          <td className="px-4 py-2 font-bold">{s.percentage}%</td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── Session history ── */}
        <section className="mt-4">
          <h2 className="mb-4 text-xl font-bold tracking-tight text-white">Session History</h2>

          {sessionsHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-sm text-slate-500">
              No sessions yet. Start one above.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    {['Date', 'Group', 'Status', 'Present', 'Absent', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  <AnimatePresence>
                    {sessionsHistory.map((s, i) => {
                      const sm = summarizeDbSession(s, allSubsMap.get(s.id) ?? [])
                      const status: 'Active' | 'Closed' | 'Expired' = !s.is_active
                        ? 'Closed'
                        : new Date(s.ends_at).getTime() < Date.now()
                          ? 'Expired'
                          : 'Active'

                      return (
                        <motion.tr
                          key={s.id}
                          custom={i}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="hover:bg-slate-900/40"
                        >
                          <td className="px-5 py-3.5 text-xs font-mono text-slate-400">
                            {new Date(s.created_at).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 font-medium">{s.group_name}</td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={status} />
                          </td>
                          <td className="px-5 py-3.5 text-emerald-400 font-semibold">
                            {sm.present + sm.late}
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">{sm.absent}</td>
                          <td className="px-5 py-3.5 space-x-3">
                            <button
                              onClick={() => handleExportCsv(s)}
                              className="text-xs font-bold text-blue-400 hover:underline"
                            >
                              CSV
                            </button>
                            {s.is_active && (
                              <button
                                onClick={() => handleCloseSession(s.id)}
                                className="text-xs text-amber-400 hover:underline"
                              >
                                Close
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSession(s.id)}
                              className="text-xs text-red-400 hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
