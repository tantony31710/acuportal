import React, { Component, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Home } from './pages/Home'
import Auth from './pages/Auth'
import Teacher from './pages/Teacher'
import CheckIn from './pages/CheckIn'
import { Sessions } from './pages/Sessions'
import { Flags } from './pages/Flags'
import { Roster } from './pages/Roster'
import { Admin } from './pages/Admin'
import { GlobalLayout } from './components/layout/GlobalLayout'
import './styles.css'

// ── Error boundary — catches render crashes and shows a message instead of blank ──
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', background: '#0d1218',
          color: '#fff', fontFamily: 'sans-serif', padding: '2rem', gap: '1rem',
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <h2 style={{ margin: 0, color: '#f87171' }}>Something went wrong</h2>
          <pre style={{
            background: '#1e293b', padding: '1rem', borderRadius: '8px',
            color: '#94a3b8', fontSize: '12px', maxWidth: '600px',
            overflowX: 'auto', whiteSpace: 'pre-wrap',
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#2dd4bf', color: '#0d1218', border: 'none',
              borderRadius: '8px', padding: '0.6rem 1.5rem',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Teacher route guard ───────────────────────────────────────────────────────
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

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', background: '#0d1218', color: '#2dd4bf',
        fontFamily: 'sans-serif', gap: '0.75rem',
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          border: '2px solid rgba(45,212,191,0.3)',
          borderTopColor: '#2dd4bf',
          animation: 'spin 0.8s linear infinite',
        }} />
        Verifying credentials…
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!isTeacher) return <Navigate to="/check-in" replace />
  return <>{children}</>
}

// ── App ───────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <GlobalLayout>
          <Routes>
            <Route path="/"         element={<Home />} />
            <Route path="/auth"     element={<Auth />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/flags"    element={<Flags />} />
            <Route path="/roster"   element={<Roster />} />
            <Route path="/admin"    element={<Admin />} />
            <Route
              path="/teacher"
              element={
                <TeacherRouteGuard>
                  <Teacher />
                </TeacherRouteGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </GlobalLayout>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
