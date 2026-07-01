import { createClient } from '@supabase/supabase-js'

// Credentials MUST come from environment variables — no hardcoded fallbacks.
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.
//
// ⚠️  SECURITY: Only use the ANON (public) key here.
//     The service_role key bypasses Row Level Security and must NEVER be used
//     in frontend code. If you see "service_role" in your JWT, rotate the key
//     in Supabase Dashboard → Project Settings → API.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

// Support old VITE_SUPABASE_PUBLISHABLE_KEY name for backward compatibility
// Prefer VITE_SUPABASE_ANON_KEY going forward
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
) as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env.local and fill in the values from your Supabase dashboard.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // sessionStorage: token is wiped when the tab closes (prevents session fixation)
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
  },
})
