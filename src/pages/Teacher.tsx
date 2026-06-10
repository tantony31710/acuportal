import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SiteNav } from '../components/SiteNav'
import { supabase } from '../lib/supabase'

// Helper for CSV export
function dl(csv: string, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = name
  a.click()
}

function generateCsvFromSubmissions(session: any, submissions: any[]): string {
  let csv = 'Student ID,Timestamp,Status\n'
  submissions.forEach(sub => {
    csv += `"${sub.student_id}","${new Date(sub.created_at).toISOString()}","${sub.status}"\n`
  })
  return csv
}

export function Teacher() {
  const navigate = useNavigate()
  const [group, setGroup] = useState('ALL')
  const [windowMin, setWindowMin] = useState(15)
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState<any>(null)
  const [sessionsHistory, setSessionsHistory] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState({ min: 0, sec: 0 })

  useEffect(() => { setMounted(true) }, [])

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch active session
      const { data: activeData } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()
      setActive(activeData)

      // 2. Fetch submissions if session is active
      if (activeData) {
        const { data: subData } = await supabase
          .from('attendance_submissions')
          .select('*')
          .eq('session_id', activeData.id)
        setSubmissions(subData || [])
      }

      // 3. Fetch history
      const { data: historyData } = await supabase
        .from('attendance_sessions')
        .select('*')
        .order('created_at', { ascending: false })
      setSessionsHistory(historyData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    }
  }

  useEffect(() => {
    if (mounted) fetchDashboardData()
  }, [mounted])

  // Timer logic
  useEffect(() => {
    if (!active || !active.ends_at) return
    const interval = setInterval(() => {
      const msLeft = new Date(active.ends_at).getTime() - Date.now()
      if (msLeft <= 0) {
        setTimeRemaining({ min: 0, sec: 0 })
        fetchDashboardData()
      } else {
        setTimeRemaining({ min: Math.floor(msLeft / 60000), sec: Math.floor((msLeft % 60000) / 1000) })
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [active])

  // --- THE CORE START SESSION FUNCTION ---
  const handleStartSession = async () => {
    try {
      setActionLoading(true)
      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString()
      const endsAt = new Date(Date.now() + windowMin * 60000).toISOString()

      // Close old sessions
      await supabase.from('attendance_sessions').update({ is_active: false }).eq('is_active', true)

      // Insert new session (WITHOUT the missing instructor_id column)
      const { error } = await supabase
        .from('attendance_sessions')
        .insert([{ 
          pin_code: generatedPin, 
          group_name: group, 
          is_active: true, 
          ends_at: endsAt 
        }])

      if (error) throw error
      await fetchDashboardData()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseSession = async (id: string) => {
    await supabase.from('attendance_sessions').update({ is_active: false }).eq('id', id)
    fetchDashboardData()
  }

  const handleExportCsv = async (session: any) => {
    const { data: subs } = await supabase.from('attendance_submissions').select('*').eq('session_id', session.id)
    dl(generateCsvFromSubmissions(session, subs || []), `session_${session.id}.csv`)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <SiteNav />
      <div className="max-w-6xl mx-auto mt-10">
        <h1 className="text-4xl font-bold mb-8">Teacher Control Panel</h1>
        
        <div className="grid lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h2 className="text-xl font-bold mb-6">Active Session</h2>
            {active ? (
              <div className="space-y-4">
                <div className="text-6xl font-mono font-bold text-blue-400">{active.pin_code}</div>
                <p>Time Left: {timeRemaining.min}:{String(timeRemaining.sec).padStart(2,'0')}</p>
                <button onClick={() => handleCloseSession(active.id)} className="bg-red-600 px-6 py-2 rounded">Close Session</button>
              </div>
            ) : (
              <div className="space-y-4">
                <input type="number" value={windowMin} onChange={e => setWindowMin(Number(e.target.value))} className="bg-slate-800 p-2 rounded w-full" placeholder="Minutes" />
                <button onClick={handleStartSession} className="w-full bg-blue-600 py-4 rounded font-bold">▶ Start New Session</button>
              </div>
            )}
          </section>

          <section className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
            <div className="text-4xl text-emerald-400 font-bold">{submissions.length}</div>
            <p className="text-sm text-slate-400">Submissions received</p>
          </section>
        </div>
      </div>
    </div>
  )
}
