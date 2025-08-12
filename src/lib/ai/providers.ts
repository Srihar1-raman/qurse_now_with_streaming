import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import { createGroq } from '@ai-sdk/groq';
import { customProvider, wrapLanguageModel, extractReasoningMiddleware } from 'ai';
import { ProviderConfig } from '@/types/ai';

// Reasoning middleware for reasoning models
const reasoningMiddleware = extractReasoningMiddleware({
  tagName: 'think',
});

// Provider configurations (server-side only)
let groqProvider: any = null;
let xaiProvider: any = null;
let providers: ProviderConfig = {};

// Only initialize providers on server-side
if (typeof window === 'undefined') {
  groqProvider = createGroq({
    apiKey: process.env.GROQ_API_KEY
  });

  xaiProvider = createXai({
    apiKey: process.env.XAI_API_KEY
  });

  providers = {
    openai: openai,
    anthropic: anthropic,
    google: google,
    xai: xaiProvider,
    groq: groqProvider,
  };
}

// Create custom provider with tool support (similar to Scira's approach) - server-side only
let customProviderWithTools: any = null;

if (typeof window === 'undefined') {
  customProviderWithTools = customProvider({
    languageModels: {
      // Groq models
      'deepseek-r1-distill-llama-70b': wrapLanguageModel({
        model: groqProvider('deepseek-r1-distill-llama-70b'),
        middleware: reasoningMiddleware,
      }),
      'qwen/qwen3-32b': wrapLanguageModel({
        model: groqProvider('qwen/qwen3-32b'),
        middleware: reasoningMiddleware,
      }),
      'gemma2-9b-it': groqProvider('gemma2-9b-it'),
      'moonshotai/kimi-k2-instruct': groqProvider('moonshotai/kimi-k2-instruct'),

      'llama-3.3-70b-versatile': groqProvider('llama-3.3-70b-versatile'),
      'meta-llama/llama-4-scout-17b-16e-instruct': groqProvider('meta-llama/llama-4-scout-17b-16e-instruct'),
      'meta-llama/llama-4-maverick-17b-128e-instruct': groqProvider('meta-llama/llama-4-maverick-17b-128e-instruct'),
      'llama-3.1-8b-instant': groqProvider('llama-3.1-8b-instant'),
      'openai/gpt-oss-120b': wrapLanguageModel({
        model: groqProvider('openai/gpt-oss-120b'),
        middleware: reasoningMiddleware,
      }),
      'openai/gpt-oss-20b': wrapLanguageModel({
        model: groqProvider('openai/gpt-oss-20b'),
        middleware: reasoningMiddleware,
      }),
      
      // XAI models
      'grok-3-mini': wrapLanguageModel({
        model: xaiProvider('grok-3-mini'),
        middleware: reasoningMiddleware,
      }),
      'grok-2-vision-1212': xaiProvider('grok-2-vision-1212'),
      'grok-3': xaiProvider('grok-3'),
      'grok-4-0709': wrapLanguageModel({
        model: xaiProvider('grok-4-0709'),
        middleware: reasoningMiddleware,
      }),
      
      // OpenAI models
      'o4-mini-2025-04-16': wrapLanguageModel({
        model: openai('o4-mini-2025-04-16'),
        middleware: reasoningMiddleware,
      }),
      'gpt-4.1-2025-04-14': wrapLanguageModel({
        model: openai('gpt-4.1-2025-04-14'),
        middleware: reasoningMiddleware,
      }),
      
      // Anthropic models
      'claude-sonnet-4-20250514': wrapLanguageModel({
        model: anthropic('claude-sonnet-4-20250514'),
        middleware: reasoningMiddleware,
      }),
      'claude-3-haiku-20240307': anthropic('claude-3-haiku-20240307'),
    },
  });
}

export { providers, customProviderWithTools }; 