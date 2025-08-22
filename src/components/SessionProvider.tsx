'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // Check if supabase client is properly initialized
        if (!supabase || !supabase.auth) {
          console.warn('Supabase client not properly initialized, skipping session check');
          setLoading(false);
          return;
        }

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
    if (!supabase || !supabase.auth) {
      console.warn('Supabase client not properly initialized, skipping auth state change listener');
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
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
    if (!supabase || !supabase.auth) {
      throw new Error('Supabase client not properly initialized');
    }

    // Get the correct redirect URL based on environment
    let redirectUrl: string;
    
    if (typeof window !== 'undefined') {
      // Client-side: use current origin
      redirectUrl = `${window.location.origin}/auth/callback`;
    } else {
      // Server-side: use environment variable or fallback
      redirectUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/auth/callback`
        : '/auth/callback';
    }

    console.log('OAuth redirect URL:', redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });
    
    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    if (!supabase || !supabase.auth) {
      throw new Error('Supabase client not properly initialized');
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    // Redirect to home page after sign out
    router.push('/');
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