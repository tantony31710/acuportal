import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DOMPurify from 'dompurify'
import { SiteNav } from '../components/SiteNav'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { getActiveSession, submitAttendance, getFingerprint, type Session } from '../lib/attendance'
import { detectAttendanceAnomaly } from '../lib/anomaly-detector'
import { checkLocation } from '../lib/location'
import { supabase } from '../lib/supabase'

type MsgType = 'success' | 'error' | 'warning' | 'info'

// ── Simple client-side rate limiter ──────────────────────────────────────────
const RATE_LIMIT_CHECKIN = { attempts: 3, windowMs: 60_000 }
const rateLimitCheckin: number[] = []
function checkRateLimit(): boolean {
  const now = Date.now()
  while (rateLimitCheckin.length && rateLimitCheckin[0] < now - RATE_LIMIT_CHECKIN.windowMs) {
    rateLimitCheckin.shift()
  }
  if (rateLimitCheckin.length >= RATE_LIMIT_CHECKIN.attempts) return false
  rateLimitCheckin.push(now)
  return true
}

// ── Location status component ─────────────────────────────────────────────────
function LocationBadge({
  status,
  detail,
}: {
  status: 'idle' | 'checking' | 'ok' | 'flagged' | 'denied'
  detail: string
}) {
  if (status === 'idle') return null

  const config = {
    checking: { icon: '⟳', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', spin: true },
    ok: { icon: '📍', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', spin: false },
    flagged: { icon: '⚠️', bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', spin: false },
    denied: { icon: '🚫', bg: 'bg-red-500/10 border-red-500/30 text-red-400', spin: false },
  }[status]

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`mb-4 flex items-center gap-2.5 overflow-hidden rounded-xl border px-4 py-2.5 text-xs ${config.bg}`}
    >
      <span className={config.spin ? 'animate-spin' : ''}>{config.icon}</span>
      <span>
        {status === 'checking' && 'Checking location…'}
        {status === 'ok' && `On campus (${detail})`}
        {status === 'flagged' && detail}
        {status === 'denied' && 'Location access denied — submission flagged'}
      </span>
      {status === 'ok' && (
        <span className="ml-auto flex items-center gap-1 font-semibold uppercase tracking-wider text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping-slow" />
          Verified
        </span>
      )}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CheckIn() {
  const [session, setSession] = useState<Session | null>(null)
  const [studentId, setStudentId] = useState('')
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState<{ type: MsgType; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'checking' | 'ok' | 'flagged' | 'denied'>('idle')
  const [locationDetail, setLocationDetail] = useState('')
  const [success, setSuccess] = useState(false)
  const fingerprint = useRef(getFingerprint())
  const pinRefs = useRef<(HTMLInputElement | null)[]>([])
  const studentIdRef = useRef<HTMLInputElement>(null)

  const fetchSession = async () => {
    const s = await getActiveSession()
    setSession(s)
  }

  useEffect(() => {
    fetchSession()
    const interval = setInterval(fetchSession, 5000)
    const channel = supabase
      .channel('checkin-session-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, fetchSession)
      .subscribe()
    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  const sanitize = (v: string) =>
    DOMPurify.sanitize(v.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    if (!checkRateLimit()) {
      setMsg({ type: 'error', text: 'Too many attempts. Please wait a minute.' })
      return
    }

    const cleanId = sanitize(studentId)
    if (!cleanId) { setMsg({ type: 'error', text: 'Enter your Student ID' }); return }
    if (pin.trim().length !== 6) { setMsg({ type: 'error', text: 'PIN must be 6 digits' }); return }
    if (!session) { setMsg({ type: 'error', text: 'No active session' }); return }

    setSubmitting(true)
    setLocationStatus('checking')
    setMsg({ type: 'info', text: '📍 Checking your location…' })

    const locResult = await checkLocation()
    let locationFlag: string | null = null

    // Check for anomalies
    const anomaly = detectAttendanceAnomaly(cleanId, session.id)
    if (anomaly.isAnomaly) {
      locationFlag = anomaly.reason ?? 'ANOMALY_DETECTED'
      setMsg({ type: 'warning', text: `⚠️ System flag: ${anomaly.reason}` })
    }

    if (!locResult.ok) {
      locationFlag = locationFlag ? `${locationFlag}|${locResult.reason}` : locResult.reason
      setLocationStatus(locResult.reason.includes('denied') ? 'denied' : 'flagged')
      setLocationDetail(locResult.reason)
      setMsg({ type: 'warning', text: `⚠️ ${locResult.reason} — recorded as flagged` })
    } else if (!locationFlag) { // Only set status to ok if not already flagged by anomaly
      setLocationStatus('ok')
      setLocationDetail(`${locResult.distance}m from campus`)
    }

    const fingerprintWithLocation = locationFlag
      ? `${fingerprint.current}|LOC_FLAG:${locationFlag}`
      : fingerprint.current

    const result = await submitAttendance({
      studentId: cleanId,
      pin: pin.trim(),
      fingerprint: fingerprintWithLocation,
      locationFlag: locationFlag ?? undefined,
    })

    if (result.ok) {
      setSuccess(true)
      if (result.late) {
        setMsg({ type: 'warning', text: `⏰ Recorded as LATE for ${result.studentName}` })
      } else if (locationFlag) {
        setMsg({ type: 'warning', text: `⚠️ Flagged (location) but recorded for ${result.studentName}` })
      } else {
        setMsg({ type: 'success', text: `✓ Attendance recorded for ${result.studentName}` })
      }
      setStudentId('')
      setPin('')
      setLocationStatus('idle')
      // Auto-reset success after 5s
      setTimeout(() => { setSuccess(false); setMsg(null) }, 5000)
    } else {
      setMsg({ type: 'error', text: result.reason ?? 'Submission failed' })
    }

    setSubmitting(false)
  }

  const msgColors: Record<MsgType, string> = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    error: 'bg-red-500/10 text-red-400 border-red-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <AnimatedBackground orbCount={3} particleCount={30} />
      <SiteNav />

      <main className="relative z-10 mx-auto max-w-md px-5 py-12">
        <motion.div
          className="card-glass p-7"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="mb-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-teal-400">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping-slow" />
              Student check-in
            </div>
            <h1 className="text-2xl font-bold text-white">Enter Student ID & Session PIN</h1>
            <div className="mt-2 space-y-1 text-xs text-white/35">
              <p><strong className="text-white/50">Step 1:</strong> Your instructor displays the session PIN on screen.</p>
              <p><strong className="text-white/50">Step 2:</strong> Enter your registered Student ID and the PIN below.</p>
            </div>
          </div>

          {/* Session banner */}
          <AnimatePresence mode="wait">
            <motion.div
              key={session ? 'active' : 'inactive'}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.3 }}
              className={`mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-xs font-medium ${
                session
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-red-500/20 bg-red-500/8 text-red-400'
              }`}
            >
              {session ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping-slow flex-shrink-0" />
                  <span>Live session active — <strong>Group {session.group}</strong></span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
                  <span>No active session — ask your instructor to start one</span>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Location indicator */}
          <AnimatePresence>
            <LocationBadge status={locationStatus} detail={locationDetail} />
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Student ID */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
                Student ID
              </label>
              <input
                ref={studentIdRef}
                type="text"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder="82510022"
                inputMode="numeric"
                autoComplete="off"
                className="input-glow"
                disabled={submitting}
              />
            </div>

            {/* PIN boxes */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/40">
                Session PIN
              </label>
              <div className="flex justify-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => {
                  const filled = Boolean(pin[i])
                  return (
                    <motion.input
                      key={i}
                      ref={el => { pinRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={pin[i] || ''}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '')
                        const arr = pin.split('')
                        arr[i] = val
                        const newPin = arr.join('').slice(0, 6)
                        setPin(newPin)
                        if (val && i < 5) pinRefs.current[i + 1]?.focus()
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !pin[i] && i > 0) pinRefs.current[i - 1]?.focus()
                      }}
                      className={`pin-box ${filled ? 'filled' : ''}`}
                      disabled={submitting || !session}
                      animate={filled ? { scale: [1, 1.12, 1] } : {}}
                      transition={{ duration: 0.18 }}
                    />
                  )
                })}
              </div>
            </div>

            {/* Message */}
            <AnimatePresence>
              {msg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`overflow-hidden rounded-xl border px-4 py-3 text-sm font-medium ${msgColors[msg.type]}`}
                >
                  {msg.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={submitting || !session}
              className={`relative w-full overflow-hidden rounded-xl py-3.5 font-bold text-slate-950 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
                success
                  ? 'bg-emerald-400 shadow-glow-emerald'
                  : 'btn-glow-teal'
              }`}
              whileTap={!submitting && session ? { scale: 0.98 } : {}}
            >
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.span
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Attendance Recorded!
                  </motion.span>
                ) : submitting ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                    {locationStatus === 'checking' ? 'Checking location…' : 'Submitting…'}
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    Submit Attendance
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          {/* Device fingerprint (security info) */}
          <div className="mt-5 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
            <div className="text-[10px] text-white/20 font-mono break-all">
              <span className="text-white/30">Device ID: </span>
              {fingerprint.current.slice(0, 24)}…
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
