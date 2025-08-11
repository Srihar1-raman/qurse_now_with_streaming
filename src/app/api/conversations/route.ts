import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/conversations - Get all conversations for user
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

    // First, let's try a simple query to see if the function exists
    let data;
    let error;
    
    try {
      const result = await supabase
        .rpc('get_conversations_with_message_count', { user_uuid: userId });
      data = result.data;
      error = result.error;
    } catch (funcError) {
      console.error('Function call failed:', funcError);
      // Fallback to simple query
      const result = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch conversations',
        details: error.message || error
      }, { status: 500 })
    }

    return NextResponse.json({ conversations: data || [] })

  } catch (error) {
    console.error('GET conversations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/conversations - Clear all conversations for user
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

    // Delete all conversations for the user (messages will be deleted via CASCADE)
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error clearing conversations:', error)
      return NextResponse.json({ error: 'Failed to clear conversations' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'All conversations cleared' })

  } catch (error) {
    console.error('DELETE conversations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
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

    const { title, model, initialMessage } = await request.json()

    if (!title || !model) {
      return NextResponse.json({ error: 'Title and model are required' }, { status: 400 })
    }

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title,
        model_name: model, // Use model_name for backward compatibility
        model_id: null // Will be set later if needed
      })
      .select('*')
      .single()

    if (convError) {
      console.error('Error creating conversation:', convError)
      return NextResponse.json({ 
        error: 'Failed to create conversation',
        details: convError.message || convError
      }, { status: 500 })
    }

    // Add initial message if provided
    if (initialMessage) {
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          content: initialMessage,
          role: 'user',
          user_id: userId, // Add user_id to the initial message
          metadata: { model_used: model } // Add model info to metadata
        })
        .select('*')
        .single()

      if (msgError) {
        console.error('Error adding initial message:', msgError)
        // Don't fail the request, just log the error
      } else {
        console.log('Initial message added successfully:', message)
      }
    }

    return NextResponse.json({ 
      success: true, 
      conversation 
    })

  } catch (error) {
    console.error('POST conversation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 