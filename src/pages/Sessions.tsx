import { useEffect, useState } from 'react'
import { SiteNav } from '@/components/SiteNav'
import {
  fetchAllSessions,
  fetchSubmissions,
  summarizeDbSession,
  exportSessionCsv,
  downloadCsv,
  type DbSession,
  type DbSubmission,
} from '@/lib/attendance-api'

export function Sessions() {
  const [sessions, setSessions] = useState<DbSession[]>([])
  const [subsMap, setSubsMap] = useState<Map<string, DbSubmission[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const list = await fetchAllSessions()
      setSessions(list)
      const map = new Map<string, DbSubmission[]>()
      for (const s of list) map.set(s.id, await fetchSubmissions(s.id))
      setSubsMap(map)
      setLoading(false)
    }
    load()
    const poll = setInterval(load, 10000)
    return () => clearInterval(poll)
  }, [])

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Sessions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Full history with present, flagged, and absent counts.</p>
        {loading ? (
          <div className="mt-10 text-center text-sm text-muted-foreground">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No sessions yet.
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {sessions.map(s => {
              const sm = summarizeDbSession(s, subsMap.get(s.id) ?? [])
              const rate = sm.total ? Math.round(((sm.present + sm.late) / sm.total) * 100) : 0
              const status = !s.is_active ? 'closed' : new Date(s.ends_at).getTime() < Date.now() ? 'expired' : 'active'
              return (
                <div key={s.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-foreground">
                        {s.group_name} · <span className="text-sm text-muted-foreground">{status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="pin-digit text-2xl text-primary">{s.pin_code}</div>
                      <button
                        onClick={() => downloadCsv(exportSessionCsv(s, subsMap.get(s.id) ?? []), `session_${s.id}.csv`)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-5 gap-3 text-sm">
                    {[['Roster', sm.total, 'text-foreground'], ['Present', sm.present, 'text-emerald-400'], ['Late', sm.late, 'text-amber-300'], ['Flagged', sm.flagged, 'text-amber-400'], ['Absent', sm.absent, 'text-muted-foreground']].map(([l, v, c]) => (
                      <div key={String(l)} className="rounded-lg border border-border bg-background/40 p-3">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
                        <div className={`mt-1 font-mono text-xl font-semibold ${c}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                    <div style={{ width: `${Math.min(rate, 100)}%` }} className="h-full bg-primary transition-all duration-300" />
                  </div>
                  <div className="mt-1 text-right text-xs text-muted-foreground">{rate}% attended</div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
