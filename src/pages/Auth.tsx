import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import DOMPurify from 'dompurify'
import { supabase } from '../lib/supabase'
import { AnimatedBackground } from '../components/AnimatedBackground'

// ── Simple client-side rate limiter ──────────────────────────────────────────
const RATE_LIMIT = { attempts: 5, windowMs: 60_000 }
const rateLimitStore: number[] = []

function checkRateLimit(): boolean {
  const now = Date.now()
  // Remove attempts older than window
  while (rateLimitStore.length && rateLimitStore[0] < now - RATE_LIMIT.windowMs) {
    rateLimitStore.shift()
  }
  if (rateLimitStore.length >= RATE_LIMIT.attempts) return false
  rateLimitStore.push(now)
  return true
}

// ── Input field component ─────────────────────────────────────────────────────
function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  const [focused, setFocused] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wider text-white/40">
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && showPw ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="input-glow pr-10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
        {/* Focus glow line */}
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] rounded-full"
          style={{ background: 'oklch(0.74 0.14 175)' }}
          initial={{ width: '0%' }}
          animate={{ width: focused ? '100%' : '0%' }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Auth() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)

  // Redirect if already signed in
  useEffect(() => {
    let cancelled = false
    async function check() {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', u.user.id).maybeSingle()
      if (!cancelled) {
        navigate(data?.role === 'teacher' ? '/teacher' : '/check-in')
      }
    }
    check()
    const { data: sub } = supabase.auth.onAuthStateChange(() => check())
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [navigate])

  const sanitize = (val: string) =>
    DOMPurify.sanitize(val.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })

  const signIn = async () => {
    if (!checkRateLimit()) {
      setMsg({ type: 'error', text: 'Too many attempts. Please wait 60 seconds.' })
      return
    }
    setLoading(true); setMsg(null)
    const cleanEmail = sanitize(email)
    if (!cleanEmail || !password) {
      setMsg({ type: 'error', text: 'Email and password are required.' })
      setLoading(false); return
    }
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    setLoading(false)
    if (error) setMsg({ type: 'error', text: error.message })
  }

  const signUp = async () => {
    if (!checkRateLimit()) {
      setMsg({ type: 'error', text: 'Too many attempts. Please wait 60 seconds.' })
      return
    }
    setLoading(true); setMsg(null)
    const cleanEmail = sanitize(email)
    const cleanName = sanitize(fullName)
    if (!cleanEmail || !password || !cleanName) {
      setMsg({ type: 'error', text: 'All fields are required.' })
      setLoading(false); return
    }
    if (password.length < 8) {
      setMsg({ type: 'error', text: 'Password must be at least 8 characters.' })
      setLoading(false); return
    }
    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/check-in`,
        data: { full_name: cleanName },
      },
    })
    setLoading(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: '✓ Check your email to confirm your account.' })
  }

  const signInGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/check-in` },
    })
    if (error) setMsg({ type: 'error', text: error.message })
  }

  const msgStyle = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    error: 'bg-red-500/10 text-red-400 border-red-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      <AnimatedBackground orbCount={4} particleCount={35} />

      <div className="relative z-10 w-full max-w-md">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/80">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </motion.div>

        {/* Card */}
        <motion.div
          className="card-glass p-8"
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Logo mark */}
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/15 text-xl border border-teal-500/20">
              🎓
            </div>
            <div>
              <div className="text-sm font-semibold text-white">University Attendance</div>
              <div className="text-xs text-white/30">Anti-Proxy System</div>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="mb-6 flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
            {(['signin', 'signup'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setMsg(null) }}
                className="relative flex-1 rounded-lg py-2 text-sm font-medium transition-colors duration-200"
              >
                {tab === t && (
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-white/[0.08]"
                    layoutId="tab-indicator"
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  />
                )}
                <span className={`relative ${tab === t ? 'text-white' : 'text-white/40'}`}>
                  {t === 'signin' ? 'Sign in' : 'Sign up'}
                </span>
              </button>
            ))}
          </div>

          {/* Fields */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {tab === 'signup' && (
                <Field
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              )}
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder={tab === 'signup' ? 'Min. 8 characters' : '••••••••'}
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              />

              {/* Message */}
              <AnimatePresence>
                {msg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`overflow-hidden rounded-xl border px-4 py-3 text-sm ${msgStyle[msg.type]}`}
                  >
                    {msg.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                onClick={tab === 'signin' ? signIn : signUp}
                disabled={loading}
                className="btn-glow-teal w-full text-slate-950 disabled:opacity-50"
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/40 border-t-slate-950" />
                    {tab === 'signin' ? 'Signing in…' : 'Creating account…'}
                  </span>
                ) : tab === 'signin' ? 'Sign in' : 'Create account'}
              </motion.button>

              {/* Divider */}
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/[0.07]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 text-white/25" style={{ background: 'oklch(0.21 0.03 200)' }}>or</span>
                </div>
              </div>

              {/* Google SSO */}
              <button
                onClick={signInGoogle}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-sm text-white/70 transition-all hover:bg-white/[0.07] hover:text-white"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <p className="text-center text-xs text-white/25">
                New accounts default to the student role. Teachers must be promoted by an admin.
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
