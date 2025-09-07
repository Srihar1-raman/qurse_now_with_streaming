// Legacy compatibility layer - imports from new modular structure
// This file maintains backward compatibility while using the new organized structure
import {
  MODEL_GROUPS,
  AI_MODELS,
  getModelInfo,
  isReasoningModel,
  generateAIText,
  streamAIText,
  generateAIObject,
  parseReasoningResponse,
  aiService,
  type AIModel,
  type ChatMessage,
  type AIResponse,
  type ModelGroup,
  type ParsedResponse
} from './ai';

// Re-export everything for backward compatibility
export {
  MODEL_GROUPS,
  AI_MODELS,
  getModelInfo,
  isReasoningModel,
  generateAIText,
  streamAIText,
  generateAIObject,
  parseReasoningResponse,
  aiService,
  type AIModel,
  type ChatMessage,
  type AIResponse,
  type ModelGroup,
  type ParsedResponse
}; 