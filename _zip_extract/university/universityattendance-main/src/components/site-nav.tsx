import { Link } from "@tanstack/react-router";
import { revokeTeacher, useIsTeacher } from "@/lib/auth";

const links = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/check-in", label: "Check-in", icon: "✅" },
  { to: "/sessions", label: "Sessions", icon: "🗂" },
  { to: "/flags", label: "Flags", icon: "🚩" },
  { to: "/roster", label: "Roster", icon: "👥" },
  { to: "/admin", label: "Admin", icon: "⚙️" },
] as const;

export function SiteNav() {
  const teacher = useIsTeacher();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4">
        <Link to="/" className="group flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground shadow-[0_0_30px_-8px_var(--color-primary)]">
            <span className="text-lg font-bold">A</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-foreground">
              Anti-Proxy Attendance
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              275 students · G1–G4
            </div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links
            .filter((l) => (l.to === "/admin" ? teacher === true : true))
            .map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              activeProps={{
                className:
                  "rounded-md px-3 py-2 text-sm bg-secondary text-foreground",
              }}
            >
              <span className="mr-1.5 opacity-80">{l.icon}</span>
              {l.label}
            </Link>
          ))}
          {teacher === true ? (
            <button
              onClick={() => revokeTeacher()}
              className="ml-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary"
              title="Sign out of teacher device"
            >
              Sign out
            </button>
          ) : teacher === false ? (
            <Link
              to="/login"
              className="ml-2 rounded-md border border-primary/40 px-3 py-2 text-xs text-primary hover:bg-primary/10"
            >
              Teacher login
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}