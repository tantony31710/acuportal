import React, { useEffect, useState } from 'react'
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
import './styles.css'

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111', color: '#fff', fontFamily: 'sans-serif' }}>
        <h3>Verifying Security Credentials...</h3>
      </div>
    )
  }

  if (!isTeacher) return <Navigate to="/check-in" replace />
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/flags" element={<Flags />} />
        <Route path="/roster" element={<Roster />} />
        <Route path="/admin" element={<Admin />} />
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
    </BrowserRouter>
  </React.StrictMode>
)
