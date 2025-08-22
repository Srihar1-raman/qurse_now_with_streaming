import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Lazy client creation - only create when actually needed
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

// Client-side Supabase client
export const supabase = (() => {
  if (typeof window === 'undefined') {
    // Server-side or build time - return a dummy client
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOAuth: async () => ({ data: { url: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    } as any;
  }

  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not found. Client will not be created.');
      return null;
    }
    
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

    // Keep-alive mechanism for long-running connections
    setInterval(async () => {
      try {
        await supabaseClient!.from('conversations').select('id').limit(1);
      } catch (error) {
        console.warn('Supabase keep-alive ping failed:', error);
      }
    }, 4 * 60 * 1000); // 4 minutes
  }

  return supabaseClient || {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: async () => ({ data: { url: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  } as any;
})();

// Server-side Supabase client (for API routes)
export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string // Supabase Auth user ID
          email: string
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          preferences: UserPreferences | null
        }
        Insert: {
          id: string // Supabase Auth user ID
          email: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          preferences?: UserPreferences | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          preferences?: UserPreferences | null
        }
      }
      conversations: {
        Row: {
          id: string // UUID
          user_id: string // Supabase Auth user ID
          title: string
          model: string
          created_at: string
          updated_at: string
          is_archived: boolean
          parent_conversation_id: string | null
          branch_from_message_id: string | null
          branch_order: number
        }
        Insert: {
          id?: string
          user_id: string // Supabase Auth user ID
          title: string
          model: string
          created_at?: string
          updated_at?: string
          is_archived?: boolean
          parent_conversation_id?: string | null
          branch_from_message_id?: string | null
          branch_order?: number
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          model?: string
          created_at?: string
          updated_at?: string
          is_archived?: boolean
          parent_conversation_id?: string | null
          branch_from_message_id?: string | null
          branch_order?: number
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          content: string
          role: 'user' | 'assistant' | 'system'
          created_at: string
          metadata: MessageMetadata | null
        }
        Insert: {
          id?: string
          conversation_id: string
          content: string
          role: 'user' | 'assistant' | 'system'
          created_at?: string
          metadata?: MessageMetadata | null
        }
        Update: {
          id?: string
          conversation_id?: string
          content?: string
          role?: 'user' | 'assistant' | 'system'
          created_at?: string
          metadata?: MessageMetadata | null
        }
      }
      files: {
        Row: {
          id: string // UUID
          user_id: string // Supabase Auth user ID
          conversation_id: string | null // UUID
          filename: string
          file_path: string
          file_size: number
          mime_type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string // Supabase Auth user ID
          conversation_id?: string | null
          filename: string
          file_path: string
          file_size: number
          mime_type: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string | null
          filename?: string
          file_path?: string
          file_size?: number
          mime_type?: string
          created_at?: string
        }
      }
    }
  }
}

export interface UserPreferences {
  default_model: string
  theme: 'light' | 'dark' | 'auto'
  auto_save: boolean
  language: string
}

export interface MessageMetadata {
  tokens_used?: number
  model_used?: string
  processing_time?: number
  attachments?: string[]
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  name?: string | null
  avatar_url?: string | null
  preferences?: UserPreferences | null
}

export interface AuthSession {
  user: AuthUser
  access_token: string
  refresh_token: string
} 