import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

export interface AuthState {
  isTeacher: boolean | null;
  isLoading: boolean;
  error: Error | null;
}

export function useIsTeacher(): AuthState {
  const [state, setState] = useState<AuthState>({
    isTeacher: null,
    isLoading: true,
    error: null,
  });

  const check = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr) throw userErr;
      if (!user) {
        setState({ isTeacher: false, isLoading: false, error: null });
        return;
      }
      
      const { data, error: roleErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (roleErr) throw roleErr;
      
      setState({ 
        isTeacher: data?.role === 'teacher', 
        isLoading: false, 
        error: null 
      });
    } catch (e) { 
      setState({ isTeacher: false, isLoading: false, error: e as Error });
    }
  }, []);

  useEffect(() => {
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)) {
        check();
      }
    });

    return () => {
      subscription.unsubscribe();
    }
  }, [check]);

  return state;
}

export async function revokeTeacher() { await supabase.auth.signOut() }
