import { createClient } from '@supabase/supabase-js';

// Always look for environment variables first, fall back to your exact project URL if missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://beefbianpgvjmzsdkwvd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZWZiaWFucGd2am16c2Rrd3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc5NzkxNzMsImV4cCI6MjAzMzU1NTE3M30.7uFk3H_h4vWqNfU9M6X0M4yV7R9bZ2p1_t8o6G3K6m8'; // Replace with your FULL actual Anon Key from Supabase settings if different

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage, // Keeps tabs completely isolated
    autoRefreshToken: true,
    persistSession: true
  }
});
