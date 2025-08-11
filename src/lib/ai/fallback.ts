import { AIResponse } from '@/types/ai';

// Simple fallback service for when AI API is unavailable
class AIService {
  async simulateResponse(modelName: string, userMessage: string): Promise<AIResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    return {
      content: `Simulated response from ${modelName} for: ${userMessage}`,
      model: modelName,
    };
  }
}

export const aiService = new AIService(); 