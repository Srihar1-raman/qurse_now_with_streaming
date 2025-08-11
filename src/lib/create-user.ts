import { SupabaseService } from './supabase-service'
import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

/**
 * Ensures a user exists in the Supabase database for Supabase Auth users
 * Creates the user if they don't exist, returns the user ID
 */
export async function ensureUserExists(user: User | null): Promise<string | null> {
  if (!user?.id) {
    return null
  }

  // For Twitter users, email might be a placeholder, so we don't require it
  if (!user?.email && !user?.email?.includes('@twitter.user')) {
    return null
  }

  try {
    // Use the same user data that was processed in the Supabase Auth callback
    // The user should already contain the correct provider-specific data
    const userId = user.id;
    const userEmail = user.email;
    const userName = user.user_metadata?.full_name || user.user_metadata?.name;
    const userImage = user.user_metadata?.avatar_url || user.user_metadata?.picture;

    // Check if user already exists by ID
    const existingUser = await SupabaseService.getUser(userId)
    
    if (existingUser) {
      return userId
    }

    // For Twitter users with placeholder emails, don't check for email conflicts
    // since placeholder emails are unique by design
    if (userEmail && !userEmail.includes('@twitter.user')) {
      // Check if user exists by email (in case of different provider)
      const { data: existingUserByEmail, error: emailError } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('email', userEmail)
        .single()

      if (emailError && emailError.code !== 'PGRST116') {
        console.error('Error checking user by email:', emailError)
      }

      if (existingUserByEmail) {
        // Instead of trying to update the existing user (which can fail due to foreign key constraints),
        // we'll create a new user with a modified email to avoid conflicts
        // This allows users to use the same email across different providers
        
        const modifiedEmail = `${userEmail.split('@')[0]}+${userId}@${userEmail.split('@')[1]}`;
        
        const { data: newUser, error } = await supabase.from('users').insert({
          id: userId,
          email: modifiedEmail, // Use modified email to avoid conflicts
          name: userName || null,
          avatar_url: userImage || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).select().single()

        if (error) {
          console.error('Error creating user with modified email:', error)
          return null
        }

        return userId
      }
    }

    // Create new user in database
    const { data: newUser, error } = await supabase.from('users').insert({
      id: userId,
      email: userEmail,
      name: userName || null,
      avatar_url: userImage || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select().single()

    if (error) {
      console.error('Error creating user in database:', error)
      return null
    }

    return userId

  } catch (error) {
    console.error('Unexpected error in ensureUserExists:', error)
    return null
  }
}

/**
 * Helper function to get user ID from Supabase Auth user with auto-creation
 * Use this in API routes that need a valid user ID
 */
export async function getUserIdFromUser(user: User | null): Promise<string | null> {
  if (!user) return null
  
  return await ensureUserExists(user)
} 