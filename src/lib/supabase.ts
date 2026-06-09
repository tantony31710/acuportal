import { createClient } from '@supabase/supabase-js';

// Pull the values from your environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Safely initialize the client instance with automatic tab-close eviction
export const supabase = createClient(
  supabaseUrl || 'https://beefbianpgvjmzsdkwvd.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZWZiaWFucGd2am16c2Rrd3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Nzk0NjcsImV4cCI6MjA5NjE1NTQ2N30.E_mxSnW-CaUfz9a7KkCjimN1LLCEuLWlHH-34956_YU',
  {
    auth: {
      storage: window.sessionStorage, // Wipes the session automatically when the tab is closed!
      autoRefreshToken: true,
      persistSession: true
    }
  }
);
