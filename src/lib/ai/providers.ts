import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import { createGroq } from '@ai-sdk/groq';
import { customProvider } from 'ai';
import { ProviderConfig } from '@/types/ai';

// Safe provider functions that work in both client and server
const createSafeProvider = (providerCreator: any, apiKey: string | undefined) => {
  if (typeof window === 'undefined' && apiKey) {
    try {
      return providerCreator({ apiKey });
    } catch (error) {
      console.warn('Failed to create provider:', error);
      return null;
    }
  }
  return null;
};

// Provider instances (safe for both client and server)
const groqProvider = createSafeProvider(createGroq, process.env.GROQ_API_KEY);
const xaiProvider = createSafeProvider(createXai, process.env.XAI_API_KEY);

// Unified provider with all models (Scira-style approach)
export const qurse = customProvider({
  languageModels: {
    // Groq models with reasoning middleware
    ...(groqProvider ? {
      'deepseek-r1-distill-llama-70b': groqProvider('deepseek-r1-distill-llama-70b'),
      'qwen/qwen3-32b': groqProvider('qwen/qwen3-32b'),
      'openai/gpt-oss-120b': groqProvider('openai/gpt-oss-120b'),
      'openai/gpt-oss-20b': groqProvider('openai/gpt-oss-20b'),
      
      // Standard Groq models
      'gemma2-9b-it': groqProvider('gemma2-9b-it'),
      'moonshotai/kimi-k2-instruct': groqProvider('moonshotai/kimi-k2-instruct'),
      'llama-3.3-70b-versatile': groqProvider('llama-3.3-70b-versatile'),
      'meta-llama/llama-4-scout-17b-16e-instruct': groqProvider('meta-llama/llama-4-scout-17b-16e-instruct'),
      'meta-llama/llama-4-maverick-17b-128e-instruct': groqProvider('meta-llama/llama-4-maverick-17b-128e-instruct'),
      'llama-3.1-8b-instant': groqProvider('llama-3.1-8b-instant'),
    } : {}),
    
    // XAI models with reasoning middleware
    ...(xaiProvider ? {
      'grok-3-mini': xaiProvider('grok-3-mini'),
      'grok-4-0709': xaiProvider('grok-4-0709'),
      
      // Standard XAI models
      'grok-2-vision-1212': xaiProvider('grok-2-vision-1212'),
      'grok-3': xaiProvider('grok-3'),
    } : {}),
    
    // OpenAI models with reasoning middleware
    'o4-mini-2025-04-16': openai('o4-mini-2025-04-16'),
    'gpt-4.1-2025-04-14': openai('gpt-4.1-2025-04-14'),
    
    // Anthropic models with reasoning middleware
    'claude-sonnet-4-20250514': anthropic('claude-sonnet-4-20250514'),
    'claude-3-haiku-20240307': anthropic('claude-3-haiku-20240307'),
    
    // Google models
    'gemini-2.5-flash': google('gemini-2.5-flash'),
    'gemini-2.5-pro': google('gemini-2.5-pro'),
  },
});

// Legacy provider config for backward compatibility
export const providers: ProviderConfig = {
  openai: openai,
  anthropic: anthropic,
  google: google,
  xai: xaiProvider,
  groq: groqProvider,
};

// Legacy customProviderWithTools for backward compatibility
export let customProviderWithTools: any = null;

if (typeof window === 'undefined' && groqProvider && xaiProvider) {
  customProviderWithTools = customProvider({
    languageModels: {
      // Groq models
      'deepseek-r1-distill-llama-70b': groqProvider('deepseek-r1-distill-llama-70b'),
      'qwen/qwen3-32b': groqProvider('qwen/qwen3-32b'),
      'gemma2-9b-it': groqProvider('gemma2-9b-it'),
      'moonshotai/kimi-k2-instruct': groqProvider('moonshotai/kimi-k2-instruct'),

      'llama-3.3-70b-versatile': groqProvider('llama-3.3-70b-versatile'),
      'meta-llama/llama-4-scout-17b-16e-instruct': groqProvider('meta-llama/llama-4-scout-17b-16e-instruct'),
      'meta-llama/llama-4-maverick-17b-128e-instruct': groqProvider('meta-llama/llama-4-maverick-17b-128e-instruct'),
      'llama-3.1-8b-instant': groqProvider('llama-3.1-8b-instant'),
      'openai/gpt-oss-120b': groqProvider('openai/gpt-oss-120b'),
      'openai/gpt-oss-20b': groqProvider('openai/gpt-oss-20b'),
      
      // XAI models
      'grok-3-mini': xaiProvider('grok-3-mini'),
      'grok-2-vision-1212': xaiProvider('grok-2-vision-1212'),
      'grok-3': xaiProvider('grok-3'),
      'grok-4-0709': xaiProvider('grok-4-0709'),
      
      // OpenAI models
      'o4-mini-2025-04-16': openai('o4-mini-2025-04-16'),
      'gpt-4.1-2025-04-14': openai('gpt-4.1-2025-04-14'),
      
      // Anthropic models
      'claude-sonnet-4-20250514': anthropic('claude-sonnet-4-20250514'),
      'claude-3-haiku-20240307': anthropic('claude-3-haiku-20240307'),
    },
  });
} 