import { useEffect, useState } from "react";

/**
 * Local teacher-device gate.
 *
 * Anyone who knows the passcode can "claim" their device as the teacher
 * device — a teacher token is then written to localStorage and that device
 * can start sessions and upload roster overrides. Everyone else (every
 * student that just opens the URL) is treated as a student and only gets
 * the check-in form.
 *
 * NOTE: change TEACHER_PASSCODE below before publishing. This is intentional
 * shared-secret auth, not a server-enforced role — there is no backend.
 */
export const TEACHER_PASSCODE = "teacher2026";

const TOKEN_KEY = "ap_teacher_token_v1";
const TEACHER_TOKEN = "TEACHER_OK";

export function isTeacher(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(TOKEN_KEY) === TEACHER_TOKEN;
  } catch {
    return false;
  }
}

export function claimTeacher(passcode: string): boolean {
  if (passcode.trim() !== TEACHER_PASSCODE) return false;
  localStorage.setItem(TOKEN_KEY, TEACHER_TOKEN);
  window.dispatchEvent(new Event("ap:auth"));
  return true;
}

export function revokeTeacher() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("ap:auth"));
}

/**
 * Hook returns `null` on the server / before hydration (so SSR markup
 * matches), then `true`/`false` once mounted.
 */
export function useIsTeacher(): boolean | null {
  const [state, setState] = useState<boolean | null>(null);
  useEffect(() => {
    const sync = () => setState(isTeacher());
    sync();
    window.addEventListener("ap:auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ap:auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}