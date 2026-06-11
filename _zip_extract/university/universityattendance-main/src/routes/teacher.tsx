import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { SiteNav } from "@/components/site-nav";
import { useAttendanceTick } from "@/hooks/use-attendance";
import {
  GROUPS,
  ROSTER,
  closeSession,
  getActiveSession,
  getSessions,
  startSession,
  summarizeSession,
  type Group,
} from "@/lib/attendance";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [{ title: "Teacher Dashboard — Anti-Proxy Attendance" }],
  }),
  component: TeacherDashboard,
});

function TeacherDashboard() {
  useAttendanceTick();
  const navigate = useNavigate();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  const active = mounted ? getActiveSession() : null;
  const sessions = mounted ? getSessions() : [];
  const [group, setGroup] = useState<Group>("G1");
  const [windowMin, setWindowMin] = useState(15);

  const summary = active ? summarizeSession(active) : null;
  const last5 = sessions.slice(0, 5);

  // Generate QR code when active session PIN changes
  useEffect(() => {
    if (active && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, active.pin, {
        width: 120,
        margin: 1,
        color: { dark: '#1e293b', light: '#ffffff' }
      }).catch(() => {
        // Silently fail if QR generation doesn't work
      });
    }
  }, [active?.pin]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <section className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            Teacher Control Panel
          </div>
          <h1 className="font-display text-4xl font-semibold text-white">
            Manage Sessions
          </h1>
          <p className="mt-2 text-slate-300">
            Start PIN-gated sessions, monitor real-time attendance, and audit suspicious submissions.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Session Control */}
          <section className="lg:col-span-2 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950 to-blue-900 p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Active Session</h2>
              {active && (
                <span className="font-mono text-xs text-blue-300">
                  {active.id}
                </span>
              )}
            </div>

            {active && summary ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-900/50 p-4">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-slate-400 mb-2">PIN (Scan or Share)</div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-end gap-3">
                          <div>
                            <div className="font-mono text-3xl font-bold text-blue-300 mb-1">
                              {active.pin}
                            </div>
                            <div className="text-xs text-slate-500">4-digit code</div>
                          </div>
                          <div className="bg-white p-2 rounded flex items-center justify-center" style={{ width: '120px', height: '120px' }}>
                            <canvas ref={qrCanvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-slate-400">Group</div>
                        <div className="mt-1 font-semibold text-white text-lg">{active.group}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Present</div>
                        <div className="mt-1 text-2xl font-bold text-emerald-400">
                          {summary.present}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Flagged</div>
                        <div className="mt-1 text-2xl font-bold text-amber-400">
                          {summary.flagged}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    closeSession(active.id);
                    window.location.reload();
                  }}
                  className="w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-500"
                >
                  Close Session
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Target Group
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["ALL", ...GROUPS] as Group[]).map((g) => (
                        <button
                          key={g}
                          onClick={() => setGroup(g)}
                          className={
                            "rounded-md border px-3 py-1.5 text-sm transition " +
                            (group === g
                              ? "border-blue-400 bg-blue-600 text-white"
                              : "border-slate-600 bg-slate-800 text-slate-300 hover:border-blue-400/50")
                          }
                        >
                          {g === "ALL" ? "All" : g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Window (minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={windowMin}
                      onChange={(e) => setWindowMin(Number(e.target.value) || 15)}
                      className="mt-2 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    const s = startSession({ group, windowMinutes: windowMin });
                    window.location.reload();
                    void s;
                  }}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
                >
                  ▶ Start New Session
                </button>
                <p className="text-xs text-slate-400">
                  Students will see this 4-digit PIN on their check-in screen.
                </p>
              </div>
            )}
          </section>

          {/* Stats */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950 p-5">
              <div className="text-xs text-emerald-300">Total Roster</div>
              <div className="mt-2 text-3xl font-bold text-emerald-300">
                {ROSTER.length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-5">
              <div className="text-xs text-slate-400">Sessions</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {sessions.length}
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-950 p-5">
              <div className="text-xs text-amber-300">Flagged Events</div>
              <div className="mt-2 text-3xl font-bold text-amber-300">
                {sessions.reduce(
                  (n, s) => n + s.submissions.filter((r) => r.status === "flagged").length,
                  0,
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Recent Sessions Table */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-white">Session History</h2>
          {last5.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-600 p-10 text-center text-sm text-slate-400">
              No sessions yet. Start one above.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-600">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/60 text-left text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Session ID</th>
                    <th className="px-4 py-2">Group</th>
                    <th className="px-4 py-2">Present</th>
                    <th className="px-4 py-2">Flagged</th>
                    <th className="px-4 py-2">Absent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {last5.map((s) => {
                    const sm = summarizeSession(s);
                    return (
                      <tr key={s.id} className="bg-slate-900/30 hover:bg-slate-900/50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">
                          {s.id}
                        </td>
                        <td className="px-4 py-3 text-white">{s.group}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-400">
                          {sm.present}
                        </td>
                        <td className="px-4 py-3 font-semibold text-amber-400">
                          {sm.flagged}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-400">
                          {sm.absent}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
