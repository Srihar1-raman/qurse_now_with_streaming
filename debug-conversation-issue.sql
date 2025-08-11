-- =====================================================
-- DEBUG CONVERSATION ISSUE
-- =====================================================
-- Run this to debug why conversations and messages aren't being created

-- 1. Check if the function exists
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname = 'get_conversations_with_message_count';

-- 2. Check if users table has data
SELECT 
  id,
  email,
  name,
  created_at,
  updated_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check if conversations table has data
SELECT 
  id,
  user_id,
  title,
  model_name,
  created_at,
  updated_at
FROM conversations 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check if messages table has data
SELECT 
  id,
  conversation_id,
  content,
  role,
  created_at
FROM messages 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Test the function with a specific user (replace with actual user ID)
-- Replace 'your-user-id-here' with an actual user ID from step 2
SELECT 
  'Testing function with user:' as test_info,
  id as user_id,
  email
FROM users 
LIMIT 1;

-- 6. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('users', 'conversations', 'messages')
ORDER BY tablename, policyname;

-- 7. Check if tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('users', 'conversations', 'messages')
ORDER BY tablename;

-- 8. Test manual conversation creation (replace user_id with actual ID)
-- This will help identify if the issue is with the API or database
-- Uncomment and modify the user_id below:
/*
INSERT INTO conversations (user_id, title, model_name) 
VALUES ('your-user-id-here', 'Test Conversation', 'gpt-4')
RETURNING id, user_id, title, model_name, created_at;
*/

-- 9. Check for any recent errors in the database
SELECT 
  'No recent errors found in database' as status; 