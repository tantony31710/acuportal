import { Link, useLocation } from 'react-router-dom'
import { useIsTeacher, revokeTeacher } from '@/lib/auth'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const links = [
  { to: '/',        label: 'Home',     icon: '🏠', exact: true },
  { to: '/teacher', label: 'Teacher',  icon: '📊', teacherOnly: true },
  { to: '/check-in',label: 'Check-in', icon: '✅' },
  { to: '/sessions',label: 'Sessions', icon: '🗂' },
  { to: '/flags',   label: 'Flags',    icon: '🚩' },
  { to: '/roster',  label: 'Roster',   icon: '👥' },
  { to: '/admin',   label: 'Admin',    icon: '⚙️', teacherOnly: true },
]

export function SiteNav() {
  const teacher = useIsTeacher()
  const loc = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleLinks = links.filter(l => !l.teacherOnly || teacher === true)

  const isActive = (l: typeof links[number]) =>
    l.exact ? loc.pathname === l.to : loc.pathname.startsWith(l.to)

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-white/[0.06]"
        style={{ background: 'rgba(13,18,28,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-3">
            <motion.div
              className="grid h-9 w-9 place-items-center rounded-lg font-bold text-lg text-slate-950"
              style={{ background: 'oklch(0.74 0.14 175)' }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              A
            </motion.div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-white">Anti-Proxy Attendance</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/30">275 students · G1–G4</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {visibleLinks.map(l => {
              const active = isActive(l)
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`nav-link ${active ? 'active' : ''}`}
                >
                  <span className="mr-1 opacity-75 text-sm">{l.icon}</span>
                  {l.label}
                  {active && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className="absolute inset-0 rounded-lg bg-white/[0.08]"
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                </Link>
              )
            })}

            {/* Auth button */}
            {teacher === true ? (
              <motion.button
                onClick={revokeTeacher}
                className="ml-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/40 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                whileTap={{ scale: 0.96 }}
              >
                Sign out
              </motion.button>
            ) : teacher === false ? (
              <Link
                to="/auth"
                className="ml-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-semibold text-teal-400 transition-all hover:bg-teal-500/20"
              >
                Teacher login
              </Link>
            ) : null}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] md:hidden"
            aria-label="Toggle menu"
          >
            <motion.span
              className="h-0.5 w-5 rounded-full bg-white/70"
              animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
            />
            <motion.span
              className="h-0.5 w-5 rounded-full bg-white/70"
              animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
            />
            <motion.span
              className="h-0.5 w-5 rounded-full bg-white/70"
              animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
            />
          </button>
        </div>
      </header>

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="sticky top-[57px] z-40 border-b border-white/[0.06] px-5 pb-4 pt-2 md:hidden"
            style={{ background: 'rgba(13,18,28,0.95)', backdropFilter: 'blur(20px)' }}
          >
            <nav className="flex flex-col gap-1">
              {visibleLinks.map(l => {
                const active = isActive(l)
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      active
                        ? 'bg-white/[0.08] text-white'
                        : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                    }`}
                  >
                    <span className="text-base">{l.icon}</span>
                    {l.label}
                    {active && (
                      <span
                        className="ml-auto h-1.5 w-1.5 rounded-full"
                        style={{ background: 'oklch(0.74 0.14 175)' }}
                      />
                    )}
                  </Link>
                )
              })}

              <div className="mt-2 border-t border-white/[0.06] pt-2">
                {teacher === true ? (
                  <button
                    onClick={() => { revokeTeacher(); setMobileOpen(false) }}
                    className="w-full rounded-xl border border-red-500/20 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    Sign out
                  </button>
                ) : teacher === false ? (
                  <Link
                    to="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-2.5 text-center text-sm font-semibold text-teal-400"
                  >
                    Teacher login
                  </Link>
                ) : null}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
