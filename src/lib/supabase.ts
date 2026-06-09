import { createClient } from '@supabase/supabase-js';

// Pull the values from your environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnostic logs to check inside your browser console
console.log("Checking client connection properties...");
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL ERROR: Supabase environment variables are completely missing!");
}

// Safely initialize the client instance
export const supabase = createClient(
  supabaseUrl || 'https://acuportal.vercel.app/', 
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZWZiaWFucGd2am16c2Rrd3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Nzk0NjcsImV4cCI6MjA5NjE1NTQ2N30.E_mxSnW-CaUfz9a7KkCjimN1LLCEuLWlHH-34956_YU'
);
