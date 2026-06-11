import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import { getMyRoles } from "@/lib/attendance.functions";
import { LayoutDashboard, CheckSquare, BookOpen, Flag, Users, LogIn, LogOut } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, emoji: "📊" },
  { to: "/check-in", label: "Check-in", icon: CheckSquare, emoji: "✅" },
  { to: "/sessions", label: "Sessions", icon: BookOpen, emoji: "📚" },
  { to: "/flags", label: "Flags", icon: Flag, emoji: "🚩" },
  { to: "/roster", label: "Roster", icon: Users, emoji: "👥" },
] as const;

export function TopNav() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email?: string | null } | null>(null);
  const fetchRoles = useServerFn(getMyRoles);
  const roles = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => fetchRoles(),
    enabled: !!user,
  });

  useEffect(() => {
    supabase.auth.getUser().then((res) => setUser(res.data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, s: any) =>
      setUser(s?.user ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const isTeacher = roles.data?.roles.includes("teacher");

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground font-display font-bold text-xl">
            A
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-foreground">
              Anti-Proxy Attendance
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Verified roll-call
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 rounded-2xl border border-border/60 bg-card/40 p-1">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="group flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=active]:shadow"
            >
              <span aria-hidden>{n.emoji}</span>
              <span className="font-medium">{n.label}</span>
            </Link>
          ))}
        </nav>

        {user ? (
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/50 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isTeacher ? "Sign out" : "Sign out"}
            </span>
          </button>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/50 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <LogIn className="h-4 w-4" />
            Teacher login
          </Link>
        )}
      </div>
      <nav className="md:hidden flex overflow-x-auto gap-1 border-t border-border/60 bg-card/40 px-4 py-2">
        {navItems.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-muted-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
          >
            {n.emoji} {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
