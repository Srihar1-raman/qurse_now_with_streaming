import { supabase } from './supabase';
import { AuthUser, AuthSession } from './supabase';

// Auth utilities for Supabase
export const auth = {
  // Sign in with OAuth provider
  signIn: async (provider: 'github' | 'google' | 'twitter') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return session;
  },

  // Get current user
  getUser: async (): Promise<AuthUser | null> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    
    if (!user) {
      return null;
    }

    // Get additional user data from our users table
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email!,
      name: userData?.name || user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: userData?.avatar_url || user.user_metadata?.avatar_url,
      preferences: userData?.preferences,
    };
  },

  // Create or update user profile in our users table
  createUserProfile: async (user: AuthUser) => {
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        preferences: user.preferences || {
          theme: 'auto',
          language: 'en',
          auto_save: true,
          default_model: 'Llama 3.1 70B (Groq)'
        },
      });

    if (error) {
      throw error;
    }
  },

  // Update user preferences
  updatePreferences: async (userId: string, preferences: any) => {
    const { error } = await supabase
      .from('users')
      .update({ preferences })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const user = await auth.getUser();
    return !!user;
  } catch {
    return false;
  }
};

// Helper function to get user ID
export const getUserId = async (): Promise<string | null> => {
  try {
    const user = await auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}; 