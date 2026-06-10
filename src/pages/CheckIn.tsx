import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SiteNav } from '../components/SiteNav'
import { supabase } from '../lib/supabase'

export default function CheckIn() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState<boolean>(true)
  const [userEmail, setUserEmail] = useState<string>('')
  
  // UI States
  const [studentIdInput, setStudentIdInput] = useState<string>('')
  const [pinInput, setPinInput] = useState<string>('')
  const [expectedPin, setExpectedPin] = useState<string | null>(null)
  const [sessionMessage, setSessionMessage] = useState<string>("Waiting for cloud sync...")
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false)
  const [activeSessionData, setActiveSessionData] = useState<any>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)

  // 1. Initial State Check
  const checkInitialSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/auth')
        return
      }
      setUserEmail(user.email || '')

      const { data: activeSession, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()

      if (error) throw error

      updateSessionUI(activeSession)
    } catch (err: any) {
      setSessionMessage("Cloud connection offline: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper to handle UI updates cleanly
  const updateSessionUI = (session: any) => {
    if (session && new Date(session.ends_at).getTime() > Date.now()) {
      setIsSessionActive(true)
      setExpectedPin(session.pin_code)
      setActiveSessionData(session)
      setSessionMessage(`Live session detected for Group ${session.group_name}!`)
    } else {
      setIsSessionActive(false)
      setExpectedPin(null)
      setActiveSessionData(null)
      setSessionMessage("No active session. Ask your instructor to start one.")
    }
  }

  // 2. Open Persistent Cloud WebSocket Connection
  useEffect(() => {
    checkInitialSession()

    // Subscribe to database changes in realtime
    const sessionChannel = supabase
      .channel('live-attendance-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_sessions' },
        (payload) => {
          console.log('Realtime update received from cloud:', payload)
          // If a session was updated or inserted, re-evaluate it immediately
          if (payload.new && (payload.new as any).is_active) {
            updateSessionUI(payload.new)
          } else {
            // Session closed or turned off
            setIsSessionActive(false)
            setExpectedPin(null)
            setActiveSessionData(null)
            setSessionMessage("The attendance session has ended.")
          }
        }
      )
      .subscribe()

    // Cleanup cloud channel on component unmount to prevent memory leaks
    return () => {
      supabase.removeChannel(sessionChannel)
    }
  }, [navigate])

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSessionActive || !activeSessionData) return

    if (!studentIdInput.trim()) {
      alert("Please enter your Student ID.")
      return
    }

    if (pinInput !== expectedPin) {
      alert("Invalid verification code. Please check the screen or ask your instructor.")
      return
    }

    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('attendance_submissions')
        .insert([
          {
            session_id: activeSessionData.id,
            student_id: studentIdInput, 
            email: user?.email || userEmail,
            status: 'present',
            created_at: new Date().toISOString()
          }
        ])

      if (error) throw error

      alert("Attendance recorded successfully! You are checked in.")
      setPinInput('')
    } catch (err: any) {
      alert("Failed to submit attendance: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <h3>Connecting to Realtime Cloud...</h3>
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
          
          <h1 className="text-2xl font-bold mt-2">Enter Student ID & Session PIN</h1>
          <p className="text-xs text-slate-400 mt-1 mb-6">Signed in as: {userEmail}</p>

          <div className="text-left text-xs bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6 space-y-2 text-slate-400">
            <p><strong>Step 1:</strong> Your instructor displays the session PIN on screen.</p>
            <p><strong>Step 2:</strong> Enter your registered Student ID and the PIN below.</p>
          </div>

          <div className={`p-3 rounded-lg mb-6 text-xs font-medium border transition-colors duration-300 ${
            isSessionActive 
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-950/40 text-rose-400 border-rose-500/20'
          }`}>
            {sessionMessage}
          </div>

          <form onSubmit={handleAttendanceSubmit} className="space-y-5 text-left">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Student ID
              </label>
              <input 
                type="text" 
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                placeholder="82510022" 
                disabled={submitting}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Session PIN
              </label>
              <input 
                type="text" 
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter PIN" 
                disabled={submitting || !isSessionActive}
                className="w-full text-center font-mono text-2xl tracking-widest rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none focus:border-blue-500 disabled:opacity-40"
              />
            </div>

            <button 
              type="submit"
              disabled={submitting || !isSessionActive || !pinInput}
              className="w-full mt-2 rounded-lg bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
            >
              {submitting ? "Verifying..." : "Submit attendance"}
            </button>
          </form>

        </div>
      </main>
    </div>
  )
}
