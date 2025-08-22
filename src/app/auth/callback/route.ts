import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Get the user data and create/update profile in our users table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          // Check if a user with this email already exists
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, email, name, avatar_url, preferences')
            .eq('email', user.email)
            .single();

          if (existingUser && existingUser.id !== user.id) {
            // This is a different user ID but same email - account linking scenario
            // We'll handle this in the frontend with a confirmation popup
            // For now, redirect to a special page that will show the confirmation
            return NextResponse.redirect(`${origin}/auth/link-accounts?email=${encodeURIComponent(user.email!)}&provider=${encodeURIComponent(user.app_metadata?.provider || 'unknown')}&next=${encodeURIComponent(next)}`);
          }

          // Normal case: create or update user profile
          await supabase
            .from('users')
            .upsert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.user_metadata?.name,
              avatar_url: user.user_metadata?.avatar_url,
              preferences: {
                theme: 'auto',
                language: 'en',
                auto_save: true,
                default_model: 'Llama 3.1 70B (Groq)'
              },
            }, {
              onConflict: 'id'
            });
        } catch (error) {
          console.error('Error handling user profile:', error);
          // Continue with redirect even if profile creation fails
        }
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}${next}`);
} 