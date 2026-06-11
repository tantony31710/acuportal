import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { formatCountdown } from "@/components/countdown";
import { useAttendanceTick } from "@/hooks/use-attendance";
import { useIsTeacher } from "@/lib/auth";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anti-Proxy Attendance" },
      {
        name: "description",
        content:
          "Anti-proxy attendance system with PIN-gated sessions and device fingerprinting.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const teacher = useIsTeacher();

  if (!mounted) return null;

  // If teacher is logged in, redirect to teacher dashboard
  if (teacher === true) {
    return <TeacherLandingRedirect />;
  }

  // If teacher is false (not logged in), show landing with two options
  if (teacher === false) {
    return <StudentTeacherChoice />;
  }

  // Loading state
  return null;
}

function StudentTeacherChoice() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="font-display text-5xl font-bold text-white sm:text-6xl">
            Anti-Proxy Attendance
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            PIN-gated sessions with device fingerprinting and real-time audit logs
          </p>
        </div>

        {/* Two-path choice */}
        <div className="grid gap-8 sm:grid-cols-2">
          {/* Student Path */}
          <Link
            to="/check-in"
            className="group rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950 to-emerald-900 p-8 transition hover:border-emerald-400/50 hover:shadow-xl hover:shadow-emerald-500/20"
          >
            <div className="text-4xl">🎓</div>
            <h2 className="mt-4 text-2xl font-bold text-white">Student Check-In</h2>
            <p className="mt-2 text-emerald-100">
              Enter your Student ID and the 4-digit PIN your instructor provides.
            </p>
            <div className="mt-6 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition group-hover:bg-emerald-500">
              Check In →
            </div>
          </Link>

          {/* Teacher Path */}
          <Link
            to="/login"
            className="group rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950 to-blue-900 p-8 transition hover:border-blue-400/50 hover:shadow-xl hover:shadow-blue-500/20"
          >
            <div className="text-4xl">👨‍🏫</div>
            <h2 className="mt-4 text-2xl font-bold text-white">Teacher Dashboard</h2>
            <p className="mt-2 text-blue-100">
              Start a session, manage PINs, and monitor real-time attendance.
            </p>
            <div className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition group-hover:bg-blue-500">
              Sign In →
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-700/30 p-6 backdrop-blur">
            <div className="text-2xl">🔐</div>
            <h3 className="mt-3 font-semibold text-white">One-Time PINs</h3>
            <p className="mt-2 text-sm text-slate-300">
              Generate 4-digit session codes that expire automatically.
            </p>
          </div>
          <div className="rounded-xl bg-slate-700/30 p-6 backdrop-blur">
            <div className="text-2xl">📱</div>
            <h3 className="mt-3 font-semibold text-white">Device Fingerprints</h3>
            <p className="mt-2 text-sm text-slate-300">
              Detect shared devices and proxy attendance attempts.
            </p>
          </div>
          <div className="rounded-xl bg-slate-700/30 p-6 backdrop-blur">
            <div className="text-2xl">📊</div>
            <h3 className="mt-3 font-semibold text-white">Live Audit</h3>
            <p className="mt-2 text-sm text-slate-300">
              Monitor present, flagged, and absent submissions in real time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherLandingRedirect() {
  useEffect(() => {
    // Redirect logged-in teachers to the teacher dashboard
    const timer = setTimeout(() => {
      window.location.href = "/teacher";
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl">👨‍🏫</div>
        <p className="mt-4 text-slate-400">Redirecting to teacher dashboard...</p>
      </div>
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "primary" | "warning";
}) {
  const ring =
    accent === "primary"
      ? "ring-primary/40"
      : accent === "warning"
      ? "ring-warning/40"
      : "ring-border";
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ring-1 ${ring}`}>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-mono text-3xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function ActivePanel({
  active,
  summary,
}: {
  active: ReturnType<typeof getActiveSession> & object;
  summary: ReturnType<typeof summarizeSession>;
}) {
  const remaining = formatCountdown(active.endsAt);
  const checkInUrl =
    typeof window !== "undefined" ? `${window.location.origin}/check-in` : "/check-in";
  return (
    <div className="mt-5 space-y-6">
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            PIN
          </div>
          <div className="pin-digit mt-2 text-4xl text-primary">{active.pin}</div>
        </div>
        <div className="rounded-lg border border-border bg-secondary/40 p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Group
          </div>
          <div className="mt-2 text-3xl font-semibold">{active.group}</div>
        </div>
        <div className="rounded-lg border border-border bg-secondary/40 p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Time left
          </div>
          <div className="pin-digit mt-2 text-3xl text-foreground">{remaining}</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Present" value={summary.present} tone="success" />
        <MiniStat label="Flagged" value={summary.flagged} tone="warning" />
        <MiniStat label="Absent" value={summary.absent} tone="muted" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/check-in"
          className="rounded-md border border-border bg-secondary px-4 py-2 text-sm text-foreground hover:border-primary"
        >
          Open check-in form →
        </Link>
        <button
          onClick={() => navigator.clipboard?.writeText(checkInUrl)}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Copy student link
        </button>
        <button
          onClick={() => closeSession(active.id)}
          className="ml-auto rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:brightness-110"
        >
          ⏹ Close session
        </button>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "muted";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
      ? "text-warning"
      : "text-muted-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-mono text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
