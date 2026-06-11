import { ROSTER_VALIDATION, type ValidStudent } from "./roster-validation";

export type Student = ValidStudent;

/**
 * ROSTER is the validated, deduplicated student list.
 * If validation failed, this falls back to the rows that DID pass so the
 * rest of the app keeps working in read-only mode while the error screen
 * is shown to the operator.
 */
export const ROSTER: Student[] = ROSTER_VALIDATION.ok
  ? ROSTER_VALIDATION.data
  : ROSTER_VALIDATION.partial;
export const GROUPS = ["G1", "G2", "G3", "G4"] as const;
export type Group = (typeof GROUPS)[number] | "ALL";

export type AttendanceStatus = "present" | "flagged" | "absent";

export type SubmissionRecord = {
  studentId: string;
  timestamp: number;
  pinUsed: string;
  status: Exclude<AttendanceStatus, "absent">;
  reason?: string;
  fingerprint: string;
};

export type Session = {
  id: string;
  pin: string;
  group: Group;
  startedAt: number;
  endsAt: number;
  closedAt: number | null;
  windowMinutes: number;
  submissions: SubmissionRecord[];
};

const SESSIONS_KEY = "ap_sessions_v1";
const ACTIVE_KEY = "ap_active_session_v1";

function read<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(k: string, v: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new Event("ap:update"));
}

export function getSessions(): Session[] {
  return read<Session[]>(SESSIONS_KEY, []);
}

export function getActiveSessionId(): string | null {
  return read<string | null>(ACTIVE_KEY, null);
}

export function getActiveSession(): Session | null {
  const id = getActiveSessionId();
  if (!id) return null;
  const s = getSessions().find((x) => x.id === id) ?? null;
  if (!s) return null;
  if (!s.closedAt && Date.now() > s.endsAt) {
    return closeSession(s.id);
  }
  return s;
}

export function getSession(id: string): Session | null {
  return getSessions().find((s) => s.id === id) ?? null;
}

function generatePin(len = 4) {
  let p = "";
  for (let i = 0; i < len; i++) p += Math.floor(Math.random() * 10);
  return p;
}

export function startSession(opts: { group: Group; windowMinutes: number }): Session {
  // close existing
  const existingId = getActiveSessionId();
  if (existingId) closeSession(existingId);
  const now = Date.now();
  const session: Session = {
    id: `S-${new Date(now).toISOString().slice(0, 16).replace(/[-:T]/g, "")}`,
    pin: generatePin(4),
    group: opts.group,
    startedAt: now,
    endsAt: now + opts.windowMinutes * 60_000,
    closedAt: null,
    windowMinutes: opts.windowMinutes,
    submissions: [],
  };
  const all = getSessions();
  all.unshift(session);
  write(SESSIONS_KEY, all);
  write(ACTIVE_KEY, session.id);
  return session;
}

export function closeSession(id: string): Session | null {
  const all = getSessions();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  if (!all[idx].closedAt) {
    all[idx] = { ...all[idx], closedAt: Date.now() };
    write(SESSIONS_KEY, all);
  }
  if (getActiveSessionId() === id) write(ACTIVE_KEY, null);
  return all[idx];
}

export type SubmitOutcome = {
  ok: boolean;
  status: SubmissionRecord["status"] | "rejected";
  reason?: string;
  session?: Session;
};

/**
 * Anti-proxy audit: composition borrowed from File 2.
 *  - PIN must match
 *  - Group must match (unless ALL)
 *  - Student must be in roster
 *  - Duplicate student → flagged (proxy attempt)
 *  - Fingerprint reused across distinct students within 60s → both flagged
 */
export function submitAttendance(input: {
  studentId: string;
  pin: string;
  fingerprint: string;
}): SubmitOutcome {
  const active = getActiveSession();
  if (!active) return { ok: false, status: "rejected", reason: "No active session" };
  if (active.closedAt) return { ok: false, status: "rejected", reason: "Session closed" };
  if (Date.now() > active.endsAt)
    return { ok: false, status: "rejected", reason: "Window expired" };
  if (input.pin.trim() !== active.pin)
    return { ok: false, status: "rejected", reason: "Incorrect PIN" };

  const student = ROSTER.find((s) => s.id === input.studentId.trim());
  if (!student)
    return { ok: false, status: "rejected", reason: "Student ID not in roster" };
  if (active.group !== "ALL" && student.group !== active.group)
    return {
      ok: false,
      status: "rejected",
      reason: `Wrong group — session is ${active.group}`,
    };

  const ts = Date.now();
  let status: SubmissionRecord["status"] = "present";
  let reason: string | undefined;

  const dup = active.submissions.find((r) => r.studentId === student.id);
  if (dup) {
    // Hard reject: one response per person.
    const flag: SubmissionRecord = {
      studentId: student.id,
      timestamp: ts,
      pinUsed: input.pin,
      status: "flagged",
      reason: "Duplicate attempt (rejected)",
      fingerprint: input.fingerprint,
    };
    const all0 = getSessions();
    const i0 = all0.findIndex((s) => s.id === active.id);
    all0[i0] = { ...all0[i0], submissions: [...all0[i0].submissions, flag] };
    write(SESSIONS_KEY, all0);
    return {
      ok: false,
      status: "rejected",
      reason: "Already checked in — one response per person",
    };
  }

  // Fingerprint reuse across distinct students within 60s
  const reuse = active.submissions.find(
    (r) =>
      r.fingerprint === input.fingerprint &&
      r.studentId !== student.id &&
      ts - r.timestamp < 60_000,
  );
  if (reuse) {
    // Hard reject proxy attempt; log as flagged.
    const flag: SubmissionRecord = {
      studentId: student.id,
      timestamp: ts,
      pinUsed: input.pin,
      status: "flagged",
      reason: "Shared device fingerprint (proxy rejected)",
      fingerprint: input.fingerprint,
    };
    const all0 = getSessions();
    const i0 = all0.findIndex((s) => s.id === active.id);
    all0[i0] = { ...all0[i0], submissions: [...all0[i0].submissions, flag] };
    write(SESSIONS_KEY, all0);
    return {
      ok: false,
      status: "rejected",
      reason: "This device already submitted for another student",
    };
  }

  const record: SubmissionRecord = {
    studentId: student.id,
    timestamp: ts,
    pinUsed: input.pin,
    status,
    reason,
    fingerprint: input.fingerprint,
  };

  const all = getSessions();
  const idx = all.findIndex((s) => s.id === active.id);
  all[idx] = { ...all[idx], submissions: [...all[idx].submissions, record] };
  write(SESSIONS_KEY, all);

  return { ok: true, status, reason, session: all[idx] };
}

export function summarizeSession(s: Session) {
  const rosterForGroup =
    s.group === "ALL" ? ROSTER : ROSTER.filter((r) => r.group === s.group);
  const presentIds = new Set(
    s.submissions.filter((r) => r.status === "present").map((r) => r.studentId),
  );
  const flaggedIds = new Set(
    s.submissions.filter((r) => r.status === "flagged").map((r) => r.studentId),
  );
  const absent = rosterForGroup.filter(
    (r) => !presentIds.has(r.id) && !flaggedIds.has(r.id),
  );
  return {
    total: rosterForGroup.length,
    present: presentIds.size,
    flagged: flaggedIds.size,
    absent: absent.length,
    absentList: absent,
  };
}

export function getFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  const k = "ap_fp_v1";
  let v = localStorage.getItem(k);
  if (!v) {
    v =
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2) +
      "-" +
      (navigator.hardwareConcurrency || 0) +
      "-" +
      (screen.width + "x" + screen.height);
    localStorage.setItem(k, v);
  }
  return v;
}

export function exportFlagsCsv(): string {
  const rows = [["Session", "Student ID", "Name", "Group", "Reason", "Timestamp"]];
  for (const s of getSessions()) {
    for (const r of s.submissions) {
      if (r.status !== "flagged") continue;
      const stu = ROSTER.find((x) => x.id === r.studentId);
      rows.push([
        s.id,
        r.studentId,
        stu?.name ?? "",
        stu?.group ?? "",
        r.reason ?? "",
        new Date(r.timestamp).toISOString(),
      ]);
    }
  }
  return rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function useAttendanceTick() {
  // Trigger consumers via custom event; consumed via React hook in components.
}