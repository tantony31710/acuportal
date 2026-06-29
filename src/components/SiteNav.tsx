import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useIsTeacher, revokeTeacher } from '@/lib/auth'

const links = [
  { to: '/', label: 'Home', icon: '🏠', exact: true },
  { to: '/teacher', label: 'Teacher', icon: '📊', teacherOnly: true },
  { to: '/check-in', label: 'Check-in', icon: '✅' },
  { to: '/sessions', label: 'Sessions', icon: '🗂' },
  { to: '/flags', label: 'Flags', icon: '🚩' },
  { to: '/roster', label: 'Roster', icon: '👥' },
  { to: '/admin', label: 'Admin', icon: '⚙️', teacherOnly: true },
]

export function SiteNav() {
  const teacher = useIsTeacher()
  const loc = useLocation()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-background font-bold text-lg shadow-[0_0_30px_-8px_oklch(0.74_0.14_175)]">
            A
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-foreground">Anti-Proxy Attendance</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">275 students · G1–G4</div>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-1 md:flex">
          {links
            .filter(l => !l.teacherOnly || teacher === true)
            .map(l => {
              const active = l.exact
                ? loc.pathname === l.to
                : loc.pathname.startsWith(l.to)

              return (
                <motion.div
                  key={l.to}
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Link
                    to={l.to}
                    className={`relative block rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="mr-1.5 opacity-80">{l.icon}</span>
                    {l.label}

                    {/* Animated underline indicator */}
                    {active && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                </motion.div>
              )
            })}

          {/* Auth button */}
          {teacher === true ? (
            <motion.button
              onClick={revokeTeacher}
              className="ml-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              Sign out
            </motion.button>
          ) : teacher === false ? (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Link
                to="/auth"
                className="ml-2 rounded-md border border-primary/40 px-3 py-2 text-xs text-primary hover:bg-primary/10 transition-colors"
              >
                Teacher login
              </Link>
            </motion.div>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
