import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/conversations - Get all conversations for user
export async function GET() {
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
export async function DELETE() {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id;

    // Get all conversation IDs for the user
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching conversations:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch conversations',
        details: fetchError.message || fetchError
      }, { status: 500 })
    }

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id);

      // Delete all messages for the user's conversations
      const { error: deleteMessagesError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds);

      if (deleteMessagesError) {
        console.error('Error deleting messages:', deleteMessagesError)
        return NextResponse.json({ 
          error: 'Failed to delete messages',
          details: deleteMessagesError.message || deleteMessagesError
        }, { status: 500 })
      }

      // Delete all conversations for the user
      const { error: deleteConvError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', userId)

      if (deleteConvError) {
        console.error('Error deleting conversations:', deleteConvError)
        return NextResponse.json({ 
          error: 'Failed to delete conversations',
          details: deleteConvError.message || deleteConvError
        }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })

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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id;
    const { title, model } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Create conversation
    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        title,
        user_id: userId,
        model_name: model || 'gpt-4',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (createError) {
      console.error('Error creating conversation:', createError)
      return NextResponse.json({ 
        error: 'Failed to create conversation',
        details: createError.message || createError
      }, { status: 500 })
    }

    return NextResponse.json({ conversation })

  } catch (error) {
    console.error('POST conversation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 