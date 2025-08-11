// Comprehensive test for proper tool calling implementation
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testToolCalling() {
  console.log('🧪 Testing Proper Tool Calling Implementation\n');
  
  const testCases = [
    {
      model: 'Deepseek R1 Distill 70B',
      query: 'What are the latest developments in AI safety?',
      expected: 'tool calls'
    },
    {
      model: 'Qwen3 32B', 
      query: 'What do experts say about climate change solutions?',
      expected: 'tool calls'
    },
    {
      model: 'Grok 3 Mini',
      query: 'What are the current controversies in quantum computing?',
      expected: 'tool calls'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.model}`);
    console.log(`🔍 Query: ${testCase.query}`);
    console.log('=' .repeat(60));
    
    try {
      const response = await fetch('http://localhost:3000/api/test-aggressive-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: testCase.model,
          query: testCase.query
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ API call successful!');
        console.log(`📝 Response length: ${result.response.length} characters`);
        
        // Check for tool calls in the result
        const hasToolCalls = result.rawResult?.steps?.length > 0;
        const hasSearchResults = result.response.includes('SEARCH RESULTS FOR:');
        const hasThinkTags = result.response.includes('<think>');
        
        console.log(`🔧 Tool calls executed: ${hasToolCalls ? 'YES' : 'NO'}`);
        console.log(`🔍 Search results found: ${hasSearchResults ? 'YES' : 'NO'}`);
        console.log(`🧠 Reasoning tags found: ${hasThinkTags ? 'YES' : 'NO'}`);
        
        if (hasToolCalls) {
          console.log('🎉 PROPER TOOL CALLING IS WORKING!');
          console.log(`📊 Tool execution steps: ${result.rawResult.steps.length}`);
          
          // Show tool call details
          result.rawResult.steps.forEach((step, index) => {
            if (step.toolCalls?.length > 0) {
              console.log(`  Step ${index + 1}: ${step.toolCalls.length} tool calls`);
              step.toolCalls.forEach(toolCall => {
                console.log(`    - Tool: ${toolCall.toolName}`);
                console.log(`    - Args: ${JSON.stringify(toolCall.args)}`);
              });
            }
          });
        } else if (hasSearchResults) {
          console.log('⚠️  Search performed but no tool calls detected');
        } else {
          console.log('❌ No tool calls or search results detected');
        }
        
        // Show response preview
        const preview = result.response.substring(0, 400);
        console.log(`\n📄 Response preview:\n${preview}...`);
        
      } else {
        const error = await response.text();
        console.log('❌ Failed:', response.status, error);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n🎉 Tool calling test completed!');
}

// Run the test
testToolCalling().catch(console.error); 