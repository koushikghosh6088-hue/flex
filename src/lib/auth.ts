import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'store_manager';
  store_id?: string;
  pin?: string;
}

export interface AuthResponse {
  user: User | null;
  error: string | null;
}

// Email/Password Authentication
export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { user: null, error: authError.message };
    }

    // Get user profile data
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      return { user: null, error: 'User profile not found' };
    }

    return { user: profileData as User, error: null };
  } catch (error) {
    return { user: null, error: 'Authentication failed' };
  }
}

// PIN Authentication (6-digit)
export async function signInWithPin(pin: string, storeId?: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, storeId }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { user: null, error: data.error || 'Invalid PIN' };
    }

    const data = await response.json();
    return { user: data.user as User, error: null };
  } catch (error) {
    return { user: null, error: 'PIN authentication failed' };
  }
}

// Sign up new user
export async function signUp(email: string, password: string, name: string, role: 'owner' | 'store_manager', storeId?: string, pin?: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role, store_id: storeId, pin }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { user: null, error: data.error || 'Sign up failed' };
    }

    // After creating the user on the server, sign them in with Supabase client
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return { user: null, error: authError?.message || 'Failed to sign in after sign up' };
    }

    const { data: profileData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    return { user: profileData as User, error: null };
  } catch (error) {
    return { user: null, error: 'Sign up failed' };
  }
}

// Sign out
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  } catch (error) {
    return { error: 'Sign out failed' };
  }
}

// Get current user
export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { user: null, error: 'Not authenticated' };
    }

    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      return { user: null, error: 'User profile not found' };
    }

    return { user: profileData as User, error: null };
  } catch (error) {
    return { user: null, error: 'Failed to get current user' };
  }
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      callback(profileData as User || null);
    } else {
      callback(null);
    }
  });
}
