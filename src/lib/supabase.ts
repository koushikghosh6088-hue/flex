import { createClient } from '@supabase/supabase-js';

// Universal environment variable loader for maximum hosting compatibility
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '');

const supabaseKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '');

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error('CRITICAL: Supabase URL is missing or invalid. Check Vercel Environment Variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

export default supabase;
