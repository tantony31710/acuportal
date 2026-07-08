# Master Architecture Plan: Attendance Pipeline

## 1. System & UX Architecture (Full Stack/React/UX)
*   **UI/UX Flow:** A streamlined 'One-Click Check-In' flow that minimizes cognitive load. The user lands on a dashboard, clicks a high-contrast 'Check-In' button, and receives immediate, positive visual feedback (micro-interaction).
*   **Component Structure:**
    *   `AttendanceButton.tsx`: Handles the UI state (Loading/Success/Error).
    *   `AttendanceStatus.tsx`: Shows real-time check-in status.
    *   `AttendanceHook.ts`: Custom hook to manage the API communication and local state.
*   **API Design:** A robust RESTful endpoint `/functions/submit-attendance` using Supabase Edge Functions for secure, server-side processing.

## 2. Data & AI Pipeline (Data Engineer/Data Analyst/AI Engineer)
*   **Data Lifecycle:**
    *   *Generation*: Triggered by the user's action in the browser.
    *   *Ingestion*: Securely sent to Supabase via Edge Function.
    *   *Storage*: Structured SQL table (`attendance_logs`) in Supabase.
    *   *Transformation*: Real-time aggregates updated via DB triggers or Edge Function logic.
*   **AI/ML/Heuristics:** Initial heuristic: Time-based windowing to prevent duplicate check-ins. Future AI: Anomaly detection on check-in patterns (e.g., suspicious IP/Time combinations).
*   **Pipeline:** Standard transactional pipeline; will later incorporate RAG to query historical attendance trends.

## 3. Security & Integrity (Cyber Security)
*   **Threat Model:**
    *   *Injection*: Mitigated by parameterized queries in Supabase.
    *   *Auth*: Enforced via Row Level Security (RLS) policies on the `attendance_logs` table.
    *   *Data Leakage*: API access limited to authenticated users; functions are private.
*   **CIA Triad:**
    *   *Confidentiality*: Encryption at rest (Supabase) and in transit (HTTPS).
    *   *Integrity*: RLS prevents unauthorized modification of records.
    *   *Availability*: Redundancy provided by Supabase managed infrastructure.
*   **Defense-in-Depth:** RLS + Input Validation on both client and server-side + Rate limiting on the Edge Function.

## 4. Implementation & Optimization
*   **Checklist:**
    1.  Validate/Update RLS policies (`003_rls_security.sql`).
    2.  Refactor `submit-attendance` function to include robust input validation.
    3.  Implement `AttendanceHook.ts` for efficient frontend state management.
    4.  Add unit/integration tests for the API endpoint.
*   **Optimizations:**
    *   *Python/Data*: Ensure indices are present on frequently queried columns in `attendance_logs` (e.g., `user_id`, `created_at`).
    *   *React*: Use `useMemo` or `memo` to prevent unnecessary re-renders of the attendance dashboard components.
*   **Structure Example:**
    `Client (React Hook) -> API (Edge Function) -> Database (PostgreSQL w/ RLS)`
