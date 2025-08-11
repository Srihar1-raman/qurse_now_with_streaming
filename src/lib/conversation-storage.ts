// Utility functions for managing guest conversations in localStorage



export interface StoredMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

export interface StoredConversation {
  id: string;
  messages: StoredMessage[];
  model: string;
  timestamp: string;
}

const GUEST_CONVERSATION_KEY = 'qurse_guest_conversation';
const GUEST_CONVERSATIONS_KEY = 'qurse_guest_conversations';

export class ConversationStorage {
  // Save current conversation for guests
  static saveGuestConversation(messages: StoredMessage[], model: string): void {
    if (typeof window === 'undefined') return;
    
    const conversation: StoredConversation = {
      id: 'guest_conversation',
      messages,
      model,
      timestamp: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(GUEST_CONVERSATION_KEY, JSON.stringify(conversation));
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }

  // Load current guest conversation
  static loadGuestConversation(): StoredConversation | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(GUEST_CONVERSATION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  // Clear current guest conversation
  static clearGuestConversation(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(GUEST_CONVERSATION_KEY);
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }

  // Save multiple guest conversations (for future use)
  static saveGuestConversations(conversations: StoredConversation[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(GUEST_CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }

  // Load all guest conversations
  static loadGuestConversations(): StoredConversation[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(GUEST_CONVERSATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }



  // Check if there's a guest conversation
  static hasGuestConversation(): boolean {
    const conversation = this.loadGuestConversation();
    return conversation !== null && conversation.messages.length > 0;
  }

  // Get conversation summary for display
  static getConversationSummary(conversation: StoredConversation): string {
    if (conversation.messages.length === 0) return 'Empty conversation';
    
    const firstUserMessage = conversation.messages.find(msg => msg.isUser);
    if (firstUserMessage) {
      return firstUserMessage.text.substring(0, 50) + (firstUserMessage.text.length > 50 ? '...' : '');
    }
    
    return 'Conversation with AI';
  }
} 