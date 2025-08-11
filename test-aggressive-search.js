// Test script for aggressive web search functionality
// Run with: node test-aggressive-search.js

const testModels = [
  'Deepseek R1 Distill 70B',  // Groq reasoning model
  'Qwen3 32B',                // Groq reasoning model  
  'Grok 3 Mini'               // XAI reasoning model
];

const testQueries = [
  'What are the latest developments in AI safety?',
  'What do experts say about climate change solutions?',
  'What are the current controversies in quantum computing?'
];

async function testAggressiveSearch() {
  console.log('🧪 Testing Aggressive Web Search Implementation\n');
  
  for (const model of testModels) {
    console.log(`\n📋 Testing Model: ${model}`);
    console.log('=' .repeat(50));
    
    for (const query of testQueries) {
      console.log(`\n🔍 Query: ${query}`);
      
      try {
        const response = await fetch('http://localhost:3000/api/test-aggressive-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            query
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Success!');
          console.log(`📝 Response length: ${result.response.length} characters`);
          console.log(`🔍 Raw result keys: ${Object.keys(result.rawResult || {}).join(', ')}`);
          
          // Check if response contains search results
          if (result.response.includes('SEARCH RESULTS FOR:')) {
            console.log('🔍 ✅ Web search was performed!');
          } else {
            console.log('⚠️  Web search may not have been performed');
          }
          
          // Show first 300 characters of response
          const preview = result.response.substring(0, 300);
          console.log(`📄 Preview: ${preview}...`);
        } else {
          const error = await response.text();
          console.log('❌ Failed:', response.status, error);
        }
      } catch (error) {
        console.log('❌ Error:', error.message);
      }
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n🎉 Test completed!');
}

// Run the test
testAggressiveSearch().catch(console.error); 