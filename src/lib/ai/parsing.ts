import { ParsedResponse } from '@/types/ai';

// New reasoning response parser that handles different model formats
export function parseReasoningResponse(content: string, modelName?: string, rawResponse?: any): ParsedResponse {
  console.log(`🔍 Parsing reasoning for model: ${modelName}`);
  console.log(`📄 Content length: ${content?.length || 0}`);
  console.log(`🔧 Raw response keys:`, rawResponse ? Object.keys(rawResponse) : 'undefined');
  
  if (!content || typeof content !== 'string') {
    return {
      finalAnswer: content || '',
      hasReasoning: false
    };
  }

  // Normalize content - remove extra whitespace and normalize line breaks
  const normalizedContent = content.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // PATTERN 1: XAI models with Vercel AI SDK format
  if (modelName && (modelName.includes('grok') || modelName.includes('xai')) && rawResponse) {
    console.log(`🔍 Checking XAI reasoning patterns for ${modelName}`);
    
    // Check Vercel AI SDK specific fields for XAI models
    if (rawResponse.reasoning && rawResponse.reasoning.trim()) {
      console.log(`✅ Found reasoning in rawResponse.reasoning`);
      return {
        reasoning: rawResponse.reasoning.trim(),
        finalAnswer: normalizedContent,
        hasReasoning: true
      };
    }
    
    // Check steps array for reasoning
    if (rawResponse.steps && rawResponse.steps[0] && rawResponse.steps[0].reasoning && rawResponse.steps[0].reasoning.trim()) {
      console.log(`✅ Found reasoning in rawResponse.steps[0].reasoning`);
      return {
        reasoning: rawResponse.steps[0].reasoning.trim(),
        finalAnswer: normalizedContent,
        hasReasoning: true
      };
    }
    
    // Check original XAI API response structure
    if (rawResponse.response && rawResponse.response.body && rawResponse.response.body.choices && rawResponse.response.body.choices[0] && rawResponse.response.body.choices[0].message) {
      const message = rawResponse.response.body.choices[0].message;
      
      if (message.reasoning_content && message.reasoning_content.trim()) {
        console.log(`✅ Found reasoning in message.reasoning_content`);
        return {
          reasoning: message.reasoning_content.trim(),
          finalAnswer: normalizedContent,
          hasReasoning: true
        };
      }
    }
    
    // Check for the new API route structure
    if (rawResponse.rawResult && rawResponse.rawResult.steps && rawResponse.rawResult.steps[0]) {
      const step = rawResponse.rawResult.steps[0];
      console.log(`🔍 Checking rawResult.steps[0]:`, step);
      
      if (step.reasoning && step.reasoning.trim()) {
        console.log(`✅ Found reasoning in rawResult.steps[0].reasoning`);
        return {
          reasoning: step.reasoning.trim(),
          finalAnswer: normalizedContent,
          hasReasoning: true
        };
      }
      
      if (step.reasoningDetails && step.reasoningDetails.length > 0) {
        console.log(`✅ Found reasoning in rawResult.steps[0].reasoningDetails`);
        const reasoning = step.reasoningDetails.map((detail: any) => detail.text).join('\n\n');
        return {
          reasoning: reasoning.trim(),
          finalAnswer: normalizedContent,
          hasReasoning: true
        };
      }
    }
    
    console.log(`❌ No reasoning found in XAI response structure`);
  }
  
  // PATTERN 2: Groq models with <think> tags (Deepseek, Qwen, etc.)
  const thinkMatch = normalizedContent.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch && thinkMatch[1] && thinkMatch[1].trim()) {
    const reasoning = thinkMatch[1].trim();
    const finalAnswer = normalizedContent.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    
    return {
      reasoning,
      finalAnswer: finalAnswer || 'Response complete.',
      hasReasoning: true
    };
  }
  
  // PATTERN 3: Alternative <thinking> tags
  const thinkingMatch = normalizedContent.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (thinkingMatch && thinkingMatch[1] && thinkingMatch[1].trim()) {
    const reasoning = thinkingMatch[1].trim();
    const finalAnswer = normalizedContent.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim();
    
    return {
      reasoning,
      finalAnswer: finalAnswer || 'Response complete.',
      hasReasoning: true
    };
  }
  
  // PATTERN 4: Step-by-step reasoning without tags (fallback)
  const stepPattern = /(?:^|\n)(?:\d+\.|\*\*[^*]+\*\*|Step\s+\d+)[\s\S]*?(?=\n\n|\n\*\*Final Answer\*\*|\n\*\*Answer\*\*|$)/i;
  const stepMatch = normalizedContent.match(stepPattern);
  if (stepMatch && stepMatch[0] && stepMatch[0].trim()) {
    const reasoning = stepMatch[0].trim();
    const finalAnswer = normalizedContent.replace(stepPattern, '').trim();
    
    return {
      reasoning,
      finalAnswer: finalAnswer || 'Response complete.',
      hasReasoning: true
    };
  }
  
  // PATTERN 5: Captured reasoning from onFinish callback
  if (rawResponse?.reasoning && rawResponse.reasoning.combinedReasoning) {
    console.log(`✅ Found captured reasoning from onFinish callback`);
    return {
      reasoning: rawResponse.reasoning.combinedReasoning,
      finalAnswer: normalizedContent,
      hasReasoning: true
    };
  }
  
  // FALLBACK: No reasoning pattern found
  return {
    finalAnswer: normalizedContent,
    hasReasoning: false
  };
} 