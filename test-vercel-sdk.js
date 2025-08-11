import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize providers
const groqProvider = createGroq({
  apiKey: process.env.GROQ_API_KEY
});

const xaiProvider = createXai({
  apiKey: process.env.XAI_API_KEY
});

const providers = {
  openai: openai,
  anthropic: anthropic,
  google: google,
  xai: xaiProvider,
  groq: groqProvider,
};

async function testModel(modelName, providerName, modelId) {
  console.log(`\n🧪 Testing ${modelName} (${providerName})...`);
  console.log('='.repeat(50));
  
  try {
    const provider = providers[providerName];
    const model = provider(modelId);
    
    const result = await generateText({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant with advanced reasoning capabilities. When responding to questions or problems, please show your step-by-step reasoning process and provide a clear final answer.'
        },
        {
          role: 'user',
          content: 'What is the HCF of 55 and 65?'
        }
      ],
      maxTokens: 1000,
      temperature: 0.7
    });

    console.log('📝 Raw Response:');
    console.log(result.text);
    console.log('\n📊 Response Object:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error(`❌ Error testing ${modelName}:`, error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing Vercel AI SDK with different models...\n');
  
  // Test XAI models first (we know these work)
  await testModel('Grok 3 Mini', 'xai', 'grok-3-mini');
  await testModel('Grok 4', 'xai', 'grok-4-0709');
  
  // Test Groq models with proper API key
  console.log('\n🔑 Testing Groq models with API key:', process.env.GROQ_API_KEY?.substring(0, 10) + '...');
  await testModel('Deepseek R1 Distill 70B', 'groq', 'deepseek-r1-distill-llama-70b');
  await testModel('Qwen3 32B', 'groq', 'qwen/qwen3-32b');
}

runTests().catch(console.error); 