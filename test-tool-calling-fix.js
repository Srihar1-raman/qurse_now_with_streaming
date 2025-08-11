const fetch = require('node-fetch');

async function testToolCalling() {
  console.log('🧪 Testing tool calling for non-reasoning models...');
  
  const testCases = [
    {
      name: 'Gemma2 9B (Non-reasoning, supports tools)',
      model: 'Gemma2 9B',
      query: 'What is the current temperature in New York?'
    },
    {
      name: 'Llama3 70B (Non-reasoning, supports tools)',
      model: 'Llama3 70B',
      query: 'What are the latest news about AI?'
    },
    {
      name: 'GPT-4.1 (Non-reasoning, supports tools)',
      model: 'GPT-4.1',
      query: 'What is the weather like today?'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: testCase.model,
          messages: [
            {
              role: 'user',
              content: testCase.query
            }
          ],
          webSearchEnabled: true,
          maxTokens: 2048,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Success for ${testCase.name}`);
        console.log(`📝 Response: ${result.choices?.[0]?.message?.content?.substring(0, 200)}...`);
        console.log(`🔧 Model used: ${result.model}`);
        console.log(`🧠 Reasoning captured: ${result.reasoning ? 'Yes' : 'No'}`);
      } else {
        const error = await response.text();
        console.log(`❌ Failed for ${testCase.name}: ${error}`);
      }
    } catch (error) {
      console.log(`❌ Error for ${testCase.name}: ${error.message}`);
    }
  }
}

// Run the test
testToolCalling().catch(console.error); 