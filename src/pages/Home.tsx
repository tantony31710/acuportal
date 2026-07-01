import { Link, useNavigate } from 'react-router-dom'
import { useIsTeacher } from '@/lib/auth'
import { useEffect, useRef, useState, MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { AnimatedBackground } from '../components/AnimatedBackground'

// ── 3D tilt card ─────────────────────────────────────────────────────────────
function TiltCard({
  children,
  className = '',
  depth = 12,
}: {
  children: React.ReactNode
  className?: string
  depth?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const rx = ((y - cy) / cy) * -depth
    const ry = ((x - cx) / cx) * depth
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`
  }

  const handleMouseLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ transition: 'transform 0.12s ease-out', transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      {children}
    </div>
  )
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, label }: { to: number; label: string }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = Math.ceil(to / 40)
    const timer = setInterval(() => {
      start += step
      if (start >= to) { setCount(to); clearInterval(timer) }
      else setCount(start)
    }, 30)
    return () => clearInterval(timer)
  }, [to])
  return (
    <div className="text-center">
      <div className="text-3xl font-extrabold gradient-text-teal tabular-nums">{count.toLocaleString()}</div>
      <div className="mt-0.5 text-xs text-white/40 uppercase tracking-wider">{label}</div>
    </div>
  )
}

// ── Features data ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🔐',
    title: 'One-Time PINs',
    desc: 'Cryptographically random 6-digit codes that expire after each session window.',
    color: 'from-teal-500/10 to-teal-500/5',
    border: 'border-teal-500/20',
    glow: 'hover:shadow-glow-teal',
  },
  {
    icon: '📱',
    title: 'Device Fingerprints',
    desc: 'Detect shared devices and proxy attendance attempts via hardware signatures.',
    color: 'from-blue-500/10 to-blue-500/5',
    border: 'border-blue-500/20',
    glow: 'hover:shadow-glow-blue',
  },
  {
    icon: '📍',
    title: 'Location Guard',
    desc: 'GPS validation flags students checking in from outside the campus perimeter.',
    color: 'from-amber-500/10 to-amber-500/5',
    border: 'border-amber-500/20',
    glow: '',
  },
  {
    icon: '📊',
    title: 'Live Audit',
    desc: 'Real-time dashboard shows present, late, flagged, and absent counts instantly.',
    color: 'from-emerald-500/10 to-emerald-500/5',
    border: 'border-emerald-500/20',
    glow: 'hover:shadow-glow-emerald',
  },
  {
    icon: '📥',
    title: 'CSV Export',
    desc: 'Download per-session or semester-wide attendance sheets in one click.',
    color: 'from-purple-500/10 to-purple-500/5',
    border: 'border-purple-500/20',
    glow: '',
  },
  {
    icon: '🔄',
    title: 'Real-time Sync',
    desc: 'Supabase Realtime pushes every check-in event live — no page refresh needed.',
    color: 'from-teal-500/10 to-teal-500/5',
    border: 'border-teal-500/20',
    glow: 'hover:shadow-glow-teal',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
export function Home() {
  const teacher = useIsTeacher()
  const navigate = useNavigate()

  useEffect(() => {
    if (teacher === true) navigate('/teacher')
  }, [teacher, navigate])

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <AnimatedBackground orbCount={5} particleCount={50} />

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <motion.div
          className="mb-20 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {/* Badge */}
          <motion.div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-400"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping-slow" />
            Anti-Proxy Attendance System
          </motion.div>

          <h1 className="mb-5 font-display text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Smart Attendance
            <br />
            <span className="gradient-text-teal text-glow-teal">Without Proxies</span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/50">
            PIN-gated sessions with device fingerprinting, GPS validation,
            and real-time audit logs — built for 275 students across G1–G4.
          </p>

          {/* CTA buttons */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Link
              to="/check-in"
              className="btn-glow-teal text-base"
            >
              🎓 Student Check-In
            </Link>
            <Link
              to="/auth"
              className="btn-glow-blue text-base"
            >
              👨‍🏫 Teacher Dashboard
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="mt-14 inline-flex items-center gap-10 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-10 py-5 backdrop-blur-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <Counter to={275} label="Students" />
            <div className="h-10 w-px bg-white/[0.08]" />
            <Counter to={4} label="Groups" />
            <div className="h-10 w-px bg-white/[0.08]" />
            <Counter to={100} label="% Accuracy" />
            <div className="h-10 w-px bg-white/[0.08]" />
            <Counter to={0} label="Proxies Allowed" />
          </motion.div>
        </motion.div>

        {/* ── Main action cards ─────────────────────────────────────── */}
        <motion.div
          className="mb-20 grid gap-6 sm:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Student card */}
          <motion.div variants={itemVariants}>
            <TiltCard className="group h-full">
              <Link
                to="/check-in"
                className="block h-full rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/60 to-slate-950/60 p-8 backdrop-blur-xl transition-all duration-300 hover:border-emerald-400/40 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_30px_oklch(0.72_0.18_150_/_0.15)]"
              >
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 text-3xl border border-emerald-500/20">
                  🎓
                </div>
                <h2 className="text-2xl font-bold text-white">Student Check-In</h2>
                <p className="mt-2 text-emerald-100/60 leading-relaxed">
                  Enter your Student ID and the 6-digit PIN your instructor provides to mark attendance.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-glow-emerald transition-all group-hover:bg-emerald-500">
                  Check In
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="mt-4 flex gap-2">
                  {['GPS Check', 'Anti-Proxy', 'Instant'].map(tag => (
                    <span key={tag} className="rounded-full border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400/70 uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            </TiltCard>
          </motion.div>

          {/* Teacher card */}
          <motion.div variants={itemVariants}>
            <TiltCard className="group h-full">
              <Link
                to="/auth"
                className="block h-full rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/60 to-slate-950/60 p-8 backdrop-blur-xl transition-all duration-300 hover:border-blue-400/40 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_30px_oklch(0.65_0.2_240_/_0.15)]"
              >
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 text-3xl border border-blue-500/20">
                  👨‍🏫
                </div>
                <h2 className="text-2xl font-bold text-white">Teacher Dashboard</h2>
                <p className="mt-2 text-blue-100/60 leading-relaxed">
                  Start sessions, manage PINs, and monitor real-time attendance with live analytics.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition-all group-hover:bg-blue-500 hover:shadow-glow-blue">
                  Sign In
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="mt-4 flex gap-2">
                  {['Live Stats', 'QR Code', 'CSV Export'].map(tag => (
                    <span key={tag} className="rounded-full border border-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400/70 uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            </TiltCard>
          </motion.div>
        </motion.div>

        {/* ── Feature grid ──────────────────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.h2
            className="mb-8 text-center text-2xl font-bold text-white/80"
            variants={itemVariants}
          >
            Everything you need to prevent proxy attendance
          </motion.h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={itemVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className={`h-full rounded-xl border bg-gradient-to-br ${f.color} ${f.border} p-6 backdrop-blur-sm transition-all duration-300 ${f.glow}`}>
                  <div className="mb-3 text-2xl">{f.icon}</div>
                  <h3 className="mb-2 font-semibold text-white">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-white/45">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Footer note ───────────────────────────────────────────── */}
        <motion.p
          className="mt-16 text-center text-xs text-white/20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          ACU Portal · 275 students · G1–G4 · Real-time anti-proxy attendance
        </motion.p>
      </div>
    </div>
  )
}
