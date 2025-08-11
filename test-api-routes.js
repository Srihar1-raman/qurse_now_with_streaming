// =====================================================
// TEST API ROUTES
// =====================================================
// Run this in browser console to test API routes

// Test 1: Check if user is authenticated
async function testAuth() {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();
    console.log('Auth test:', response.status, data);
    return response.ok;
  } catch (error) {
    console.error('Auth test failed:', error);
    return false;
  }
}

// Test 2: Get conversations
async function testGetConversations() {
  try {
    const response = await fetch('/api/conversations');
    const data = await response.json();
    console.log('Get conversations test:', response.status, data);
    return response.ok;
  } catch (error) {
    console.error('Get conversations test failed:', error);
    return false;
  }
}

// Test 3: Create a test conversation
async function testCreateConversation() {
  try {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Conversation',
        model: 'gpt-4',
        initialMessage: 'Hello, this is a test message'
      })
    });
    const data = await response.json();
    console.log('Create conversation test:', response.status, data);
    return { ok: response.ok, data };
  } catch (error) {
    console.error('Create conversation test failed:', error);
    return { ok: false, error };
  }
}

// Test 4: Add a message to conversation
async function testAddMessage(conversationId) {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'This is a test message',
        role: 'user'
      })
    });
    const data = await response.json();
    console.log('Add message test:', response.status, data);
    return response.ok;
  } catch (error) {
    console.error('Add message test failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('=== Starting API Tests ===');
  
  // Test 1: Auth
  const authOk = await testAuth();
  if (!authOk) {
    console.error('❌ Auth failed - user not authenticated');
    return;
  }
  console.log('✅ Auth passed');
  
  // Test 2: Get conversations
  const getConvOk = await testGetConversations();
  console.log(getConvOk ? '✅ Get conversations passed' : '❌ Get conversations failed');
  
  // Test 3: Create conversation
  const createResult = await testCreateConversation();
  if (createResult.ok && createResult.data?.conversation?.id) {
    console.log('✅ Create conversation passed');
    
    // Test 4: Add message
    const addMsgOk = await testAddMessage(createResult.data.conversation.id);
    console.log(addMsgOk ? '✅ Add message passed' : '❌ Add message failed');
  } else {
    console.log('❌ Create conversation failed');
  }
  
  console.log('=== API Tests Complete ===');
}

// Run tests when this script is executed
runAllTests(); 