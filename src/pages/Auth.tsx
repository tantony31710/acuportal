import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

// ─── Reduced-motion helper ────────────────────────────────────────────────────

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const noMotion = {
  initial:   false as const,
  animate:   false as const,
  exit:      false as const,
  transition: { duration: 0 },
}

// ─── Animation variants ───────────────────────────────────────────────────────

const bgVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 1.2, ease: 'easeOut' } },
}

const cardVariants = {
  initial:  { opacity: 0, y: 60 },
  animate:  {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 200, damping: 24, delay: 0.15 },
  },
  exit: { opacity: 0, y: -30, transition: { duration: 0.2 } },
}

const fieldVariants = {
  initial: { opacity: 0, y: 12 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.3 + i * 0.07, duration: 0.35, ease: 'easeOut' },
  }),
}

const msgVariants = {
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8,  transition: { duration: 0.18 } },
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <motion.span
      className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
      animate={prefersReduced ? {} : { rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
    />
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Auth() {
  const navigate  = useNavigate()
  const [tab, setTab]           = useState<'signin' | 'signup'>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Track bounding rect of active tab button for sliding underline
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const el = tabRefs.current[tab]
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [tab])

  // Auth redirect (unchanged logic)
  useEffect(() => {
    let cancelled = false
    async function check() {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', u.user.id)
        .maybeSingle()
      if (!cancelled) {
        if (data?.role === 'teacher') navigate('/teacher')
        else navigate('/check-in')
      }
    }
    check()
    const { data: sub } = supabase.auth.onAuthStateChange(() => check())
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [navigate])

  const signIn = async () => {
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setMsg({ type: 'error', text: error.message })
  }

  const signUp = async () => {
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/check-in`,
        data: { full_name: fullName },
      },
    })
    setLoading(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: 'Check your email to confirm your account.' })
  }

  const signInGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/check-in` },
    })
    if (error) setMsg({ type: 'error', text: error.message })
  }

  // Fields differ per tab — memoised list so stagger index is stable
  const fields = tab === 'signin'
    ? [
        { key: 'email',    label: 'Email',    type: 'email',    value: email,    onChange: setEmail },
        { key: 'password', label: 'Password', type: 'password', value: password, onChange: setPassword },
      ]
    : [
        { key: 'name',     label: 'Full name', type: 'text',     value: fullName, onChange: setFullName },
        { key: 'email',    label: 'Email',     type: 'email',    value: email,    onChange: setEmail },
        { key: 'password', label: 'Password',  type: 'password', value: password, onChange: setPassword },
      ]

  return (
    // ── Animated background ──
    <motion.div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0f2460 100%)',
      }}
      variants={prefersReduced ? undefined : bgVariants}
      initial="initial"
      animate="animate"
    >
      {/* Gold accent orbs (purely decorative) */}
      {!prefersReduced && (
        <>
          <motion.div
            className="pointer-events-none absolute top-[-10%] right-[-5%] h-72 w-72 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(202,163,71,0.12) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          />
          <motion.div
            className="pointer-events-none absolute bottom-[-5%] left-[-8%] h-96 w-96 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut', delay: 2 }}
          />
        </>
      )}

      {/* ── Login card ── */}
      <motion.div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-sm"
        variants={prefersReduced ? undefined : cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Gold top accent bar */}
        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        <Link to="/" className="text-sm text-slate-400 hover:text-slate-200 transition">← Home</Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-amber-500 font-bold text-lg text-slate-900 shadow-lg shadow-amber-500/30">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">University Attendance</h1>
            <p className="text-[11px] uppercase tracking-widest text-amber-400/70">AcuPortal</p>
          </div>
        </div>

        {/* ── Tab switcher ── */}
        <div className="relative mt-6 flex rounded-lg border border-white/10 bg-slate-800/50 overflow-hidden">
          {/* Sliding indicator */}
          {!prefersReduced && (
            <motion.div
              className="absolute inset-y-0 rounded-md bg-amber-500/20 border border-amber-500/40"
              animate={{ left: indicatorStyle.left, width: indicatorStyle.width }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          {(['signin', 'signup'] as const).map(t => (
            <button
              key={t}
              ref={el => { tabRefs.current[t] = el }}
              onClick={() => { setTab(t); setMsg(null) }}
              className={`relative flex-1 py-2.5 text-sm font-medium transition z-10 ${
                tab === t
                  ? 'text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {/* ── Staggered input fields ── */}
          <AnimatePresence mode="wait">
            <motion.div key={tab} className="space-y-4" initial="initial" animate="animate">
              {fields.map((f, i) => (
                <motion.div
                  key={f.key}
                  custom={i}
                  variants={prefersReduced ? undefined : fieldVariants}
                  initial="initial"
                  animate="animate"
                >
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={e => f.onChange(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none placeholder-slate-500 transition focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30"
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* ── Message (error / success) ── */}
          <AnimatePresence>
            {msg && (
              <motion.div
                key={msg.text}
                variants={prefersReduced ? undefined : msgVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={`rounded-lg px-3 py-2.5 text-sm ${
                  msg.type === 'success'
                    ? 'border border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                    : 'border border-red-500/30 bg-red-950/40 text-red-300'
                }`}
              >
                {msg.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Submit button ── */}
          <motion.button
            onClick={tab === 'signin' ? signIn : signUp}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            whileHover={prefersReduced ? {} : { scale: 1.015 }}
            whileTap={prefersReduced ? {} : { scale: 0.98 }}
          >
            {loading ? (
              <>
                <Spinner />
                <span>Please wait…</span>
              </>
            ) : tab === 'signin' ? (
              'Sign in'
            ) : (
              'Create account'
            )}
          </motion.button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-2 text-slate-500">or</span>
            </div>
          </div>

          <motion.button
            onClick={signInGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-800 py-2.5 text-sm text-slate-200 transition hover:bg-slate-700"
            whileHover={prefersReduced ? {} : { scale: 1.01 }}
            whileTap={prefersReduced ? {} : { scale: 0.99 }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </motion.button>

          <p className="text-center text-xs text-slate-500">
            New accounts default to the student role. Teachers must be promoted in the database.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
