// Core AI interfaces and types
export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'ollama' | 'xai';
  maxTokens?: number;
  temperature?: number;
  imageSupport?: boolean;
  reasoningModel?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  rawResponse?: any;
  reasoning?: any;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ModelGroup {
  provider: string;
  enabled: boolean;
  models: AIModel[];
}

export interface ParsedResponse {
  reasoning?: string;
  finalAnswer: string;
  hasReasoning: boolean;
}

// Provider configurations
export interface ProviderConfig {
  [key: string]: any;
} 