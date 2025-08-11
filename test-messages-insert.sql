-- =====================================================
-- TEST MESSAGES INSERT AND RLS POLICIES
-- =====================================================

-- Check if RLS is enabled on messages table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'messages';

-- Check existing RLS policies on messages table
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
WHERE tablename = 'messages';

-- Test direct insert (this should work if RLS is properly configured)
-- First, get a conversation ID to test with
SELECT id, title FROM conversations LIMIT 1;

-- If you have a conversation, try this (replace CONVERSATION_ID with actual ID):
-- INSERT INTO messages (conversation_id, content, role) 
-- VALUES ('CONVERSATION_ID', 'Test message', 'user')
-- RETURNING *;

-- Check if there are any triggers on messages table that might be causing issues
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'messages';

-- Check messages table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages'
ORDER BY ordinal_position; 