import { createClient } from '@supabase/supabase-js'

// ── Environment variable validation ──────────────────────────────────────────
// Keys are loaded from .env.local (local dev) or your hosting provider's
// environment settings (Vercel / Netlify). NEVER use hardcoded fallbacks —
// they get bundled into the JS and become public.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in development so misconfiguration is caught immediately.
  // In production this path should never be reached if env vars are set correctly.
  throw new Error(
    '[AcuPortal] Missing Supabase environment variables.\n' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local (dev) ' +
    'or in your hosting provider\'s environment settings (production).\n' +
    'Never use the service_role key on the frontend — anon key only.'
  )
}

// ── Client ───────────────────────────────────────────────────────────────────
// Uses sessionStorage so the token is wiped when the browser tab closes.
// autoRefreshToken keeps the session alive during an active session.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
