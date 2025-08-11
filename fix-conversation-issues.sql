-- =====================================================
-- MIGRATION: Fix conversation and message issues
-- =====================================================

-- 1. Add user_id column to messages table if it doesn't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 2. Update existing messages to set user_id based on conversation owner
UPDATE messages 
SET user_id = conversations.user_id
FROM conversations 
WHERE messages.conversation_id = conversations.id 
  AND messages.user_id IS NULL;

-- 3. Make user_id NOT NULL after populating existing records
ALTER TABLE messages 
ALTER COLUMN user_id SET NOT NULL;

-- 4. Add index for user_id on messages table
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- 5. Drop existing function if it exists, then create the correct one
DROP FUNCTION IF EXISTS get_conversations_with_message_count(UUID);
CREATE OR REPLACE FUNCTION get_conversations_with_message_count(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  model_id UUID,
  model_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  is_archived BOOLEAN,
  is_public BOOLEAN,
  share_token UUID,
  parent_conversation_id UUID,
  branch_from_message_id UUID,
  branch_order INTEGER,
  total_tokens_used INTEGER,
  total_cost DECIMAL,
  metadata JSONB,
  message_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.title,
    c.model_id,
    c.model_name,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    c.is_archived,
    c.is_public,
    c.share_token,
    c.parent_conversation_id,
    c.branch_from_message_id,
    c.branch_order,
    c.total_tokens_used,
    c.total_cost,
    c.metadata,
    COUNT(m.id)::BIGINT as message_count
  FROM conversations c
  LEFT JOIN messages m ON c.id = m.conversation_id
  WHERE c.user_id = user_uuid 
    AND c.parent_conversation_id IS NULL -- Only return main conversations, not branches
    AND c.is_archived = FALSE
  GROUP BY c.id, c.user_id, c.title, c.model_id, c.model_name, c.created_at, c.updated_at, 
           c.last_message_at, c.is_archived, c.is_public, c.share_token, c.parent_conversation_id, 
           c.branch_from_message_id, c.branch_order, c.total_tokens_used, c.total_cost, c.metadata
  ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_conversations_with_message_count(UUID) TO authenticated;

-- 7. Update RLS policies to include user_id check for messages
DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON messages;
CREATE POLICY "Users can insert messages to own conversations" ON messages FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);

-- 8. Add a simple policy for users to view their own messages directly
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (user_id = auth.uid());

SELECT 'Migration completed: Fixed conversation and message issues' as status; 