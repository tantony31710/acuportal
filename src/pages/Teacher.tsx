import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'qrcode'
import { SiteNav } from '../components/SiteNav'
import { AnimatedBackground } from '../components/AnimatedBackground'
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

// ── Animated number counter ───────────────────────────────────────────────────
function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    const start = prev.current
    const end = value
    prev.current = value
    if (start === end) return
    const duration = 600
    const startTime = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(start + (end - start) * ease))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])

  return <span className={className}>{display}</span>
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, color, icon, delay = 0,
}: {
  label: string; value: number; color: string; icon: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="stat-card"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/40">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <AnimatedNumber value={value} className={`text-3xl font-extrabold ${color}`} />
    </motion.div>
  )
}

// ── Session status badge ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'Active' | 'Closed' | 'Expired' }) {
  const styles = {
    Active:  'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    Closed:  'border-white/10 bg-white/5 text-white/30',
    Expired: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}>
      {status === 'Active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping-slow" />}
      {status}
    </span>
  )
}

// ── Countdown bar ─────────────────────────────────────────────────────────────
function Countdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState({ min: 0, sec: 0, pct: 100 })

  useEffect(() => {
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now()
      if (ms <= 0) { setRemaining({ min: 0, sec: 0, pct: 0 }); return }
      setRemaining({
        min: Math.floor(ms / 60000),
        sec: Math.floor((ms % 60000) / 1000),
        pct: Math.max(0, Math.min(100, (ms / (15 * 60000)) * 100)),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  const urgent = remaining.min < 2
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-2xl font-bold tabular-nums ${urgent ? 'text-red-400' : 'text-white'}`}>
          {remaining.min}:{String(remaining.sec).padStart(2, '0')}
        </span>
        <span className="text-xs text-white/30">remaining</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className={`h-full rounded-full ${urgent ? 'bg-red-400' : 'bg-teal-400'}`}
          animate={{ width: `${remaining.pct}%` }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </div>
    </div>
  )
}

// ── Active session panel ──────────────────────────────────────────────────────
function ActiveSessionPanel({
  active, summary, qrCanvasRef, actionLoading, onClose, onExport,
}: {
  active: DbSession
  summary: ReturnType<typeof summarizeDbSession>
  qrCanvasRef: React.RefObject<HTMLCanvasElement>
  actionLoading: boolean
  onClose: () => void
  onExport: () => void
}) {
  return (
    <motion.div
      key="active"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <div className="live-badge">
          <span className="dot" />
          Live Session
        </div>
        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300">
          {active.group_name}
        </span>
      </div>

      {/* PIN + QR */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/35">Session PIN</div>
          <div className="mb-3 font-mono text-5xl font-extrabold tracking-[0.18em] text-glow-teal gradient-text-teal">
            {active.pin_code}
          </div>
          <Countdown endsAt={active.ends_at} />
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">      
          <div className="mb-2 text-xs text-white/30">Scan to auto-fill PIN</div>
          <div className="rounded-xl bg-white p-2.5 shadow-lg">
            <canvas ref={qrCanvasRef} />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Present" value={summary.present} color="text-emerald-400" icon="✅" delay={0.05} />
        <StatCard label="Late" value={summary.late} color="text-amber-300" icon="⏰" delay={0.1} />
        <StatCard label="Flagged" value={summary.flagged} color="text-orange-400" icon="🚩" delay={0.15} />
        <StatCard label="Absent" value={summary.absent} color="text-slate-400" icon="❌" delay={0.2} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <motion.button
          disabled={actionLoading}
          onClick={onClose}
          className="flex-1 rounded-xl bg-red-600/80 px-4 py-3 font-bold text-white transition hover:bg-red-500 disabled:opacity-40"
          whileTap={{ scale: 0.97 }}
        >
          {actionLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Closing…
            </span>
          ) : 'Close Session'}
        </motion.button>
        <motion.button
          onClick={onExport}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
          whileTap={{ scale: 0.97 }}
        >
          Export CSV
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Start session panel ───────────────────────────────────────────────────────
function StartSessionPanel({
  group,
  setGroup,
  windowMin,
  setWindowMin,
  actionLoading,
  onStart,
}: {
  group: Group
  setGroup: (g: Group) => void
  windowMin: number
  setWindowMin: (n: number) => void
  actionLoading: boolean
  onStart: () => void
}) {
  return (
    <motion.div
      key="start"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Group selector */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">
            Target group
          </label>
          <div className="flex flex-wrap gap-2">
            {(['ALL', ...GROUPS] as Group[]).map(g => (
              <motion.button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                whileTap={{ scale: 0.93 }}
                className={`rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all ${
                  group === g
                    ? 'border-teal-500/60 bg-teal-500/15 text-teal-300 shadow-glow-teal'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70'
                }`}
              >
                {g === 'ALL' ? 'All Groups' : g}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Window */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">
            Window (minutes)
          </label>
          <input
            type="number"
            min={1}
            max={180}
            value={windowMin}
            onChange={e => setWindowMin(Number(e.target.value) || 15)}
            className="input-glow font-mono"
          />
        </div>
      </div>

      <motion.button
        disabled={actionLoading}
        onClick={onStart}
        className="btn-glow-teal w-full py-4 text-base text-slate-950 disabled:opacity-40"
        whileTap={{ scale: 0.98 }}
      >
        {actionLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
            Starting session…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>▶</span> Start New Live Session
          </span>
        )}
      </motion.button>
    </motion.div>
  )
}


// ── Main Teacher component ────────────────────────────────────────────────────
export default function Teacher() {
  const teacher = useIsTeacher()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState<DbSession | null>(null)
  const [group, setGroup] = useState<Group>('ALL')
  const [windowMin, setWindowMin] = useState(15)
  const [sessionsHistory, setSessionsHistory] = useState<DbSession[]>([])
  const [studentSummaries, setStudentSummaries] = useState<ReturnType<typeof computeStudentSummaries>>([])
  const [submissions, setSubmissions] = useState<DbSubmission[]>([])
  const [allSubsMap, setAllSubsMap] = useState<Map<string, DbSubmission[]>>(new Map())
  const [actionLoading, setActionLoading] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => { setMounted(true) }, [])

  async function fetchDashboardData() {
    if (!teacher) return
    try {
      await autoCloseExpiredSessions()
      const { data: activeData } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()

      const activeSession =
        activeData && new Date(activeData.ends_at).getTime() > Date.now()
          ? (activeData as DbSession)
          : null

      if (activeData && !activeSession) await closeSession(activeData.id)

      setActive(activeSession)

      if (activeSession) {
        setSubmissions(await fetchSubmissions(activeSession.id))
      } else {
        setSubmissions([])
      }

      const { data: allSessions } = await supabase
        .from('attendance_sessions')
        .select('*')
        .order('created_at', { ascending: false })
      setSessionsHistory(allSessions ?? [])

      const subsMap = new Map<string, DbSubmission[]>()
      for (const s of (allSessions ?? [])) {
        subsMap.set(s.id, await fetchSubmissions(s.id))
      }
      setAllSubsMap(subsMap)
      setStudentSummaries(computeStudentSummaries(allSessions ?? [], subsMap))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (mounted && teacher === true) {
      fetchDashboardData()
    } else if (teacher === false) {
      navigate('/check-in')
    }
  }, [mounted, teacher, navigate])

  // QR code
  useEffect(() => {
    if (!active || !qrCanvasRef.current) return
    const url = `${window.location.origin}/check-in?pin=${active.pin_code}`
    QRCode.toCanvas(qrCanvasRef.current, url, {
      width: 130,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch(() => {})
  }, [active?.pin_code])

  const summary = active ? summarizeDbSession(active, submissions) : null

  async function handleStartSession() {
    try {
      setActionLoading(true)
      await supabase.from('attendance_sessions').update({ is_active: false }).eq('is_active', true)
      const pin = Math.floor(100000 + Math.random() * 900000).toString()
      const now = new Date().toISOString()
      const { error } = await supabase.from('attendance_sessions').insert([{
        pin_code: pin,
        group_name: group,
        is_active: true,
        started_at: now,
        ends_at: new Date(Date.now() + windowMin * 60000).toISOString(),
      }])
      if (error) throw error
      await fetchDashboardData()
    } catch (err) {
      alert('Error launching session: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCloseSession(id: string) {
    try {
      setActionLoading(true)
      await closeSession(id)
      await fetchDashboardData()
    } catch (err) {
      alert('Error closing session: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteSession(id: string) {
    if (!confirm('Delete this session and all its data?')) return
    try {
      setActionLoading(true)
      await deleteSession(id)
      await fetchDashboardData()
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setActionLoading(false)
    }
  }

  function handleExportCsv(session: DbSession) {
    exportSessionCsv(session, allSubsMap.get(session.id) ?? [])
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <AnimatedBackground orbCount={4} particleCount={35} />
      <SiteNav />

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-10">
        {/* Page header */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping-slow" />
            Teacher Control Panel
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Manage Sessions</h1>
          <p className="mt-2 text-sm text-white/35">Start PIN-gated sessions; students see them live on their phones.</p>
        </motion.section>

        {/* Top grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Session control card */}
          <motion.section
            className="card-glass p-6 lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <h2 className="mb-5 text-lg font-semibold text-white">
              {active ? 'Active Session' : 'Start a Session'}
            </h2>
            <AnimatePresence mode="wait">
              {active && summary ? (
                <ActiveSessionPanel
                  active={active}
                  summary={summary}
                  qrCanvasRef={qrCanvasRef}
                  actionLoading={actionLoading}
                  onClose={() => handleCloseSession(active.id)}
                  onExport={() => handleExportCsv(active)}
                />
              ) : (
                <StartSessionPanel
                  group={group}
                  setGroup={setGroup}
                  windowMin={windowMin}
                  setWindowMin={setWindowMin}
                  actionLoading={actionLoading}
                  onStart={handleStartSession}
                />
              )}
            </AnimatePresence>
          </motion.section>

          {/* Side stats */}
          <motion.aside
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <StatCard label="Total Students" value={275} color="text-teal-300" icon="🎓" />
            <StatCard label="Total Sessions" value={sessionsHistory.length} color="text-white" icon="🗂" />
            {active && summary && (
              <>
                <StatCard label="Present Now" value={summary.present} color="text-emerald-400" icon="✅" />
                <StatCard label="Flagged Now" value={summary.flagged} color="text-orange-400" icon="🚩" />
              </>
            )}
          </motion.aside>
        </div>

        {/* Semester summary */}
        <motion.section
          className="mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={() => setShowSummary(v => !v)}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-400 transition hover:text-blue-300"
          >
            <motion.span animate={{ rotate: showSummary ? 90 : 0 }} transition={{ duration: 0.2 }}>▶</motion.span>
            Semester attendance summary per student
          </button>

          <AnimatePresence>
            {showSummary && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35 }}
                className="mb-10 overflow-hidden"
              >
                <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.02]">
                  <table className="w-full text-sm text-left">
                    <thead className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/30">
                      <tr>
                        {['Student ID', 'Name', 'Group', 'Sessions', 'Present', 'Late', 'Flagged', 'Absent', '%'].map(h => (       
                          <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {studentSummaries.map(s => (
                        <tr key={s.id} className="transition hover:bg-white/[0.03]">
                          <td className="px-4 py-2.5 font-mono text-xs text-white/30">{s.id}</td>
                          <td className="px-4 py-2.5 font-arabic text-white/80" dir="rtl">{s.name}</td>
                          <td className="px-4 py-2.5 text-white/50">{s.group}</td>
                          <td className="px-4 py-2.5 text-white/50">{s.sessionsTotal}</td>
                          <td className="px-4 py-2.5 font-semibold text-emerald-400">{s.present}</td>
                          <td className="px-4 py-2.5 font-semibold text-amber-300">{s.late}</td>
                          <td className="px-4 py-2.5 font-semibold text-orange-400">{s.flagged}</td>
                          <td className="px-4 py-2.5 text-white/30">{s.absent}</td>
                          <td className="px-4 py-2.5 font-bold text-white">{s.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Session history */}
        <motion.section
          className="mt-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <h2 className="mb-4 text-xl font-bold tracking-tight text-white">Session History</h2>

          {sessionsHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.08] p-14 text-center text-sm text-white/25">
              No sessions yet. Start one above.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.02]">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/30">
                  <tr>
                    {['Date', 'Group', 'Status', 'Present', 'Late', 'Flagged', 'Absent', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3.5 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {sessionsHistory.map((s, idx) => {
                    const sm = summarizeDbSession(s, allSubsMap.get(s.id) ?? [])
                    const isExpiredOrInactive = !s.is_active || new Date(s.ends_at).getTime() < Date.now()
                    const status: 'Active' | 'Closed' | 'Expired' = s.is_active && !isExpiredOrInactive
                      ? 'Active'
                      : !s.is_active
                      ? 'Closed'
                      : 'Expired'
                    return (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="transition hover:bg-white/[0.03]"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs text-white/30">
                          {new Date(s.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-white/70">{s.group_name}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={status} /></td>
                        <td className="px-5 py-3.5 font-semibold text-emerald-400">{sm.present}</td>
                        <td className="px-5 py-3.5 font-semibold text-amber-300">{sm.late}</td>
                        <td className="px-5 py-3.5 font-semibold text-orange-400">{sm.flagged}</td>
                        <td className="px-5 py-3.5 text-white/30">{sm.absent}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleExportCsv(s)}
                              className="text-xs font-bold text-blue-400 transition hover:text-blue-300 hover:underline"
                            >
                              CSV
                            </button>
                            {s.is_active && (
                              <button
                                onClick={() => handleCloseSession(s.id)}
                                className="text-xs text-amber-400 transition hover:text-amber-300 hover:underline"
                              >
                                Close
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSession(s.id)}
                              className="text-xs text-red-400/70 transition hover:text-red-400 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      </main>
    </div>
  )
}
