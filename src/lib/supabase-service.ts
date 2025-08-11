import { supabase, createServerClient, Database, UserPreferences, MessageMetadata } from './supabase'

export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type File = Database['public']['Tables']['files']['Row']

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

export interface ConversationWithCount extends Omit<Conversation, 'id'> {
  id: string
  message_count: number
}

// Enhanced cache management with better invalidation
const conversationCache = new Map<string, { data: ConversationWithCount[]; timestamp: number; version: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const CACHE_VERSION = 1; // Increment this when cache structure changes

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Connection health tracking
let lastConnectionCheck = 0;
let connectionHealthStatus: 'healthy' | 'unhealthy' | 'unknown' = 'unknown';
const CONNECTION_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes

export class SupabaseService {
  // Clear conversation cache
  static clearConversationCache(userId?: string) {
    if (userId) {
      conversationCache.delete(`conversations_${userId}`);
    } else {
      conversationCache.clear();
    }
  }

  // Invalidate cache for a specific user (useful when data changes)
  static invalidateUserCache(userId: string) {
    const cacheKey = `conversations_${userId}`;
    const cached = conversationCache.get(cacheKey);
    if (cached) {
      // Keep the data but mark it as stale
      conversationCache.set(cacheKey, {
        ...cached,
        timestamp: 0, // Force refresh on next access
        version: CACHE_VERSION
      });
    }
  }

  // Enhanced connection health check with caching
  static async checkConnection(): Promise<boolean> {
    const now = Date.now();
    
    // Only check connection if enough time has passed since last check
    if (now - lastConnectionCheck < CONNECTION_CHECK_INTERVAL) {
      return connectionHealthStatus === 'healthy';
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .limit(1);
      
      const isHealthy = !error;
      connectionHealthStatus = isHealthy ? 'healthy' : 'unhealthy';
      lastConnectionCheck = now;
      
      return isHealthy;
    } catch (error) {
      console.error('Supabase connection check failed:', error);
      connectionHealthStatus = 'unhealthy';
      lastConnectionCheck = now;
      return false;
    }
  }

  // Get connection health status without making a request
  static getConnectionStatus(): 'healthy' | 'unhealthy' | 'unknown' {
    return connectionHealthStatus;
  }

  // Manually refresh cache for a specific user
  static async refreshUserCache(userId: string): Promise<ConversationWithCount[]> {
    // Clear the cache entry to force a fresh fetch
    conversationCache.delete(`conversations_${userId}`);
    
    // Fetch fresh data
    return await this.getConversations(userId);
  }

  // Get cache statistics for debugging
  static getCacheStats() {
    const now = Date.now();
    const stats = {
      totalEntries: conversationCache.size,
      validEntries: 0,
      expiredEntries: 0,
      totalDataSize: 0
    };

    for (const [key, cached] of conversationCache.entries()) {
      if (cached.version === CACHE_VERSION) {
        if ((now - cached.timestamp) < CACHE_DURATION) {
          stats.validEntries++;
        } else {
          stats.expiredEntries++;
        }
        stats.totalDataSize += cached.data.length;
      }
    }

    return stats;
  }

  // Helper function to retry failed operations
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = MAX_RETRIES
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  // User operations
  static async getUser(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return null
    }

    return data
  }

  static async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ preferences })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user preferences:', error)
      return false
    }

    return true
  }

  // Conversation operations
  static async createConversation(
    userId: string,
    title: string,
    model: string
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title,
        model_name: model
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return null
    }

    // Invalidate cache for this user
    this.invalidateUserCache(userId);

    return data.id
  }

  static async getConversations(userId: string): Promise<ConversationWithCount[]> {
    // Check cache first
    const cacheKey = `conversations_${userId}`;
    const cached = conversationCache.get(cacheKey);
    const now = Date.now();
    
    // Check if cache is valid (not expired and version matches)
    if (cached && 
        (now - cached.timestamp) < CACHE_DURATION && 
        cached.version === CACHE_VERSION) {
      return cached.data;
    }

    // Check connection health before making the call
    const isConnected = await this.checkConnection();
    if (!isConnected) {
      console.warn('Supabase connection unhealthy, returning cached data if available');
      // Return cached data even if expired, but only if version matches
      if (cached && cached.version === CACHE_VERSION) {
        return cached.data;
      }
      return [];
    }

    try {
      // Use retry logic for the API call
      const data = await this.retryOperation(async () => {
        const { data, error } = await supabase
          .rpc('get_conversations_with_message_count', { user_uuid: userId });

        if (error) {
          throw error;
        }

        return data || [];
      });

      // Cache the result
      conversationCache.set(cacheKey, { data, timestamp: now, version: CACHE_VERSION });
      return data;
    } catch (error) {
      console.error('Error fetching conversations after retries:', error);
      
      // Return cached data if available and version matches, even if expired
      if (cached && cached.version === CACHE_VERSION) {
        console.log('Returning expired cached data due to API failure');
        return cached.data;
      }
      
      return [];
    }
  }

  static async getConversation(conversationId: string): Promise<ConversationWithMessages | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (*)
      `)
      .eq('id', conversationId)
      .single()

    if (error) {
      console.error('Error fetching conversation:', error)
      return null
    }

    return data
  }

  static async updateConversationTitle(conversationId: string, title: string): Promise<boolean> {
    const { error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)

    if (error) {
      console.error('Error updating conversation title:', error)
      return false
    }

    // Invalidate cache for this conversation's user
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();
      
      if (conversation?.user_id) {
        this.invalidateUserCache(conversation.user_id);
      }
    } catch (cacheError) {
      console.warn('Failed to invalidate cache after title update:', cacheError);
    }

    return true
  }

  static async archiveConversation(conversationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('conversations')
      .update({ archived: true })
      .eq('id', conversationId)

    if (error) {
      console.error('Error archiving conversation:', error)
      return false
    }

    return true
  }

  static async deleteConversation(conversationId: string): Promise<boolean> {
    // Get user_id before deleting for cache invalidation
    let userId: string | null = null;
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();
      
      userId = conversation?.user_id || null;
    } catch (error) {
      console.warn('Failed to get user_id for cache invalidation:', error);
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    if (error) {
      console.error('Error deleting conversation:', error)
      return false
    }

    // Invalidate cache for this user
    if (userId) {
      this.invalidateUserCache(userId);
    }

    return true
  }

  // Message operations
  static async addMessage(
    conversationId: string,
    content: string,
    role: 'user' | 'assistant' | 'system',
    metadata?: MessageMetadata
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content,
        role,
        metadata
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error adding message:', error)
      return null
    }

    // Update conversation's updated_at timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    // Invalidate cache for this conversation's user
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();
      
      if (conversation?.user_id) {
        this.invalidateUserCache(conversation.user_id);
      }
    } catch (cacheError) {
      console.warn('Failed to invalidate cache after adding message:', cacheError);
    }

    return data.id
  }

  static async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }

    return data || []
  }

  static async updateMessage(messageId: string, content: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId)

    if (error) {
      console.error('Error updating message:', error)
      return false
    }

    return true
  }

  static async deleteMessage(messageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)

    if (error) {
      console.error('Error deleting message:', error)
      return false
    }

    return true
  }

  // File operations
  static async uploadFile(
    userId: string,
    conversationId: string | null,
    file: globalThis.File,
    filePath: string
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        name: file.name,
        path: filePath,
        size: file.size,
        type: file.type
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error uploading file:', error)
      return null
    }

    return data.id
  }

  static async getFiles(userId: string, conversationId?: string): Promise<File[]> {
    let query = supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)

    if (conversationId) {
      query = query.eq('conversation_id', conversationId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching files:', error)
      return []
    }

    return data || []
  }

  static async deleteFile(fileId: string): Promise<boolean> {
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)

    if (error) {
      console.error('Error deleting file:', error)
      return false
    }

    return true
  }

  // Storage operations
  static async uploadFileToStorage(
    file: globalThis.File,
    path: string
  ): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from('files')
      .upload(path, file)

    if (error) {
      console.error('Error uploading file to storage:', error)
      return null
    }

    return data.path
  }

  static async getFileUrl(path: string): Promise<string | null> {
    const { data } = supabase.storage
      .from('files')
      .getPublicUrl(path)

    return data.publicUrl
  }

  static async deleteFileFromStorage(path: string): Promise<boolean> {
    const { error } = await supabase.storage
      .from('files')
      .remove([path])

    if (error) {
      console.error('Error deleting file from storage:', error)
      return false
    }

    return true
  }

  // AI operations
  static async generateConversationTitle(firstMessage: string): Promise<string> {
    // This would typically call an AI service to generate a title
    // For now, return a simple truncated version
    return firstMessage.length > 50 ? firstMessage.substring(0, 50) + '...' : firstMessage
  }

  // Statistics
  static async getConversationStats(userId: string): Promise<{
    totalConversations: number
    totalMessages: number
    totalFiles: number
  }> {
    const [conversations, messages, files] = await Promise.all([
      supabase.from('conversations').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('messages').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('files').select('id', { count: 'exact' }).eq('user_id', userId)
    ])

    return {
      totalConversations: conversations.count || 0,
      totalMessages: messages.count || 0,
      totalFiles: files.count || 0
    }
  }
} 