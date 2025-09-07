// Export all AI functionality from the new modular structure
export * from './models';
export * from './providers';
export * from './service';
export * from './parsing';
export * from './fallback';

// Re-export types for convenience
export type {
  AIModel,
  ChatMessage,
  AIResponse,
  ModelGroup,
  ParsedResponse,
  ProviderConfig
} from '@/types/ai'; 