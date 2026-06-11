import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { GROUPS, ROSTER, type Group } from "@/lib/attendance";

export const Route = createFileRoute("/roster")({
  head: () => ({
    meta: [
      { title: "Roster · Anti-Proxy Attendance" },
      {
        name: "description",
        content:
          "Full roster of 275 students across G1–G4 with advisor assignments.",
      },
    ],
  }),
  component: RosterPage,
});

function RosterPage() {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<Group>("ALL");

  const list = useMemo(() => {
    const t = q.trim();
    return ROSTER.filter(
      (s) =>
        (group === "ALL" || s.group === group) &&
        (!t || s.id.includes(t) || s.name.includes(t)),
    );
  }, [q, group]);

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Roster</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {list.length} of {ROSTER.length} students
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ID or name…"
              className="rounded-md border border-border bg-input px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
            />
            {(["ALL", ...GROUPS] as Group[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={
                  "rounded-md border px-3 py-1.5 text-sm " +
                  (group === g
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground")
                }
              >
                {g === "ALL" ? "All" : g}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Group</th>
                <th className="px-4 py-2">Advisor</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 400).map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-2 font-mono text-xs">{s.id}</td>
                  <td className="px-4 py-2 font-arabic" dir="rtl">
                    {s.name}
                  </td>
                  <td className="px-4 py-2">{s.group}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.advisor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}