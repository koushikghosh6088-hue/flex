import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getCurrentUser, onAuthStateChange } from '../lib/auth';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'store_manager';
  store_id?: string;
  pin?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<{ error: string | null }>;
  mockLogin: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Safety timeout: if auth takes > 5s, stop loading and show login
      const timeout = setTimeout(() => {
        if (loading) {
          console.warn('Auth initialization timed out');
          setLoading(false);
        }
      }, 5000);

      try {
        // Check for persisted mock session first
        const mockProfileStr = localStorage.getItem('mockProfile');
        if (mockProfileStr) {
          const p = JSON.parse(mockProfileStr) as UserProfile;
          setProfile(p);
          setUser({ 
            id: p.id, 
            email: p.email,
            app_metadata: {},
            user_metadata: { name: p.name, role: p.role },
            aud: 'authenticated',
            created_at: new Date().toISOString()
          } as User);
          clearTimeout(timeout);
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileData) {
            setProfile(profileData);
          }
        }
      } catch (e) {
        console.error('Auth initialization error', e);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = onAuthStateChange(async (newProfile) => {
      // Only react to auth state changes if we are not using a mock session
      if (!localStorage.getItem('mockProfile')) {
        if (newProfile) {
          setProfile(newProfile as UserProfile);
          setUser({ 
            id: newProfile.id, 
            email: newProfile.email,
            app_metadata: {},
            user_metadata: { name: newProfile.name, role: newProfile.role },
            aud: 'authenticated',
            created_at: new Date().toISOString()
          } as User);
        } else {
          setProfile(null);
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const mockLogin = (p: UserProfile) => {
    localStorage.setItem('mockProfile', JSON.stringify(p));
    setProfile(p);
    setUser({ 
            id: p.id, 
            email: p.email,
            app_metadata: {},
            user_metadata: { name: p.name, role: p.role },
            aud: 'authenticated',
            created_at: new Date().toISOString()
          } as User);
    setLoading(false);
  };

  const signOut = async () => {
    localStorage.removeItem('mockProfile');
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, mockLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
