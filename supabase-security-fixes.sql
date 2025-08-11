-- =====================================================
-- SECURITY FIXES FOR SUPABASE SETUP
-- =====================================================
-- Run this to fix the security warnings

-- Fix 1: Add explicit search paths to all functions
CREATE OR REPLACE FUNCTION get_conversations_with_stats(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
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
  total_cost DECIMAL(10,6),
  message_count BIGINT,
  total_messages BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.title,
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
    COUNT(m.id)::BIGINT as message_count,
    COUNT(*) OVER() as total_messages
  FROM public.conversations c
  LEFT JOIN public.messages m ON c.id = m.conversation_id
  WHERE c.user_id = user_uuid
  GROUP BY c.id, c.user_id, c.title, c.model_name, c.created_at, c.updated_at, c.last_message_at, c.is_archived, c.is_public, c.share_token, c.parent_conversation_id, c.branch_from_message_id, c.branch_order, c.total_tokens_used, c.total_cost
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: Update user last seen function
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users SET last_seen_at = NOW() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 3: Rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  user_uuid UUID,
  action_type TEXT,
  max_count INTEGER,
  window_hours INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(count), 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = user_uuid 
    AND action_type = check_rate_limit.action_type
    AND window_start >= NOW() - INTERVAL '1 hour' * window_hours;
    
  RETURN current_count < max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 4: Usage logging function
CREATE OR REPLACE FUNCTION log_usage(
  user_uuid UUID,
  action_type TEXT,
  conversation_uuid UUID DEFAULT NULL,
  message_uuid UUID DEFAULT NULL,
  model_used TEXT DEFAULT NULL,
  tokens_used INTEGER DEFAULT NULL,
  cost DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.usage_logs (
    user_id, conversation_id, message_id, action_type, 
    model_used, tokens_used, cost
  ) VALUES (
    user_uuid, conversation_uuid, message_uuid, action_type,
    model_used, tokens_used, cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 5: Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 6: Conversation stats function
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET 
    last_message_at = NOW(),
    total_tokens_used = COALESCE(total_tokens_used, 0) + COALESCE(NEW.tokens_used, 0),
    total_cost = COALESCE(total_cost, 0) + COALESCE(NEW.cost, 0)
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 7: Move vector extension to a dedicated schema (optional)
-- Note: This is optional and may not be necessary for most use cases
-- The extension in public schema warning is often acceptable for vector operations

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if functions now have explicit search paths
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname IN (
  'get_conversations_with_stats',
  'update_user_last_seen',
  'check_rate_limit', 
  'log_usage',
  'update_updated_at_column',
  'update_conversation_stats'
);

SELECT 'Security fixes applied successfully!' as status; 