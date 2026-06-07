import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import '@/styles.css'
import { Home } from '@/pages/Home'
import { Auth } from '@/pages/Auth'
import { Teacher } from '@/pages/Teacher'
import { CheckIn } from '@/pages/CheckIn'
import { Sessions } from '@/pages/Sessions'
import { Flags } from '@/pages/Flags'
import { Roster } from '@/pages/Roster'
import { Admin } from '@/pages/Admin'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/teacher" element={<Teacher />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/flags" element={<Flags />} />
        <Route path="/roster" element={<Roster />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
