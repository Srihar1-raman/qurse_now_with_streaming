import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import { createGroq } from '@ai-sdk/groq';
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from 'ai';
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
      'deepseek-r1-distill-llama-70b': wrapLanguageModel({
        model: groqProvider('deepseek-r1-distill-llama-70b'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),
      'qwen/qwen3-32b': wrapLanguageModel({
        model: groqProvider('qwen/qwen3-32b'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),
      'openai/gpt-oss-120b': wrapLanguageModel({
        model: groqProvider('openai/gpt-oss-120b'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),
      'openai/gpt-oss-20b': wrapLanguageModel({
        model: groqProvider('openai/gpt-oss-20b'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),

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
      'grok-3-mini': wrapLanguageModel({
        model: xaiProvider('grok-3-mini'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),
      'grok-4-0709': wrapLanguageModel({
        model: xaiProvider('grok-4-0709'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),

      // Standard XAI models
      'grok-2-vision-1212': xaiProvider('grok-2-vision-1212'),
      'grok-3': xaiProvider('grok-3'),
    } : {}),

    // OpenAI models with reasoning middleware
    'o4-mini-2025-04-16': wrapLanguageModel({
      model: openai('o4-mini-2025-04-16'),
      middleware: extractReasoningMiddleware({ tagName: 'think' })
    }),
    'gpt-4.1-2025-04-14': openai('gpt-4.1-2025-04-14'),

    // Anthropic models with reasoning middleware
    'claude-sonnet-4-20250514': wrapLanguageModel({
      model: anthropic('claude-sonnet-4-20250514'),
      middleware: extractReasoningMiddleware({ tagName: 'thinking' })
    }),
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
      // Groq models with reasoning middleware
      'deepseek-r1-distill-llama-70b': wrapLanguageModel({
        model: groqProvider('deepseek-r1-distill-llama-70b'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),
      'qwen/qwen3-32b': wrapLanguageModel({
        model: groqProvider('qwen/qwen3-32b'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),
      'gemma2-9b-it': groqProvider('gemma2-9b-it'),
      'moonshotai/kimi-k2-instruct': groqProvider('moonshotai/kimi-k2-instruct'),

      'llama-3.3-70b-versatile': groqProvider('llama-3.3-70b-versatile'),
      'meta-llama/llama-4-scout-17b-16e-instruct': groqProvider('meta-llama/llama-4-scout-17b-16e-instruct'),
      'meta-llama/llama-4-maverick-17b-128e-instruct': groqProvider('meta-llama/llama-4-maverick-17b-128e-instruct'),
      'llama-3.1-8b-instant': groqProvider('llama-3.1-8b-instant'),
      'openai/gpt-oss-120b': wrapLanguageModel({
        model: groqProvider('openai/gpt-oss-120b'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),
      'openai/gpt-oss-20b': wrapLanguageModel({
        model: groqProvider('openai/gpt-oss-20b'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),

      // XAI models with reasoning middleware
      'grok-3-mini': wrapLanguageModel({
        model: xaiProvider('grok-3-mini'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),
      'grok-2-vision-1212': xaiProvider('grok-2-vision-1212'),
      'grok-3': xaiProvider('grok-3'),
      'grok-4-0709': wrapLanguageModel({
        model: xaiProvider('grok-4-0709'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),

      // OpenAI models with reasoning middleware
      'o4-mini-2025-04-16': wrapLanguageModel({
        model: openai('o4-mini-2025-04-16'),
        middleware: extractReasoningMiddleware({ tagName: 'think' })
      }),
      'gpt-4.1-2025-04-14': openai('gpt-4.1-2025-04-14'),

      // Anthropic models with reasoning middleware
      'claude-sonnet-4-20250514': wrapLanguageModel({
        model: anthropic('claude-sonnet-4-20250514'),
        middleware: extractReasoningMiddleware({ tagName: 'thinking' })
      }),
      'claude-3-haiku-20240307': anthropic('claude-3-haiku-20240307'),
    },
  });
} 