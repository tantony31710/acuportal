import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { supabase } from "../supabase/client";

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Sessions · Anti-Proxy Attendance" },
      {
        name: "description",
        content: "Full history of attendance sessions with per-session breakdown.",
      },
    ],
  }),
  component: SessionsPage,
});

interface SessionSummary {
  id: string;
  groupName: string;
  pin: string;
  startedAt: string;
  closedAt: string | null;
  total: number;
  present: number;
  flagged: number;
  absent: number;
}

function SessionsPage() {
  const [sessionsData, setSessionsData] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessionsAndStats = async () => {
    try {
      const { data: rawSessions } = await supabase
        .from("attendance_sessions" as any)
        .select("*");

      if (!rawSessions) return;

      const { data: rawLogs } = await supabase
        .from("attendance_logs" as any)
        .select("*");

      const logs = rawLogs || [];
      const totalRosterSize = 40;

      const formatted = rawSessions.map((s: any) => {
        const sessionLogs = logs.filter((l: any) => l.session_id === s.id);
        const flagged = sessionLogs.filter((l: any) => l.is_flagged === true).length;
        const present = sessionLogs.length - flagged;
        const absent = Math.max(0, totalRosterSize - sessionLogs.length);

        return {
          id: s.id,
          groupName: s.target_group || "General Class",
          pin: s.pin_code || "0000",
          startedAt: s.created_at || s.started_at,
          closedAt: s.expires_at || null,
          total: totalRosterSize,
          present,
          flagged,
          absent,
        };
      });

      setSessionsData(formatted);
    } catch (err) {
      console.error("Error building dashboard indices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionsAndStats();

    const liveFeedChannel = supabase
      .channel("realtime-sessions-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_logs" },
        () => {
          fetchSessionsAndStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(liveFeedChannel);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Sessions</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live session logs compiled directly across your active database roster.
        </p>

        {loading ? (
          <div className="mt-10 text-center text-sm text-muted-foreground">
            Synchronizing live session records...
          </div>
        ) : sessionsData.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No sessions active yet.
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {sessionsData.map((s) => {
              const rate = s.total ? Math.round((s.present / s.total) * 100) : 0;
              const safeWidth = Math.min(rate, 100);

              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                        ID: {s.id.slice(0, 8)}...
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {s.groupName} · started{" "}
                        {new Date(s.startedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono font-bold text-primary tracking-wider">
                        {s.pin}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {s.closedAt ? "active monitoring window" : "closed"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-3 text-sm">
                    <Cell label="Roster" value={s.total} />
                    <Cell label="Present" value={s.present} tone="success" />
                    <Cell label="Flagged" value={s.flagged} tone="warning" />
                    <Cell label="Absent" value={s.absent} />
                  </div>

                  {/* Dynamic Progress Bar - Completely Style Attribute Free */}
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                    <div 
                      className="h-full bg-primary transition-all duration-300 dynamic-progress-bar"
                      data-width={`${safeWidth}%`}
                    />
                  </div>
                  <div className="mt-1 text-right text-xs text-muted-foreground">
                    {rate}% present validation index
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning";
}) {
  const color =
    tone === "success"
      ? "text-emerald-600 font-medium"
      : tone === "warning"
      ? "text-amber-500 font-bold"
      : "text-foreground";

  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-mono text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}