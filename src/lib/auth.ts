import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/**
 * Returns the current user's teacher status:
 *   true  — authenticated and has role='teacher'
 *   false — authenticated but not a teacher, or not authenticated
 *   null  — loading (check not yet complete)
 */
export function useIsTeacher(): boolean | null {
  const [state, setState] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          if (!cancelled) setState(false)
          return
        }

        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!cancelled) setState(data?.role === 'teacher')
      } catch {
        if (!cancelled) setState(false)
      }
    }

    check()

    // Re-check on explicit auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)) {
        check()
      }
    })

    return () => {
      cancelled = true
      sub?.subscription.unsubscribe()
    }
  }, [])

  return state
}

export async function revokeTeacher() {
  await supabase.auth.signOut()
}
