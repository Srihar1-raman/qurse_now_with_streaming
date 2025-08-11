import { AIModel, ModelGroup } from '@/types/ai';

// Model configuration for all providers
export const MODEL_GROUPS: Record<string, ModelGroup> = {
  groq: {
    provider: 'GROQ',
    enabled: true, // User has API key
    models: [
      {
        id: 'deepseek-r1-distill-llama-70b',
        name: 'Deepseek R1 Distill 70B',
        provider: 'groq',
        maxTokens: 8192,
        temperature: 0.7,
        reasoningModel: true,
        supportsTools: true
      },
      {
        id: 'qwen/qwen3-32b',
        name: 'Qwen3 32B',
        provider: 'groq',
        maxTokens: 32768,
        temperature: 0.7,
        reasoningModel: true,
        supportsTools: true
      },
      {
        id: 'gemma2-9b-it',
        name: 'Gemma2 9B',
        provider: 'groq',
        maxTokens: 8192,
        temperature: 0.7,
        supportsTools: true
      },
      {
        id: 'moonshotai/kimi-k2-instruct',
        name: 'Kimi K2 Instruct',
        provider: 'groq',
        maxTokens: 8192,
        temperature: 0.7,
        supportsTools: true
      },
      {
        id: 'mistral-saba-24b',
        name: 'Mistral Saba 24B',
        provider: 'groq',
        maxTokens: 8192,
        temperature: 0.7,
        supportsTools: true
      },
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        provider: 'groq',
        maxTokens: 32768,
        temperature: 0.7,
        supportsTools: true
      },
      {
        id: 'meta-llama/llama-4-scout-17b-16e-instruct',
        name: 'Llama 4 Scout 17B',
        provider: 'groq',
        maxTokens: 8192,
        temperature: 0.7,
        imageSupport: true,
        supportsTools: true
      },
      {
        id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        name: 'Llama 4 Maverick 17B',
        provider: 'groq',
        maxTokens: 8192,
        temperature: 0.7,
        imageSupport: true,
        supportsTools: true
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        provider: 'groq',
        maxTokens: 8192,
        temperature: 0.7,
        supportsTools: true
      },
      {
        id: 'openai/gpt-oss-120b',
        name: 'GPT-OSS 120B',
        provider: 'groq',
        maxTokens: 8192,
        temperature: 0.7,
        reasoningModel: true,
        supportsTools: true
      },
      {
        id: 'openai/gpt-oss-20b',
        name: 'GPT-OSS 20B',
        provider: 'groq',
        maxTokens: 8192,
        temperature: 0.7,
        reasoningModel: true,
        supportsTools: true
      }
    ]
  },
  xai: {
    provider: 'XAI',
    enabled: true, // User has API key
    models: [
      {
        id: 'grok-3-mini',
        name: 'Grok 3 Mini',
        provider: 'xai',
        maxTokens: 8192,
        temperature: 0.7,
        reasoningModel: true,
        supportsTools: true
      },
      {
        id: 'grok-2-vision-1212',
        name: 'Grok 2 Vision',
        provider: 'xai',
        maxTokens: 8192,
        temperature: 0.7,
        imageSupport: true,
        supportsTools: true
      },
      {
        id: 'grok-3',
        name: 'Grok 3',
        provider: 'xai',
        maxTokens: 8192,
        temperature: 0.7,
        supportsTools: true
      },
      {
        id: 'grok-4-0709',
        name: 'Grok 4',
        provider: 'xai',
        maxTokens: 8192,
        temperature: 0.7,
        reasoningModel: true,
        supportsTools: true
      }
    ]
  },
  openai: {
    provider: 'OpenAI',
    enabled: true, // Now enabled
    models: [
      {
        id: 'o4-mini-2025-04-16',
        name: 'O4 Mini',
        provider: 'openai',
        maxTokens: 4096,
        temperature: 0.7,
        imageSupport: true,
        reasoningModel: true,
        supportsTools: true
      },
      {
        id: 'gpt-4.1-2025-04-14',
        name: 'GPT-4.1',
        provider: 'openai',
        maxTokens: 4096,
        temperature: 0.7,
        imageSupport: true,
        supportsTools: true
      }
    ]
  },
  anthropic: {
    provider: 'Anthropic',
    enabled: true, // Now enabled
    models: [
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        maxTokens: 4096,
        temperature: 0.7,
        reasoningModel: true,
        supportsTools: true
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        maxTokens: 4096,
        temperature: 0.7,
        supportsTools: true
      }
    ]
  }
};

// Model mappings for Vercel AI SDK
export const AI_MODELS: Record<string, AIModel> = {};

// Populate AI_MODELS from groups (only enabled providers)
Object.values(MODEL_GROUPS).forEach(group => {
  if (group.enabled) {
    group.models.forEach(model => {
      AI_MODELS[model.name] = model;
    });
  }
});

// Helper function to get model info
export function getModelInfo(modelKey: string): AIModel | null {
  return AI_MODELS[modelKey] || null;
}

// Helper function to check if a model supports reasoning
export function isReasoningModel(modelName: string): boolean {
  const model = getModelInfo(modelName);
  return model?.reasoningModel === true;
} 