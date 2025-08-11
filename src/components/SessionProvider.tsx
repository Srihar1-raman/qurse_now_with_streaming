'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthUser } from '@/lib/supabase';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (provider: 'github' | 'google' | 'twitter') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get user data from our users table
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: userData?.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            avatar_url: userData?.avatar_url || session.user.user_metadata?.avatar_url,
            preferences: userData?.preferences,
          });
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            // Get user data from our users table
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            // If user doesn't exist in our table, check if there's an existing user with the same email
            if (!userData && session.user.email) {
              const { data: existingUserByEmail } = await supabase
                .from('users')
                .select('*')
                .eq('email', session.user.email)
                .single();

              if (existingUserByEmail) {
                // This is an account linking scenario - the user should be redirected to the link-accounts page
                // The auth callback should handle this, but we can also handle it here as a fallback
                console.log('Account linking detected for email:', session.user.email);
              }
            }

            setUser({
              id: session.user.id,
              email: session.user.email!,
              name: userData?.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name,
              avatar_url: userData?.avatar_url || session.user.user_metadata?.avatar_url,
              preferences: userData?.preferences,
            });
          } catch (error) {
            console.error('Error handling SIGNED_IN event:', error);
            // Still set the user even if there's an error with the database lookup
            setUser({
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
              avatar_url: session.user.user_metadata?.avatar_url,
              preferences: null,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (provider: 'github' | 'google' | 'twitter') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    // Redirect to home page after sign out
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 