# AI Setup Guide for Qurse

This guide will help you connect your Qurse chatbot to real AI providers.

## Supported AI Models

- **Llama 3.1 70B (Groq)** (Fast AI Inference) - Default model
- **Mixtral 8x7B (Groq)** (Fast AI Inference)
- **Gemma 7B (Groq)** (Fast AI Inference)
- **GPT-4o** (OpenAI)
- **Claude 3.5 Sonnet** (Anthropic)
- **Gemini Pro** (Google)
- **Llama 3.2 3B** (Ollama - Local)

## Environment Variables Setup

Create a `.env.local` file in your project root with the following variables:

```bash
# AI Provider API Keys
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# Ollama Configuration
OLLAMA_URL=http://localhost:11434
```

## Getting API Keys

### 1. OpenAI (GPT-4o)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Add it to `OPENAI_API_KEY`

### 2. Anthropic (Claude 3.5 Sonnet)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Add it to `ANTHROPIC_API_KEY`

### 3. Google (Gemini Pro)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Add it to `GOOGLE_API_KEY`

### 4. Groq (Fast AI Inference)
**Why Groq?** Groq provides ultra-fast AI inference with sub-second response times, making it perfect for real-time chat applications.

**Available Models:**
- **Llama 3.1 70B** - High-quality responses with 8K context
- **Mixtral 8x7B** - Fast inference with 32K context window
- **Gemma 7B** - Efficient and cost-effective

1. Go to [Groq Console](https://console.groq.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Add it to `GROQ_API_KEY`

### 5. Ollama (Llama 3.2 3B - Local)
1. Install Ollama from [ollama.ai](https://ollama.ai/)
2. Pull the Llama 3.2 3B model: `ollama pull llama3.2:3b`
3. Start Ollama service
4. The default URL is `http://localhost:11434`

## How It Works

1. **Model Selection**: Users can select different AI models from the dropdown
2. **API Routing**: Requests are routed through Next.js API routes to respective providers
3. **Fallback**: If API keys are not configured, the app falls back to simulated responses
4. **Error Handling**: Proper error handling for API failures

## API Routes

The following API routes handle different providers:

- `/api/ai/openai` - OpenAI GPT models
- `/api/ai/anthropic` - Anthropic Claude models
- `/api/ai/google` - Google Gemini models
- `/api/ai/groq` - Groq fast inference models
- `/api/ai/ollama` - Local Ollama models

## Testing

1. Start your development server: `npm run dev`
2. Navigate to the conversation page
3. Select a model from the dropdown
4. Send a message
5. If API keys are configured, you'll get real AI responses
6. If not, you'll get simulated responses

## Troubleshooting

### API Key Issues
- Ensure your API keys are correct
- Check that the environment variables are loaded
- Verify API quotas and billing

### Ollama Issues
- Make sure Ollama is running: `ollama serve`
- Check if the model is downloaded: `ollama list`
- Verify the Ollama URL in environment variables

### Network Issues
- Check your internet connection
- Verify firewall settings
- Ensure the API endpoints are accessible

## Security Notes

- Never commit API keys to version control
- Use environment variables for sensitive data
- Consider rate limiting for production use
- Monitor API usage and costs

## Next Steps

1. Configure your preferred AI provider
2. Test the functionality
3. Customize the system prompts
4. Add more models as needed
5. Implement streaming responses for better UX 