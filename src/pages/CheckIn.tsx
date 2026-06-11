import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SiteNav } from '../components/SiteNav'
import { supabase } from '../lib/supabase'
import { fetchActiveSession, submitCheckIn, getFingerprint, type DbSession } from '../lib/attendance-api'

export default function CheckIn() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [studentIdInput, setStudentIdInput] = useState('')
  const [pinInput, setPinInput] = useState(searchParams.get('pin') ?? '')
  const [fingerprint, setFingerprint] = useState('')
  const [sessionMessage, setSessionMessage] = useState('Locating live lecture session...')
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [activeSession, setActiveSession] = useState<DbSession | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<{ name: string; status: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSessionData = (session: DbSession | null) => {
    if (session && new Date(session.ends_at).getTime() > Date.now()) {
      setIsSessionActive(true)
      setActiveSession(session)
      if (!pinInput) setPinInput(session.pin_code)
      setSessionMessage(`Live session for Group ${session.group_name || 'All'}!`)
    } else {
      setIsSessionActive(false)
      setActiveSession(null)
      setSessionMessage('No active session. Ask your instructor to start one.')
    }
  }

  const loadSession = async () => {
    try {
      const session = await fetchActiveSession()
      handleSessionData(session)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection error'
      setSessionMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setFingerprint(getFingerprint())
    loadSession()

    const channel = supabase
      .channel('realtime-attendance-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, (payload) => {
        if (payload.new && (payload.new as DbSession).is_active === true) {
          handleSessionData(payload.new as DbSession)
        } else {
          setIsSessionActive(false)
          setActiveSession(null)
          setSessionMessage('No active session. Ask your instructor to start one.')
        }
      })
      .subscribe()

    const poll = setInterval(loadSession, 5000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [])

  useEffect(() => {
    const pinFromUrl = searchParams.get('pin')
    if (pinFromUrl) setPinInput(pinFromUrl)
  }, [searchParams])

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setConfirmation(null)
    if (!isSessionActive || !activeSession) return

    if (!studentIdInput.trim()) {
      setErrorMsg('Please enter your Student ID.')
      return
    }
    if (!pinInput.trim()) {
      setErrorMsg('Please enter the session PIN.')
      return
    }

    try {
      setSubmitting(true)
      const result = await submitCheckIn({
        session: activeSession,
        studentId: studentIdInput,
        pin: pinInput,
        fingerprint,
      })

      if (!result.ok) {
        setErrorMsg(result.reason)
        return
      }

      setConfirmation({
        name: result.studentName,
        status: result.status === 'late' ? 'Late (checked in during final 2 minutes)' : 'Present',
      })
      setStudentIdInput('')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-medium tracking-wide text-slate-300">Connecting to live session...</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <SiteNav />
      <main className="mx-auto max-w-md px-5 py-12">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl text-center">
          <div className="mb-2 inline-block rounded-full bg-slate-800 px-3 py-1 text-[11px] uppercase tracking-wider text-slate-400">
            Student check-in
          </div>

          <h1 className="text-2xl font-bold mt-2">Enter Student ID &amp; Session PIN</h1>
          <p className="text-xs text-slate-400 mt-1 mb-6">No login required — just your Student ID</p>

          <div className="text-left text-xs bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6 space-y-2 text-slate-400">
            <p><strong>Step 1:</strong> Your instructor displays the PIN (or scan their QR code).</p>
            <p><strong>Step 2:</strong> Enter your Student ID and PIN below.</p>
          </div>

          <div className={`p-3 rounded-lg mb-6 text-xs font-medium border transition-all duration-300 ${
            isSessionActive
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-950/40 text-rose-400 border-rose-500/20'
          }`}>
            {sessionMessage}
          </div>

          {confirmation && (
            <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-950/50 p-5 text-center">
              <div className="text-3xl mb-2">✓</div>
              <div className="text-lg font-bold text-emerald-300">Check-in confirmed</div>
              <div className="mt-2 font-arabic text-xl text-white" dir="rtl">{confirmation.name}</div>
              <div className="mt-1 text-xs text-emerald-400">{confirmation.status}</div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAttendanceSubmit} className="space-y-5 text-left">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Student ID
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={studentIdInput}
                onChange={e => setStudentIdInput(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 82510022"
                disabled={submitting}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Session PIN
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter PIN"
                disabled={submitting || !isSessionActive}
                className="w-full text-center font-mono text-2xl tracking-widest rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-blue-500 disabled:opacity-40"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !isSessionActive || !pinInput}
              className="w-full mt-2 rounded-lg bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit attendance'}
            </button>
          </form>

          <div className="mt-4 text-[10px] text-slate-600 font-mono truncate">
            Device: {fingerprint.slice(0, 16)}...
          </div>
        </div>
      </main>
    </div>
  )
}
