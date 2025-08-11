import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// DELETE /api/user - Delete user account and all data
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(
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
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id;
    console.log('Attempting to delete user:', userId);

    // Delete user and all associated data (conversations, messages, files will be deleted via CASCADE)
    const { error, data } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Error deleting user account:', error)
      return NextResponse.json({ error: `Failed to delete account: ${error.message}` }, { status: 500 })
    }

    console.log('User deleted successfully:', data);

    // Sign out the user to invalidate their session
    // The auth user will remain in auth.users but will be orphaned
    // This is a common pattern - the user can't sign in again since their profile is gone
    await supabase.auth.signOut()

    return NextResponse.json({ 
      success: true, 
      message: 'Account and all data permanently deleted' 
    })

  } catch (error) {
    console.error('DELETE user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/user - Update user preferences
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(
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
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id;
    const body = await request.json()
    const { preferences } = body

    if (!preferences) {
      return NextResponse.json({ error: 'Preferences data is required' }, { status: 400 })
    }

    // Get current user data to merge preferences
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching current user preferences:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch current preferences' }, { status: 500 })
    }

    // Merge current preferences with new preferences
    const currentPreferences = currentUser?.preferences || {}
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
      updated_at: new Date().toISOString()
    }

    // Update user preferences
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        preferences: updatedPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user preferences:', updateError)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Preferences updated successfully',
      preferences: updatedPreferences
    })

  } catch (error) {
    console.error('PATCH user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/user - Get user profile information
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(
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
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id;

    // Get user data with conversation count
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
    }

    // Get conversation count
    const { count: conversationCount, error: countError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countError) {
      console.error('Error counting conversations:', countError)
    }

    return NextResponse.json({ 
      user: userData,
      preferences: userData.preferences,
      stats: {
        totalConversations: conversationCount || 0
      }
    })

  } catch (error) {
    console.error('GET user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 