import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SiteNav } from '@/components/SiteNav'
import { useIsTeacher } from '@/lib/auth'
import { useAttendanceTick } from '@/lib/hooks'
import { GROUPS, type Group } from '@/lib/roster'
import { getActiveSession, getSessions, startSession, closeSession, summarizeSession, exportSessionCsv } from '@/lib/attendance'

function dl(csv: string, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})); a.download = name; a.click()
}

export function Teacher() {
  const teacher = useIsTeacher()
  const navigate = useNavigate()
  useAttendanceTick()
  const [group, setGroup] = useState<Group>('G1')
  const [windowMin, setWindowMin] = useState(15)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => { if (teacher === false) navigate('/auth') }, [teacher])

  if (!mounted || teacher === null) return null

  const active = getActiveSession()
  const sessions = getSessions()
  const summary = active ? summarizeSession(active) : null
  const remaining = active ? Math.max(0, Math.floor((active.endsAt - Date.now()) / 60000)) : 0
  const remainingSec = active ? Math.max(0, Math.floor(((active.endsAt - Date.now()) % 60000) / 1000)) : 0

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
            {active && summary ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs text-slate-400">Session PIN (announce aloud)</div>
                      <div className="pin-digit mb-1 text-4xl text-blue-300">{active.pin}</div>
                      <div className="text-xs text-slate-400">Time left: {remaining}:{String(remainingSec).padStart(2,'0')}</div>
                    </div>
                    <div className="space-y-3 text-white">
                      <div><div className="text-xs text-slate-400">Group</div><div className="text-lg font-semibold">{active.group}</div></div>
                      <div><div className="text-xs text-slate-400">Present</div><div className="text-2xl font-bold text-emerald-400">{summary.present}</div></div>
                      <div><div className="text-xs text-slate-400">Flagged</div><div className="text-2xl font-bold text-amber-400">{summary.flagged}</div></div>
                      <div><div className="text-xs text-slate-400">Closes at</div><div className="text-sm">{new Date(active.endsAt).toLocaleTimeString()}</div></div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { closeSession(active.id); window.dispatchEvent(new Event('ap:update')) }}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500">Close session</button>
                  <button onClick={() => dl(exportSessionCsv(active), `session_${active.id}.csv`)}
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Export CSV</button>
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
                          className={`rounded-md border px-3 py-1.5 text-sm transition ${group===g ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-blue-400/50'}`}>
                          {g === 'ALL' ? 'All' : g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Window (minutes)</label>
                    <input type="number" min={1} max={180} value={windowMin} onChange={e => setWindowMin(Number(e.target.value)||15)}
                      className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-white outline-none focus:border-blue-400" />
                  </div>
                </div>
                <button onClick={() => { startSession({ group, windowMinutes: windowMin }); window.dispatchEvent(new Event('ap:update')) }}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500">▶ Start new session</button>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950 p-5">
              <div className="text-xs text-emerald-300">Roster size</div>
              <div className="mt-2 text-3xl font-bold text-emerald-300">275</div>
            </div>
            <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-5">
              <div className="text-xs text-slate-400">Sessions</div>
              <div className="mt-2 text-3xl font-bold text-white">{sessions.length}</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/50 p-5">
              <div className="text-xs text-amber-300">Flagged events</div>
              <div className="mt-2 text-3xl font-bold text-amber-300">{sessions.reduce((n,s)=>n+s.submissions.filter(r=>r.status==='flagged').length,0)}</div>
            </div>
          </aside>
        </div>

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Session history</h2>
          {sessions.length === 0
            ? <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No sessions yet. Start one above.</div>
            : <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>{['Started','Group','Present','Flagged','Status','Export'].map(h=><th key={h} className="px-4 py-2">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sessions.map(s => {
                      const sm = summarizeSession(s)
                      const status = s.closedAt ? 'closed' : Date.now() > s.endsAt ? 'expired' : 'active'
                      return (
                        <tr key={s.id} className="hover:bg-secondary/20">
                          <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(s.startedAt).toLocaleString()}</td>
                          <td className="px-4 py-3 text-foreground">{s.group}</td>
                          <td className="px-4 py-3 font-semibold text-success">{sm.present}</td>
                          <td className="px-4 py-3 font-semibold text-warning">{sm.flagged}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{status}</td>
                          <td className="px-4 py-3"><button onClick={() => dl(exportSessionCsv(s),`session_${s.id}.csv`)} className="text-xs text-primary hover:underline">CSV</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>}
        </section>
      </main>
    </div>
  )
}
