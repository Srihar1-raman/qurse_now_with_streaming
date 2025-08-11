import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('=== Testing Supabase Connection ===');
    
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

    // Test 1: Check environment variables
    console.log('Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...'
    });

    // Test 2: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth check:', { 
      hasUser: !!user, 
      userId: user?.id,
      authError: authError?.message 
    });

    // Test 3: Check if we can query the database
    let dbTest = { success: false, error: null, data: null };
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .limit(1);
      
      dbTest = { success: !error, error: error?.message, data };
      console.log('Database test:', dbTest);
    } catch (dbError) {
      dbTest = { success: false, error: dbError.message, data: null };
      console.log('Database test failed:', dbError);
    }

    // Test 4: Check if function exists
    let functionTest = { success: false, error: null };
    if (user) {
      try {
        const { data, error } = await supabase
          .rpc('get_conversations_with_message_count', { user_uuid: user.id });
        functionTest = { success: !error, error: error?.message };
        console.log('Function test:', functionTest);
      } catch (funcError) {
        functionTest = { success: false, error: funcError.message };
        console.log('Function test failed:', funcError);
      }
    }

    return NextResponse.json({
      status: 'Test completed',
      environment: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      auth: {
        hasUser: !!user,
        userId: user?.id,
        error: authError?.message
      },
      database: dbTest,
      function: functionTest
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error.message || error
    }, { status: 500 });
  }
} 