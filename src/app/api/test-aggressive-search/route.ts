import { NextRequest, NextResponse } from 'next/server';
import { generateAITextWithTools } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, query } = body;

    if (!model || !query) {
      return NextResponse.json(
        { error: 'Model and query are required' },
        { status: 400 }
      );
    }

    // Test the aggressive web search with reasoning models
    const messages = [
      { role: 'user' as const, content: query }
    ];

    console.log(`🧪 Testing aggressive web search with model: ${model}`);
    console.log(`🔍 Query: ${query}`);

    const result = await generateAITextWithTools({
      model,
      messages,
      maxTokens: 8192,
      temperature: 0.7,
      webSearchEnabled: true
    });

    // Handle different result formats
    let responseContent;
    if ('choices' in result && result.choices) {
      responseContent = result.choices[0].message.content;
    } else {
      responseContent = (result as any).content;
    }

    return NextResponse.json({
      success: true,
      model,
      query,
      response: responseContent,
      rawResult: result
    });

  } catch (error) {
    console.error('Test aggressive search error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 