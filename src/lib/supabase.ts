import { createClient } from '@supabase/supabase-js';

// Pull the values securely from your environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize the client cleanly with explicit fallback strings and correct options positioning
export const supabase = createClient(
  supabaseUrl || 'https://beefbianpgvjmzsdkwvd.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZWZiaWFucGd2am16c2Rrd3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc5Nzg0MDAsImV4cCI6MjAzMzU1NDQwMH0.your_full_key_here',
  {
    auth: {
      storage: window.sessionStorage, // Wipes the user's session cleanly when the browser tab closes!
      autoRefreshToken: true,
      persistSession: true
    }
  }
);
