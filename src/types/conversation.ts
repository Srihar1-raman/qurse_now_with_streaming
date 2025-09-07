export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  model?: string;
  rawResponse?: unknown;
  reasoning?: unknown;
  parts?: Array<{
    type: string;
    text?: string;
    reasoning?: string;
    source?: unknown;
    toolInvocation?: unknown;
    file?: unknown;
  }>;
  sources?: Array<{
    title: string;
    relevance_score: number;
    domain: string;
    url: string;
    favicon?: string;
  }>;
}

export interface Source {
  title: string;
  relevance_score: number;
  domain: string;
  url: string;
  favicon?: string;
}

export interface WebSearchOption {
  name: string;
  enabled: boolean;
}
