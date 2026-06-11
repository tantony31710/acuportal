import { useEffect, useState } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { ROSTER } from '@/lib/roster'
import {
  fetchAllSessions,
  fetchSubmissions,
  exportFlagsCsv,
  downloadCsv,
  type DbSession,
  type DbSubmission,
} from '@/lib/attendance-api'

type FlagRow = DbSubmission & { session: DbSession; studentName: string; studentGroup: string }

export function Flags() {
  const [rows, setRows] = useState<FlagRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<DbSession[]>([])
  const [subsMap, setSubsMap] = useState<Map<string, DbSubmission[]>>(new Map())

  useEffect(() => {
    async function load() {
      const sessions = await fetchAllSessions()
      setSessions(sessions)
      const map = new Map<string, DbSubmission[]>()
      const flagged: FlagRow[] = []
      for (const s of sessions) {
        const subs = await fetchSubmissions(s.id)
        map.set(s.id, subs)
        for (const sub of subs.filter(x => x.status === 'flagged')) {
          const st = ROSTER.find(r => r.id === sub.student_id)
          flagged.push({
            ...sub,
            session: s,
            studentName: st?.name ?? '—',
            studentGroup: st?.group ?? s.group_name,
          })
        }
      }
      setSubsMap(map)
      setRows(flagged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      setLoading(false)
    }
    load()
    const poll = setInterval(load, 10000)
    return () => clearInterval(poll)
  }, [])

  function dl() {
    downloadCsv(exportFlagsCsv(sessions, subsMap), `flags_${Date.now()}.csv`)
  }

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Flagged events</h1>
            <p className="mt-2 text-sm text-muted-foreground">Duplicates, shared devices, and proxy attempts.</p>
          </div>
          <button onClick={dl} disabled={rows.length === 0} className="rounded-md border border-border bg-secondary px-4 py-2 text-sm hover:border-primary disabled:opacity-40">
            Export CSV
          </button>
        </div>
        {loading ? (
          <div className="mt-10 text-center text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No flagged events so far.
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>{['When', 'Session', 'Student', 'Group', 'Reason'].map(h => <th key={h} className="px-4 py-2">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {new Date(r.session.created_at).toLocaleDateString()} · {r.session.group_name}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-mono text-xs text-muted-foreground">{r.student_id}</div>
                      <div className="font-arabic text-foreground" dir="rtl">{r.studentName}</div>
                    </td>
                    <td className="px-4 py-2 text-foreground">{r.studentGroup}</td>
                    <td className="px-4 py-2 text-amber-400">{r.flag_reason ?? 'Flagged'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
