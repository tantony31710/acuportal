import { useEffect, useState } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { getActiveSession, submitAttendance, getFingerprint } from '@/lib/attendance'

export function CheckIn() {
  const [studentId, setStudentId] = useState('')
  const [pin, setPin] = useState('')
  const [fp, setFp] = useState('')
  const [msg, setMsg] = useState<{type:'success'|'error';text:string}|null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [active, setActive] = useState(getActiveSession())

  useEffect(() => {
    setFp(getFingerprint())
    const sync = () => setActive(getActiveSession())
    window.addEventListener('ap:update', sync)
    const t = setInterval(sync, 5000)
    return () => { window.removeEventListener('ap:update', sync); clearInterval(t) }
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null)
    if (!active) return setMsg({ type:'error', text:'No active session. Ask your instructor to start one.' })
    if (!studentId.trim() || pin.trim().length < 4) return setMsg({ type:'error', text:'Enter your Student ID and the session PIN.' })
    setSubmitting(true)
    const result = submitAttendance({ studentId: studentId.trim(), pin: pin.trim(), fingerprint: fp })
    setSubmitting(false)
    if (!result.ok) setMsg({ type:'error', text: result.reason ?? 'Attendance rejected.' })
    else { setMsg({ type:'success', text: `✓ Attendance recorded for ${result.studentName}` }); setStudentId(''); setPin('') }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteNav />
      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50">
          <div className="text-center">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary">Student check-in</span>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Enter Student ID & Session PIN</h1>
            <p className="mt-3 text-sm text-slate-500">
              <strong>Step 1:</strong> Your instructor displays the session PIN on screen<br />
              <strong>Step 2:</strong> Enter your registered Student ID and the PIN below
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {active ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-medium">✅ Active session</p>
                <p className="mt-1">Group: <strong>{active.group}</strong></p>
                <p className="mt-1 text-xs text-slate-500">Closes at {new Date(active.endsAt).toLocaleTimeString()}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">No active session. Ask your instructor to start one.</div>
            )}

            <form className="space-y-4" onSubmit={submit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Student ID</label>
                <input value={studentId} onChange={e => setStudentId(e.target.value.replace(/\D/g,''))}
                  placeholder="82510022" inputMode="numeric" disabled={!active||submitting}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Session PIN</label>
                <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,''))}
                  placeholder="000000" maxLength={8} inputMode="numeric" disabled={!active||submitting}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-3xl font-mono tracking-[0.6em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50" />
              </div>

              {msg && (
                <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${msg.type==='success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                  {msg.text}
                </div>
              )}

              <button type="submit" disabled={!active||submitting}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-background hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit attendance'}
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Device signature: <span className="font-mono">{fp || 'Generating...'}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
