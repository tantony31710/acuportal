import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { claimTeacher, revokeTeacher, useIsTeacher } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Teacher login · Anti-Proxy Attendance" },
      {
        name: "description",
        content:
          "Claim this device as the teacher device. Only the teacher can start sessions or upload roster CSVs.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const teacher = useIsTeacher();
  const navigate = useNavigate();
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (claimTeacher(pass)) {
      navigate({ to: "/" });
    } else {
      setErr("Incorrect passcode");
    }
  }

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-md px-5 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Teacher login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only the teacher device can start sessions and manage the roster.
          Students don't need to log in — they just open{" "}
          <Link to="/check-in" className="text-primary hover:underline">
            /check-in
          </Link>
          .
        </p>

        {teacher ? (
          <div className="mt-8 rounded-xl border border-success/40 bg-success/10 p-5 text-sm text-success">
            ✓ This device is the teacher device.
            <div className="mt-4 flex gap-3">
              <Link
                to="/"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
              >
                Go to dashboard
              </Link>
              <button
                onClick={() => revokeTeacher()}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
                Teacher passcode
              </label>
              <input
                type="password"
                autoFocus
                autoComplete="current-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-4 py-3 font-mono text-lg outline-none ring-primary/40 focus:ring-2"
              />
            </div>
            {err && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                ✗ {err}
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-md bg-primary py-3 font-semibold text-primary-foreground transition hover:brightness-110"
            >
              Claim teacher device
            </button>
          </form>
        )}
      </main>
    </div>
  );
}