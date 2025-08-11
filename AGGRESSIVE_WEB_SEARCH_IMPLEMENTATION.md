# Aggressive Web Search Implementation - Proof of Concept

## Overview

This implementation provides an aggressive web search approach for reasoning models (DeepSeek, Qwen, and Grok3Mini) where the system prompt forces the model to:

1. **Always run web search first** when the toggle is enabled
2. **Run multiple search variations** to get comprehensive coverage
3. **Ask follow-up questions** to gather more information
4. **Only then provide reasoning and answer**

## Supported Models

### Reasoning Models with Web Search Support:
- **DeepSeek R1 Distill 70B** (Groq)
- **Qwen3 32B** (Groq)  
- **Grok 3 Mini** (XAI)

## Implementation Details

### 1. Tool-Based Architecture

**File: `src/lib/web-search-tools.ts`**
- `webSearchTool()`: Tool function that reasoning models can call
- `generateSearchVariations()`: Creates multiple search queries for comprehensive coverage
- `generateFollowUpQuestions()`: Generates probing questions for search results
- `getAggressiveWebSearchPrompt()`: System prompt that forces aggressive search behavior

### 2. Enhanced AI Service

**File: `src/lib/ai-service.ts`**
- `generateAITextWithTools()`: New function that supports tool calling
- Enhanced `AIService.chat()`: Now accepts `webSearchEnabled` parameter
- Automatic detection of reasoning models and web search toggle

### 3. API Integration

**File: `src/app/api/ai/route.ts`**
- Updated to support `webSearchEnabled` parameter
- Routes to appropriate generation method based on model and settings

**File: `src/app/api/test-aggressive-search/route.ts`**
- Test endpoint for verifying the implementation

### 4. Frontend Integration

**File: `src/app/conversation/page.tsx`**
- Updated to pass `webSearchEnabled` flag to AI service
- Removed old web search pre-processing
- Now uses tool-based approach for reasoning models

## How It Works

### When Web Search is Enabled:

1. **System Prompt Injection**: The aggressive system prompt is injected for reasoning models
2. **Forced Search Protocol**: Model is instructed to ALWAYS search first
3. **Multiple Queries**: Model generates variations like:
   - Original query
   - "latest" variations
   - "expert analysis" variations  
   - "research" variations
   - "controversy" variations
   - Current year variations
4. **Follow-up Questions**: Model asks probing questions for each result
5. **Reasoning**: Model synthesizes all findings and provides reasoned answer

### Example System Prompt:
```
CRITICAL: Web search is enabled. You MUST follow this protocol:

1. IMMEDIATELY run web_search() with the user's query
2. Generate 3-5 different search variations to get comprehensive coverage
3. For each search result, ask 2-3 follow-up questions to dig deeper
4. Only after gathering all search data, provide your reasoning and answer

DO NOT answer directly. ALWAYS search first when web search is enabled.
```

## Testing

### Test Script
Run the test script to verify functionality:
```bash
node test-aggressive-search.js
```

### Manual Testing
1. Start the development server
2. Go to conversation page
3. Select a reasoning model (DeepSeek, Qwen, or Grok3Mini)
4. Toggle web search ON
5. Ask a question that requires current information
6. Observe the model's aggressive search behavior

## Benefits

1. **Comprehensive Coverage**: Multiple search angles catch different aspects
2. **Depth Through Questions**: Follow-up questions reveal nuances
3. **Forced Thoroughness**: Model can't skip the search step
4. **Better Reasoning**: More data leads to better analysis
5. **Intelligent Search**: Model decides what to search for, not blind pre-processing

## Limitations

1. **API Costs**: Multiple searches per query increase costs
2. **Rate Limiting**: Need to handle API limits for multiple searches
3. **Response Time**: More searches mean longer response times
4. **Tool Calling**: Currently uses enhanced system prompts rather than full tool calling

## Future Enhancements

1. **Full Tool Calling**: Implement actual tool calling API integration
2. **Search Optimization**: Smart query generation based on topic
3. **Result Caching**: Cache search results to reduce API calls
4. **Progress Indicators**: Show search progress to users
5. **Search Analytics**: Track what searches were performed

## Configuration

The implementation automatically detects:
- Reasoning models (via `reasoningModel: true` flag)
- Web search toggle state
- Model provider (Groq vs XAI)

No additional configuration required beyond the existing model definitions. 