// Quick test to verify aggressive web search is working
const fetch = require('node-fetch');

async function quickTest() {
  console.log('🧪 Quick Test: Aggressive Web Search\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/test-aggressive-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Deepseek R1 Distill 70B',
        query: 'What are the latest developments in AI safety?'
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ API call successful!');
      console.log(`📝 Response length: ${result.response.length} characters`);
      
      // Check for search results or tool calls
      if (result.response.includes('SEARCH RESULTS FOR:') || result.rawResult?.steps?.length > 0) {
        console.log('🔍 ✅ WEB SEARCH WAS PERFORMED!');
        console.log('🎉 The aggressive web search is working!');
        
        // Check if tool calls were made
        if (result.rawResult?.steps?.length > 0) {
          console.log('🔧 Tool calls were executed:', result.rawResult.steps.length, 'steps');
        }
      } else {
        console.log('❌ Web search was NOT performed');
        console.log('The response does not contain search results or tool calls');
      }
      
      // Show a snippet
      const snippet = result.response.substring(0, 500);
      console.log(`\n📄 Response snippet:\n${snippet}...`);
      
    } else {
      const error = await response.text();
      console.log('❌ Failed:', response.status, error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

quickTest(); 