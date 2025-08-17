import { NextRequest, NextResponse } from 'next/server';
import { streamAIText, generateAITextWithTools, generateAIText } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      model, 
      messages, 
      maxTokens, 
      temperature, 
      stream = false, 
      webSearchEnabled = false,
      arxivMode = false,
      customInstructions = null,
      latitude = null,
      longitude = null
    } = body;

    console.log('🔍 API Route received:', {
      model,
      messagesCount: messages?.length,
      webSearchEnabled,
      arxivMode,
      stream
    });
    
    // Validate messages format
    if (messages && Array.isArray(messages)) {
      messages.forEach((msg, index) => {
        if (!msg.role || !msg.content) {
          console.error(`❌ Invalid message at index ${index}:`, msg);
        }
      });
    }

    if (!model || !messages) {
      return NextResponse.json(
        { error: 'Model and messages are required' },
        { status: 400 }
      );
    }

    // If streaming is requested, return a streaming response
    if (stream) {
      const result = await streamAIText({
        model,
        messages,
        maxTokens,
        temperature
      });

      // Convert to readable stream
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.textStream) {
              const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Choose the appropriate function based on web search enabled
    let result;
    if (webSearchEnabled) {
      // Use tool-enabled generation for web search
      result = await generateAITextWithTools({
        model,
        messages,
        maxTokens,
        temperature,
        webSearchEnabled,
        arxivMode,
        customInstructions,
        latitude,
        longitude
      });
    } else {
      // Use regular generation for chat-only mode
      console.log(`🚀 Using generateAIText for chat-only mode: ${model}`);
      result = await generateAIText({
        model,
        messages,
        maxTokens,
        temperature
      });
    }

    // Convert to expected format for frontend
    const formattedResult = {
      choices: [{
        message: {
          content: result.content || result.choices?.[0]?.message?.content || 'No content available',
          role: 'assistant'
        }
      }],
      model: result.model,
      usage: result.usage,
      rawResult: result,
      reasoning: result.reasoning,
      sources: result.sources || []
    };

    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { error: 'AI request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 