import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useIsTeacher(): boolean | null {
  const [state, setState] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const { data: u } = await supabase.auth.getUser()
        if (!u.user) { if (!cancelled) setState(false); return }
        const { data } = await supabase.from('user_roles').select('role').eq('user_id', u.user.id).single()
        if (!cancelled) setState(data?.role === 'teacher')
      } catch { if (!cancelled) setState(false) }
    }
    check()
    const { data: sub } = supabase.auth.onAuthStateChange(e => {
      if (['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(e)) check()
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [])
  return state
}

export async function revokeTeacher() { await supabase.auth.signOut() }
