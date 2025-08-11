const fetch = require('node-fetch');

async function testResponseExtraction() {
  console.log('🧪 Testing response extraction fix for problematic models...');
  
  const testCases = [
    {
      name: 'Gemma2 9B - Weather Query',
      model: 'Gemma2 9B',
      query: 'What is the weather like in New York today?'
    },
    {
      name: 'Llama 3.3 70B Versatile - News Query',
      model: 'Llama 3.3 70B Versatile',
      query: 'What are the latest news about AI?'
    },
    {
      name: 'Llama 4 Scout 17B - Search Query',
      model: 'Llama 4 Scout 17B',
      query: 'What is the current temperature in Los Angeles?'
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
        const content = result.choices?.[0]?.message?.content;
        
        console.log(`✅ Success for ${testCase.name}`);
        console.log(`📝 Response length: ${content?.length || 0} characters`);
        console.log(`📝 Response preview: ${content?.substring(0, 200)}...`);
        console.log(`🔧 Model used: ${result.model}`);
        
        // Check if response is meaningful
        if (content && content.length > 50 && !content.includes('Response generated successfully')) {
          console.log(`✅ Response looks good - has meaningful content`);
        } else {
          console.log(`⚠️ Response might be incomplete or fallback`);
        }
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
testResponseExtraction().catch(console.error); 