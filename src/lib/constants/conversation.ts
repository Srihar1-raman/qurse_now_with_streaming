import { WebSearchOption } from '@/types/conversation';

// Web search options (UI only - functionality disabled)
export const webSearchOptions: WebSearchOption[] = [
  { name: 'Chat', enabled: false },
  { name: 'Web Search (Exa)', enabled: false }, // Disabled
  { name: 'arXiv', enabled: false } // Disabled
];

// Default model
export const DEFAULT_MODEL = 'GPT-OSS 120B';

// Compatible models for arXiv mode
export const COMPATIBLE_ARXIV_MODELS = [
  'GPT-OSS 120B',
  'GPT-OSS 20B',
  'Qwen3 32B',
  'Deepseek R1 Distill 70B',
  'Llama 4 Scout 17B',
  'Kimi K2 Instruct'
];

// Compatible providers for arXiv mode
export const COMPATIBLE_ARXIV_PROVIDERS = ['XAI', 'OpenAI', 'Anthropic'];

// Auto-scroll delay
export const SCROLL_DELAY = 50;

// Message submission rate limit
export const SUBMIT_RATE_LIMIT = 500;
