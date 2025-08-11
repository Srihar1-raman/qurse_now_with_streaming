// Simple test for basic tool calling
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testSimpleTool() {
  console.log('🧪 Testing Simple Tool Calling\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/test-aggressive-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Grok 3 Mini',
        query: 'What are the latest developments in AI safety research?'
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ API call successful!');
      console.log(`📝 Response length: ${result.response.length} characters`);
      
      // Check the raw result structure
      console.log('\n🔍 Raw result structure:');
      console.log('Keys:', Object.keys(result.rawResult || {}));
      console.log('Raw result:', JSON.stringify(result.rawResult, null, 2));
      
      if (result.rawResult?.steps) {
        console.log('Steps:', result.rawResult.steps.length);
        result.rawResult.steps.forEach((step, index) => {
          console.log(`  Step ${index + 1}:`, step);
        });
      }
      
      // Show full response for debugging
      console.log('\n📄 Full response:');
      console.log(result.response);
      
    } else {
      const error = await response.text();
      console.log('❌ Failed:', response.status, error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testSimpleTool(); 