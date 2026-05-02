import { createClient } from '@supabase/supabase-js';

/**
 * PRODUCTION CONNECTION CONFIG
 * Hardcoded to ensure zero-configuration deployment on Vercel.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://heecsmjhktcevmzzhrycy.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlZWNzamhrdGNldm16emhyeWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjQwMjgsImV4cCI6MjA5Mjk0MDAyOH0.VSVoKXKjUPQ4pN5BZLwHWc1bz49AorzUOg1-km1cv1Q";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

export default supabase;
