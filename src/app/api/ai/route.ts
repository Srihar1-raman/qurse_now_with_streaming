import { NextRequest, NextResponse } from 'next/server';
import { generateAIText } from '@/lib/ai-service';
import { streamText } from 'ai';
import { getModel } from '@/lib/ai/service';
import { aiRequestSchema } from '@/lib/validations/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body with Zod
    const validationResult = aiRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const { 
      model, 
      messages, 
      maxTokens, 
      temperature, 
      stream = true
    } = validationResult.data;

    // API request received
    
    if (!model || !messages) {
      return NextResponse.json(
        { error: 'Model and messages are required' },
        { status: 400 }
      );
    }

    // Handle streaming - use Vercel AI SDK's built-in streaming
    if (stream) {
      
      const modelInstance = getModel(model);
      if (!modelInstance) {
        return NextResponse.json(
          { error: `Model not available: ${model}` },
          { status: 400 }
        );
      }

      // Configure streaming for basic chat only
      const streamConfig = {
        model: modelInstance,
        messages: messages,
        maxTokens,
        temperature,
        // Enable streaming of text
        experimental_streamText: true,
        experimental_streamMode: 'text' as const,
        // Enable message parts for streaming
        experimental_streamParts: true,
      };

      const result = await streamText(streamConfig);
      // Return the streaming response using Vercel AI SDK format
      return result.toDataStreamResponse();
    }

    // Use regular generation for chat-only mode
    const result = await generateAIText({
      model,
      messages,
      maxTokens,
      temperature
    });

    // Convert to expected format for frontend
    let formattedResult: {
      choices: Array<{ message: { content: string; role: string } }>;
      model: string;
      usage: unknown;
      rawResult: unknown;
      sources: unknown[];
    };
    
    if ('choices' in result && result.choices) {
      // Result from generateAIText (has choices structure)
      formattedResult = {
        choices: result.choices,
        model: result.model,
        usage: result.usage,
        rawResult: result,
        sources: []
      };
    } else {
      // Fallback format
      formattedResult = {
        choices: [{
          message: {
            content: (result as { content?: string }).content || 'No content available',
            role: 'assistant'
          }
        }],
        model: (result as { model?: string }).model || 'unknown',
        usage: (result as { usage?: unknown }).usage || null,
        rawResult: result,
        sources: []
      };
    }

    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { error: 'AI request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 