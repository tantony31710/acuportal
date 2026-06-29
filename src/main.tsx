import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from './lib/supabase'
import { Home } from './pages/Home'
import Auth from './pages/Auth'
import Teacher from './pages/Teacher'
import CheckIn from './pages/CheckIn'
import { Sessions } from './pages/Sessions'
import { Flags } from './pages/Flags'
import { Roster } from './pages/Roster'
import { Admin } from './pages/Admin'
import './styles.css'

// ─── Page transition wrapper ──────────────────────────────────────────────────

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  )
}

// ─── Animated loading spinner ─────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0b1120',
        gap: '1.25rem',
      }}
    >
      {/* Outer ring */}
      <motion.span
        style={{
          display: 'block',
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: '3px solid rgba(251,191,36,0.2)',
          borderTopColor: '#fbbf24',
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
      />
      <motion.p
        style={{ color: '#94a3b8', fontFamily: 'sans-serif', fontSize: 13, letterSpacing: '0.08em' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Verifying credentials…
      </motion.p>
    </div>
  )
}

// ─── Teacher route guard ──────────────────────────────────────────────────────

function TeacherRouteGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [isTeacher, setIsTeacher] = useState(false)

  useEffect(() => {
    async function checkTeacherAccess() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setIsTeacher(false); return }
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()
        setIsTeacher(!error && data?.role === 'teacher')
      } catch {
        setIsTeacher(false)
      } finally {
        setLoading(false)
      }
    }
    checkTeacherAccess()
  }, [])

  if (loading) return <LoadingSpinner />
  if (!isTeacher) return <Navigate to="/check-in" replace />
  return <>{children}</>
}

// ─── Animated routes (needs location for AnimatePresence key) ─────────────────

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/auth" element={<PageWrapper><Auth /></PageWrapper>} />
        <Route path="/check-in" element={<PageWrapper><CheckIn /></PageWrapper>} />
        <Route path="/sessions" element={<PageWrapper><Sessions /></PageWrapper>} />
        <Route path="/flags" element={<PageWrapper><Flags /></PageWrapper>} />
        <Route path="/roster" element={<PageWrapper><Roster /></PageWrapper>} />
        <Route path="/admin" element={<PageWrapper><Admin /></PageWrapper>} />
        <Route
          path="/teacher"
          element={
            <TeacherRouteGuard>
              <PageWrapper><Teacher /></PageWrapper>
            </TeacherRouteGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  </React.StrictMode>
)
