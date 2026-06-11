import { useEffect, useRef, useState } from 'react'
import { SiteNav } from '../components/SiteNav'
import { getActiveSession, submitAttendance, getFingerprint, type Session } from '../lib/attendance'
import { checkLocation } from '../lib/location'
import { supabase } from '../lib/supabase'

type MsgType = 'success' | 'error' | 'warning' | 'info'

export default function CheckIn() {
  const [session, setSession] = useState<Session | null>(null)
  const [studentId, setStudentId] = useState('')
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState<{ type: MsgType; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'checking' | 'ok' | 'flagged' | 'denied'>('idle')
  const [locationDetail, setLocationDetail] = useState('')
  const fingerprint = useRef(getFingerprint())
  const pinRefs = useRef<(HTMLInputElement | null)[]>([])

  const fetchSession = async () => {
    const s = await getActiveSession()
    setSession(s)
  }

  useEffect(() => {
    fetchSession()
    const interval = setInterval(fetchSession, 5000)

    // Realtime subscription
    const channel = supabase
      .channel('checkin-session-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, () => {
        fetchSession()
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!studentId.trim()) { setMsg({ type: 'error', text: 'Enter your Student ID' }); return }
    if (pin.trim().length !== 6) { setMsg({ type: 'error', text: 'PIN must be 6 digits' }); return }
    if (!session) { setMsg({ type: 'error', text: 'No active session' }); return }

    setSubmitting(true)

    // Step 1: Location check
    setLocationStatus('checking')
    setMsg({ type: 'info', text: '📍 Checking your location...' })

    const locResult = await checkLocation()
    let locationFlag: string | null = null

    if (!locResult.ok) {
      locationFlag = locResult.reason
      setLocationStatus(locResult.reason.includes('denied') ? 'denied' : 'flagged')
      setLocationDetail(locResult.reason)
      setMsg({
        type: 'warning',
        text: `⚠️ ${locResult.reason} — submission recorded as flagged`
      })
    } else {
      setLocationStatus('ok')
      setLocationDetail(`${locResult.distance}m from campus`)
    }

    // Step 2: Submit attendance (with location flag info embedded in fingerprint if flagged)
    const fingerprintWithLocation = locationFlag
      ? `${fingerprint.current}|LOC_FLAG:${locationFlag}`
      : fingerprint.current

    const result = await submitAttendance({
      studentId: studentId.trim(),
      pin: pin.trim(),
      fingerprint: fingerprintWithLocation,
      locationFlag: locationFlag ?? undefined,
    })

    if (result.ok) {
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
    } else {
      setMsg({ type: 'error', text: result.reason ?? 'Submission failed' })
    }

    setSubmitting(false)
  }

  const msgColors: Record<MsgType, string> = {
    success: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    error: 'bg-red-950 text-red-400 border-red-800',
    warning: 'bg-amber-950 text-amber-400 border-amber-800',
    info: 'bg-blue-950 text-blue-400 border-blue-800',
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SiteNav />
      <main className="mx-auto max-w-md px-5 py-12">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">

          <div className="mb-2 inline-block rounded-full bg-slate-800 px-3 py-1 text-[11px] uppercase tracking-wider text-slate-400">
            Student check-in
          </div>
          <h1 className="mt-2 text-2xl font-bold">Enter Student ID & Session PIN</h1>
          <div className="mt-2 mb-5 text-xs text-slate-400 space-y-1">
            <p><strong className="text-slate-300">Step 1:</strong> Your instructor displays the session PIN on screen (or scan their QR code).</p>
            <p><strong className="text-slate-300">Step 2:</strong> Enter your registered Student ID and the PIN below.</p>
          </div>

          {/* Session status banner */}
          <div className={`mb-5 rounded-lg border px-4 py-3 text-xs font-medium transition-all ${
            session
              ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
              : 'border-rose-800 bg-rose-950 text-rose-400'
          }`}>
            {session
              ? `✓ Live session active — Group ${session.group}`
              : 'No active session. Ask your instructor to start one.'}
          </div>

          {/* Location indicator */}
          {locationStatus !== 'idle' && (
            <div className={`mb-4 rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${
              locationStatus === 'checking' ? 'border-blue-800 bg-blue-950 text-blue-400' :
              locationStatus === 'ok' ? 'border-emerald-800 bg-emerald-950 text-emerald-400' :
              'border-amber-800 bg-amber-950 text-amber-400'
            }`}>
              {locationStatus === 'checking' && <span className="animate-spin">⟳</span>}
              {locationStatus === 'ok' && '📍'}
              {(locationStatus === 'flagged' || locationStatus === 'denied') && '⚠️'}
              <span>
                {locationStatus === 'checking' && 'Checking location...'}
                {locationStatus === 'ok' && `On campus (${locationDetail})`}
                {locationStatus === 'flagged' && locationDetail}
                {locationStatus === 'denied' && 'Location access denied'}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder="82510022"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-teal-500"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Session PIN</label>
              <div className="flex gap-2 justify-center">
                {Array.from({ length: 6 }).map((_, i) => (
                  <input
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
                    className="w-11 h-12 rounded-lg border border-slate-700 bg-slate-950 text-center text-xl font-mono text-white outline-none focus:border-teal-500"
                    disabled={submitting || !session}
                  />
                ))}
              </div>
            </div>

            {msg && (
              <div className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${msgColors[msg.type]}`}>
                {msg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !session}
              className="w-full rounded-lg bg-teal-500 py-3 font-semibold text-white transition hover:bg-teal-400 disabled:opacity-40"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {locationStatus === 'checking' ? 'Checking location...' : 'Submitting...'}
                </span>
              ) : 'Submit attendance'}
            </button>
          </form>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[10px] text-slate-600 font-mono break-all">
            Device: {fingerprint.current.slice(0, 20)}...
          </div>
        </div>
      </main>
    </div>
  )
}
