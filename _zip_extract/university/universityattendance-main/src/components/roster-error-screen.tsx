import type { RosterIssue } from "@/lib/roster-validation";

export function RosterErrorScreen({
  issues,
  validCount,
}: {
  issues: RosterIssue[];
  validCount: number;
}) {
  // Group issues by row for a clean read.
  const byRow = new Map<number, RosterIssue[]>();
  for (const i of issues) {
    const arr = byRow.get(i.rowIndex) ?? [];
    arr.push(i);
    byRow.set(i.rowIndex, arr);
  }

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-destructive text-destructive-foreground">
              !
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-destructive">
                Roster data failed validation
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {issues.length} issue{issues.length === 1 ? "" : "s"} found in{" "}
                <span className="font-mono text-foreground">src/data-roster.json</span>
                . Fix the source CSV and re-import. The app is locked until the
                roster is clean.
              </p>
              <div className="mt-3 text-xs text-muted-foreground">
                Valid rows so far: {validCount}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Row</th>
                <th className="px-4 py-2">Student ID</th>
                <th className="px-4 py-2">Field</th>
                <th className="px-4 py-2">Issue</th>
              </tr>
            </thead>
            <tbody>
              {[...byRow.entries()].slice(0, 50).map(([row, list]) =>
                list.map((iss, k) => (
                  <tr
                    key={`${row}-${k}`}
                    className="border-t border-border align-top"
                  >
                    <td className="px-4 py-2 font-mono text-xs">
                      {row >= 0 ? `#${row + 1}` : "—"}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {iss.studentId ?? "—"}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{iss.field}</td>
                    <td className="px-4 py-2 text-destructive">{iss.message}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          <div className="mb-2 font-medium text-foreground">Required schema</div>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <code className="font-mono">id</code> — 6–12 digit string
            </li>
            <li>
              <code className="font-mono">name</code> — non-empty Arabic name (≤120
              chars)
            </li>
            <li>
              <code className="font-mono">group</code> — one of G1, G2, G3, G4
            </li>
            <li>
              <code className="font-mono">advisor</code> — non-empty (≤200 chars)
            </li>
            <li>Student IDs must be unique.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}