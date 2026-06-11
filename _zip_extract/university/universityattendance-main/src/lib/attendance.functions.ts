import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/supabase/auth-middleware";

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomPin(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % 10000).toString().padStart(4, "0");
}

async function assertTeacher(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "teacher")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: teacher role required");
}

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { roles: (data ?? []).map((r: any) => r.role as string) };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, student_number, academic_group")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: data };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        full_name: z.string().trim().min(1).max(200),
        student_number: z.string().trim().min(1).max(50),
        academic_group: z.string().trim().max(50).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        student_number: data.student_number,
        academic_group: data.academic_group ?? null,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Public stats (no auth) ---------------- */

export const getPublicStats = createServerFn({ method: "GET" }).handler(
  async () => {
    return {
      totalRoster: 0,
      sessionsLogged: 0,
      flaggedEvents: 0,
      activeSessions: [],
      groups: [],
    };
  }
);

/* ---------------- Sessions ---------------- */

export const openSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        course: z.string().trim().min(1).max(120),
        durationMinutes: z.number().int().min(1).max(120).default(10),
        academic_group: z.string().trim().max(50).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertTeacher(supabase, userId);
    const pin = randomPin();
    const pin_hash = await sha256(`${pin}:${userId}`);
    const pin_expires_at = new Date(
      Date.now() + data.durationMinutes * 60_000,
    ).toISOString();
    const { data: row, error } = await supabase
      .from("sessions")
      .insert({
        teacher_id: userId,
        course: data.academic_group
          ? `${data.course} · ${data.academic_group}`
          : data.course,
        pin_hash,
        pin_expires_at,
      })
      .select("id, course, opened_at, pin_expires_at")
      .single();
    if (error) throw new Error(error.message);
    return { session: row, pin };
  });

export const closeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertTeacher(supabase, userId);
    const { error } = await supabase
      .from("sessions")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", data.sessionId)
      .eq("teacher_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listActiveSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("sessions")
      .select("id, course, opened_at, pin_expires_at, teacher_id")
      .is("closed_at", null)
      .gt("pin_expires_at", new Date().toISOString())
      .order("opened_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { sessions: data ?? [] };
  });

export const listMySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertTeacher(supabase, userId);
    const { data, error } = await supabase
      .from("sessions")
      .select("id, course, opened_at, closed_at, pin_expires_at")
      .eq("teacher_id", userId)
      .order("opened_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { sessions: data ?? [] };
  });

/* ---------------- Attendance ---------------- */

export const submitAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        sessionId: z.string().uuid(),
        pin: z.string().regex(/^\d{4}$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session, error: sErr } = await supabase
      .from("sessions")
      .select("id, teacher_id, pin_hash, pin_expires_at, closed_at")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session not found");
    if (session.closed_at) throw new Error("Session is closed");
    if (new Date(session.pin_expires_at).getTime() < Date.now())
      throw new Error("Session has expired");

    const hash = await sha256(`${data.pin}:${session.teacher_id}`);
    if (hash !== session.pin_hash) throw new Error("Incorrect PIN");

    const ip = getRequestIP({ xForwardedFor: true }) ?? null;
    const user_agent = getRequestHeader("user-agent") ?? null;

    const { supabaseAdmin } = await import(
      "@/supabase/client.server"
    );
    const { error } = await supabaseAdmin.from("attendance").insert({
      session_id: data.sessionId,
      student_id: userId,
      ip,
      user_agent,
    });
    if (error) {
      if (error.code === "23505")
        throw new Error("Attendance already submitted for this session");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const getMyAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("attendance")
      .select("id, submitted_at, session_id, sessions(course, opened_at)")
      .eq("student_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

async function attachProfiles(supabase: any, rows: any[]) {
  const ids = Array.from(new Set(rows.map((r) => r.student_id)));
  if (ids.length === 0) return rows;
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, student_number, academic_group")
    .in("id", ids);
  const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
  return rows.map((r) => ({ ...r, profiles: map.get(r.student_id) ?? null }));
}

export const getSessionAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertTeacher(supabase, userId);
    const { data: rows, error } = await supabase
      .from("attendance")
      .select("id, submitted_at, ip, user_agent, student_id")
      .eq("session_id", data.sessionId)
      .order("submitted_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: await attachProfiles(supabase, rows ?? []) };
  });

/* ---------------- Flags: duplicate IP or UA in the same session ---------------- */

export const getFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertTeacher(supabase, userId);
    const { data, error } = await supabase
      .from("attendance")
      .select("id, submitted_at, ip, user_agent, session_id, student_id, sessions(course, opened_at)")
      .order("submitted_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);

    const rows: any[] = await attachProfiles(supabase, data ?? []);
    const buckets = new Map<string, any[]>();
    for (const r of rows) {
      if (r.ip) {
        const k = `ip:${r.session_id}:${r.ip}`;
        buckets.set(k, [...(buckets.get(k) ?? []), r]);
      }
      if (r.user_agent) {
        const k = `ua:${r.session_id}:${r.user_agent}`;
        buckets.set(k, [...(buckets.get(k) ?? []), r]);
      }
    }
    const flags: { kind: "ip" | "ua"; key: string; session: any; records: any[] }[] = [];
    for (const [k, recs] of buckets) {
      const distinct = new Set(recs.map((r) => r.student_id));
      if (distinct.size > 1) {
        const [kind, , value] = k.split(":");
        flags.push({
          kind: kind as "ip" | "ua",
          key: value,
          session: recs[0].sessions,
          records: recs,
        });
      }
    }
    return { flags };
  });

/* ---------------- Roster ---------------- */

export const listRoster = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertTeacher(supabase, userId);
    const { data, error } = await supabase
      .from("roster_entries")
      .select("id, student_number, full_name, academic_group, email")
      .order("academic_group", { ascending: true })
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    return { roster: data ?? [] };
  });

export const importRoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        csv: z.string().min(1).max(2_000_000),
        replace: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertTeacher(supabase, userId);

    // Parse CSV: detect header, support common columns.
    const lines = data.csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) throw new Error("CSV is empty");

    const split = (line: string) => {
      // simple CSV: split on comma, supports double-quoted values
      const out: string[] = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') inQ = !inQ;
        else if (c === "," && !inQ) {
          out.push(cur);
          cur = "";
        } else cur += c;
      }
      out.push(cur);
      return out.map((s) => s.trim().replace(/^"|"$/g, ""));
    };

    const headerCells = split(lines[0]).map((h) => h.toLowerCase());
    const hasHeader = headerCells.some((h) =>
      ["student_number", "studentnumber", "id", "number", "name", "full_name", "group", "email"].includes(h),
    );
    const cols = hasHeader
      ? {
          number: headerCells.findIndex((h) =>
            ["student_number", "studentnumber", "id", "number"].includes(h),
          ),
          name: headerCells.findIndex((h) =>
            ["full_name", "name"].includes(h),
          ),
          group: headerCells.findIndex((h) =>
            ["academic_group", "group", "class"].includes(h),
          ),
          email: headerCells.findIndex((h) => ["email", "mail"].includes(h)),
        }
      : { number: 0, name: 1, group: 2, email: 3 };

    const rows = (hasHeader ? lines.slice(1) : lines)
      .map((l: string) => split(l))
      .map((c: string[]) => ({
        student_number: c[cols.number] ?? "",
        full_name: c[cols.name] ?? "",
        academic_group: cols.group >= 0 ? c[cols.group] ?? null : null,
        email: cols.email >= 0 ? c[cols.email] ?? null : null,
      }))
      .filter((r: { student_number: string; full_name: string }) => r.student_number && r.full_name);

    if (rows.length === 0)
      throw new Error("No valid rows. Expect columns: student_number, full_name, academic_group, email");

    if (data.replace) {
      const { error: dErr } = await supabase
        .from("roster_entries")
        .delete()
        .gte("created_at", "1970-01-01");
      if (dErr) throw new Error(dErr.message);
    }

    const { error } = await supabase
      .from("roster_entries")
      .upsert(rows, { onConflict: "student_number" });
    if (error) throw new Error(error.message);

    return { ok: true, imported: rows.length };
  });

export const clearRoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertTeacher(supabase, userId);
    const { error } = await supabase
      .from("roster_entries")
      .delete()
      .gte("created_at", "1970-01-01");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
