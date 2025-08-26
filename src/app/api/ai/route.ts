import { NextRequest, NextResponse } from 'next/server';
import { streamAIText, generateAITextWithTools, generateAIText } from '@/lib/ai-service';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getModel } from '@/lib/ai/service';
import { aggressiveWebSearchTool, arxivTool } from '@/lib/tools';
import { performExaSearch } from '@/lib/exa-service';
import { getModelInfo } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      model, 
      messages, 
      maxTokens, 
      temperature, 
      stream = true, 
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
          return NextResponse.json(
            { error: `Invalid message at index ${index}` },
            { status: 400 }
          );
        }
      });
    }

    if (!model || !messages) {
      return NextResponse.json(
        { error: 'Model and messages are required' },
        { status: 400 }
      );
    }

    // Handle streaming - use Vercel AI SDK's built-in streaming
    console.log('🔍 Stream parameter:', stream, typeof stream);
    console.log('🔍 All body params:', JSON.stringify(body, null, 2));
    if (stream) {
      console.log('🚀 Using streaming mode with Vercel AI SDK');
      
      const modelInstance = getModel(model);
      if (!modelInstance) {
        return NextResponse.json(
          { error: `Model not available: ${model}` },
          { status: 400 }
        );
      }

      // Configure streaming
      let processedMessages = messages as any;
      
      // Add system instruction for web search when tools are enabled
      if (webSearchEnabled) {
        const systemMessage = {
          role: 'system',
          content: `You have access to web search tools. When a user asks a question that would benefit from current information:

1. First, think out loud about what you need to search for
2. Use the search tool to get current information
3. Think through the search results as you receive them
4. Provide a comprehensive answer based on the search results

Always stream your thinking process and reasoning. Don't just execute tools silently - let the user see your thought process throughout the entire response.`
        };
        
        // Check if there's already a system message
        const hasSystemMessage = processedMessages.some((msg: any) => msg.role === 'system');
        if (!hasSystemMessage) {
          processedMessages = [systemMessage, ...processedMessages];
        }
      }
      
      const streamConfig: any = {
        model: modelInstance,
        messages: processedMessages,
        maxTokens,
        temperature,
        // Enable streaming of reasoning and intermediate thoughts
        experimental_streamText: true,
        experimental_streamMode: 'text-and-tool-calls',
      };
      
      // Add tools support using imported tools (consistent with scira-main)
      if (webSearchEnabled) {
        streamConfig.tools = arxivMode ? {
          arxiv_search: arxivTool
        } : {
          aggressive_web_search: aggressiveWebSearchTool
        };
        
        // Add tool execution configuration for streaming with reasoning visibility
        streamConfig.maxSteps = 5; // Allow multiple tool calls
        
        // Important: Enable streaming of intermediate text during tool execution
        streamConfig.experimental_continueSteps = true;
        
        streamConfig.onStepFinish = (step: any) => {
          console.log('🔧 Tool step finished:', step.stepType, step.toolCalls?.length || 0, 'tool calls');
          if (step.toolResults) {
            console.log('🔧 Tool results available:', step.toolResults.length, 'results');
          }
          if (step.text) {
            console.log('🔧 Step text length:', step.text.length);
          }
        };
        
        streamConfig.onFinish = (result: any) => {
          console.log('🔧 Stream finished with tools:', {
            finishReason: result.finishReason,
            usage: result.usage,
            steps: result.steps?.length || 0,
            text: result.text?.length || 0
          });
        };
        
        console.log(`🔧 Tools enabled: ${arxivMode ? 'arXiv search' : 'Exa web search'}`);
      }

      console.log('🔧 StreamText config:', {
        model: modelInstance.constructor.name,
        messagesCount: messages.length,
        hasTools: !!streamConfig.tools,
        toolNames: streamConfig.tools ? Object.keys(streamConfig.tools) : [],
        maxSteps: streamConfig.maxSteps
      });

      const result = await streamText(streamConfig);

      console.log('✅ StreamText result created, returning data stream response');
      // Return the streaming response using Vercel AI SDK format
      return result.toDataStreamResponse();
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
    // Handle different result formats from generateAITextWithTools vs generateAIText
    let formattedResult;
    
    if ('choices' in result && result.choices) {
      // Result from generateAIText (has choices structure)
      formattedResult = {
        choices: result.choices,
        model: result.model,
        usage: result.usage,
        rawResult: result,

        sources: (result as any).sources || []
      };
    } else {
      // Result from generateAITextWithTools (has content structure)
      formattedResult = {
        choices: [{
          message: {
            content: (result as any).content || 'No content available',
            role: 'assistant'
          }
        }],
        model: result.model,
        usage: result.usage,
        rawResult: result,

        sources: (result as any).sources || []
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