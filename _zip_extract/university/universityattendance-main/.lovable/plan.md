# Secure University Attendance — Rebuild Plan

The current workspace is the blank Lovable template, so we build the whole thing fresh on top of Lovable Cloud (database + auth + server functions). Nothing security-sensitive will live in the browser.

## What we'll build

**Roles**
- `teacher` — opens sessions, sees roster + attendance.
- `student` — joins a session by entering the PIN; submits own attendance.

**Sign-in (Lovable Cloud auth)**
- Email + password for both teachers and students.
- Google sign-in (via Lovable broker) as an extra option.
- A `user_roles` table (separate from profiles) with `app_role` enum; `has_role()` security-definer function for RLS checks.
- Teachers are promoted manually (first teacher seeded; later teachers granted by an existing teacher).

**Data model (in Lovable Cloud)**
- `profiles` — id (= auth.users.id), full_name, student_number, group, advisor.
- `user_roles` — user_id, role (`teacher`|`student`).
- `sessions` — id, teacher_id, course, pin_hash, pin_expires_at, opened_at, closed_at.
- `attendance` — id, session_id, student_id, submitted_at, ip, user_agent. Unique(session_id, student_id).

RLS:
- Roster (`profiles`) readable only by teachers; students read only their own row.
- `sessions` readable by anyone authenticated (so students can see active session metadata) but only teachers can insert/update.
- `attendance` insertable only by the authenticated student for themselves via a server function (RLS denies direct inserts).
- All write paths go through `createServerFn` with `requireSupabaseAuth`.

**Server-side PIN (fixes weak RNG + client-only model)**
- `openSession` server fn: teacher-only. Generates a 4-digit PIN with `crypto.randomInt(0, 10000)`, stores **only a hash** (`crypto.subtle` SHA-256 + per-session salt) and an expiry (e.g. 10 min). Returns the plaintext PIN to the teacher's screen only.
- `submitAttendance` server fn: student-only. Inputs `{ sessionId, pin }`. Server re-hashes and compares; checks expiry, dedupes by `(session_id, student_id)`, records IP + UA. PIN never leaves the server in any response to students.
- `closeSession` server fn: teacher-only.

**Anti-proxy (fixes localStorage flags)**
- One attendance row per student per session enforced by a unique index.
- Server records IP + user-agent for the teacher to spot duplicates.
- Optional: per-session rate limit (e.g. 1 submission per IP per 30s).

**UI**
- `/auth` — sign in / sign up (email+password, Google).
- `/_authenticated/student` — student dashboard: enter PIN for active session, see own attendance history.
- `/_authenticated/teacher` — teacher dashboard: open/close session, live attendance list, roster (only this view exposes PII, and only to teachers).
- `/` — public landing explaining the app.

## What this fixes

| Finding | Fix |
|---|---|
| Client-only security model | All state in Postgres; PIN validated by server fn; RLS-enforced. |
| Roster PII in bundle | Roster lives in `profiles` table behind RLS; never shipped to anonymous visitors. |
| Hardcoded teacher passcode | Removed entirely; replaced with Lovable Cloud auth + `user_roles` table. |
| Weak `Math.random()` PIN | Generated server-side with `crypto.randomInt`; stored hashed. |

## Technical notes

- TanStack Start with `createServerFn` + `requireSupabaseAuth` for every mutation.
- `_authenticated/route.tsx` (integration-managed) gates the dashboard subtree.
- `attachSupabaseAuth` wired in `src/start.ts` so server fns get the bearer token.
- One migration creates enum, tables, GRANTs, RLS policies, and `has_role()`.
- Roster import: after enabling Cloud, you can either CSV-upload via teacher UI or I can seed a sample row; bulk import of the real 275-student roster happens once you give us the file.

## Out of scope for v1

- Bulk roster CSV importer UI (we'll add a placeholder; full importer is a follow-up).
- Email/phone OTP, SAML.
- Advanced anti-proxy (device fingerprint, geofencing) — flag-only for now.

Approve and I'll start by enabling Lovable Cloud, then build the schema, auth, and server fns, then the two dashboards.