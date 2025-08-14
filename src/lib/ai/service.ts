import { generateText, streamText, generateObject } from 'ai';
import { z } from 'zod';
import { getModelInfo, AI_MODELS } from './models';
import { providers } from './providers';
import { AIResponse } from '@/types/ai';

// Get model instance for Vercel AI SDK
function getModel(modelKey: string): any | null {
  // Only work on server-side
  if (typeof window !== 'undefined') {
    return null;
  }

  const modelInfo = getModelInfo(modelKey);
  if (!modelInfo) {
    console.log(`❌ Model info not found for: ${modelKey}`);
    return null;
  }

  console.log(`🔍 Getting model instance for: ${modelKey} (${modelInfo.provider})`);

  const provider = providers[modelInfo.provider as keyof typeof providers];
  if (provider) {
    const modelInstance = provider(modelInfo.id);
    console.log(`✅ Model instance created for ${modelKey}`);
    return modelInstance;
  } else {
    console.log(`❌ Provider not found for: ${modelInfo.provider}`);
    return null;
  }
}

// Generate text with Vercel AI SDK
export async function generateAIText({
  model,
  messages,
  maxTokens = 8192,
  temperature = 0.7
}: {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}) {
  try {
    console.log('🔍 generateAIText called with model:', model);
    console.log('🔍 Available models in AI_MODELS:', Object.keys(AI_MODELS));
    
    const modelInfo = getModelInfo(model);
    if (!modelInfo) {
      console.error(`❌ Model not found: "${model}"`);
      console.error('Available models:', Object.keys(AI_MODELS));
      throw new Error(`Model not found: ${model}`);
    }
    
    console.log('✅ Found model info:', modelInfo.name, 'provider:', modelInfo.provider);

    // Only use direct SDK on server-side
    if (typeof window === 'undefined') {
      const modelInstance = getModel(model);
      if (modelInstance) {
        console.log(`🚀 Using Vercel AI SDK for ${model} (${modelInfo.provider})`);
        const result = await generateText({
          model: modelInstance,
          messages: messages as any,
          maxTokens: maxTokens,
          temperature
        });

        return {
          choices: [{
            message: {
              content: result.text,
              role: 'assistant'
            }
          }],
          model: model,
          usage: result.usage,
          rawResult: result
        };
      } else {
        console.log(`❌ Model instance not found for ${model}`);
      }
    }

    // For client-side or when model instance is not available, throw error
    console.error(`❌ Cannot generate text for model: ${model}`);
    throw new Error(`Model not available: ${model}`);

  } catch (error) {
    console.error('AI generation error:', error);
    throw error;
  }
}

// Stream text with Vercel AI SDK
export async function streamAIText({
  model,
  messages,
  maxTokens = 4096,
  temperature = 0.7
}: {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}) {
  try {
    const modelInfo = getModelInfo(model);
    if (!modelInfo) {
      throw new Error(`Model not found: ${model}`);
    }

    const modelInstance = getModel(model);
    if (modelInstance) {
      const result = await streamText({
        model: modelInstance,
        messages: messages as any,
        maxTokens,
        temperature
      });

      return result;
    }

    throw new Error(`Model instance not available for: ${model}`);

  } catch (error) {
    console.error('AI streaming error:', error);
    throw error;
  }
}

// Generate structured object with Vercel AI SDK
export async function generateAIObject({
  model,
  messages,
  schema,
  maxTokens = 4096,
  temperature = 0.7
}: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  schema: z.ZodSchema;
  maxTokens?: number;
  temperature?: number;
}) {
  try {
    const modelInstance = getModel(model);
    
    const result = await generateObject({
      model: modelInstance,
      messages: messages as any,
      schema,
      maxTokens,
      temperature
    });

    return result.object;
  } catch (error) {
    console.error('AI object generation error:', error);
    throw error;
  }
} 