-- =====================================================
-- PRODUCTION-READY SUPABASE SETUP FOR AI CHAT APPLICATION
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================================================
-- CORE TABLES (Enhanced)
-- =====================================================

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  subscription_expires_at TIMESTAMPTZ,
  preferences JSONB DEFAULT '{"theme": "auto", "language": "en", "auto_save": true, "default_model": "gpt-4", "max_tokens": 4000, "temperature": 0.7}'::jsonb,
  usage_limits JSONB DEFAULT '{"daily_messages": 100, "daily_conversations": 10, "max_file_size": 10485760}'::jsonb
);

-- AI Models table (for model management)
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google', 'groq', etc.
  model_id TEXT NOT NULL, -- 'gpt-4', 'claude-3-sonnet', etc.
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  supports_images BOOLEAN DEFAULT FALSE,
  supports_functions BOOLEAN DEFAULT FALSE,
  max_tokens INTEGER,
  cost_per_1k_tokens DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table (enhanced)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  model_id UUID REFERENCES ai_models(id),
  model_name TEXT NOT NULL, -- Keep for backward compatibility
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE, -- For sharing conversations
  share_token UUID DEFAULT uuid_generate_v4(), -- For public sharing
  parent_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  branch_from_message_id UUID,
  branch_order INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb -- For custom data
);

-- Messages table (enhanced)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'system', 'function')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tokens_used INTEGER,
  cost DECIMAL(10,6),
  model_used TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_error BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  processing_time_ms INTEGER,
  function_calls JSONB, -- For function calling
  tool_calls JSONB -- For tool usage
);

-- Files table (enhanced)
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_processed BOOLEAN DEFAULT FALSE,
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  extracted_text TEXT, -- For document processing
  vector_embedding VECTOR(1536), -- For semantic search (requires pgvector extension)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- PRODUCTION TABLES
-- =====================================================

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'message_sent', 'conversation_created', 'file_uploaded', etc.
  model_used TEXT,
  tokens_used INTEGER,
  cost DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL, -- 'message', 'conversation', 'file_upload'
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, action_type, window_start)
);

-- API Keys table (for enterprise users)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  permissions JSONB DEFAULT '{}'::jsonb
);

-- Organizations table (for enterprise features)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- Organization members
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Shared conversations (for team collaboration)
CREATE TABLE IF NOT EXISTS shared_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  shared_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  shared_with UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'write', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Prompts library (for reusable prompts)
CREATE TABLE IF NOT EXISTS prompts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR organization_id IS NOT NULL)
);

-- Audit logs (for compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- 'conversation', 'message', 'file', 'user', etc.
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES (Enhanced)
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- AI Models indexes
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_models(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_models_available ON ai_models(is_available);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_conversations_public ON conversations(is_public);
CREATE INDEX IF NOT EXISTS idx_conversations_share_token ON conversations(share_token);
CREATE INDEX IF NOT EXISTS idx_conversations_model ON conversations(model_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_error ON messages(is_error);

-- Files indexes
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_conversation_id ON files(conversation_id);
CREATE INDEX IF NOT EXISTS idx_files_processed ON files(is_processed);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(processing_status);

-- Usage logs indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_action ON usage_logs(action_type);

-- Rate limits indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start, window_end);

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

-- Shared conversations indexes
CREATE INDEX IF NOT EXISTS idx_shared_conv_conversation ON shared_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_shared_conv_shared_with ON shared_conversations(shared_with);
CREATE INDEX IF NOT EXISTS idx_shared_conv_org ON shared_conversations(organization_id);

-- Prompts indexes
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_org_id ON prompts(organization_id);
CREATE INDEX IF NOT EXISTS idx_prompts_public ON prompts(is_public);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON prompts USING GIN(tags);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- =====================================================
-- FUNCTIONS (Enhanced)
-- =====================================================

-- Function to get conversations with enhanced data
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
  FROM conversations c
  LEFT JOIN messages m ON c.id = m.conversation_id
  WHERE c.user_id = user_uuid
  GROUP BY c.id, c.user_id, c.title, c.model_name, c.created_at, c.updated_at, c.last_message_at, c.is_archived, c.is_public, c.share_token, c.parent_conversation_id, c.branch_from_message_id, c.branch_order, c.total_tokens_used, c.total_cost
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user last seen
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET last_seen_at = NOW() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limits
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
  FROM rate_limits
  WHERE user_id = user_uuid 
    AND action_type = check_rate_limit.action_type
    AND window_start >= NOW() - INTERVAL '1 hour' * window_hours;
    
  RETURN current_count < max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log usage
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
  INSERT INTO usage_logs (
    user_id, conversation_id, message_id, action_type, 
    model_used, tokens_used, cost
  ) VALUES (
    user_uuid, conversation_uuid, message_uuid, action_type,
    model_used, tokens_used, cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update conversation stats
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET 
    last_message_at = NOW(),
    total_tokens_used = COALESCE(total_tokens_used, 0) + COALESCE(NEW.tokens_used, 0),
    total_cost = COALESCE(total_cost, 0) + COALESCE(NEW.cost, 0)
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversations with message count
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

-- =====================================================
-- TRIGGERS (Enhanced)
-- =====================================================

-- Update user last seen when they interact
CREATE TRIGGER update_user_last_seen_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_seen();

-- Update conversation stats when messages are added
CREATE TRIGGER update_conversation_stats_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_stats();

-- Update timestamps
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_models_updated_at
  BEFORE UPDATE ON ai_models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (Enhanced)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- AI Models policies (public read, admin write)
CREATE POLICY "Anyone can view active models" ON ai_models FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage models" ON ai_models FOR ALL USING (auth.uid() IN (SELECT user_id FROM organization_members WHERE role IN ('owner', 'admin')));

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view shared conversations" ON conversations FOR SELECT USING (
  is_public = true OR 
  id IN (SELECT conversation_id FROM shared_conversations WHERE shared_with = auth.uid())
);
CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON conversations FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages from own conversations" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can view messages from shared conversations" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c 
    JOIN shared_conversations sc ON c.id = sc.conversation_id 
    WHERE c.id = messages.conversation_id AND sc.shared_with = auth.uid()
  )
);
CREATE POLICY "Users can insert messages to own conversations" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can update messages from own conversations" ON messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can delete messages from own conversations" ON messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);

-- Files policies
CREATE POLICY "Users can view own files" ON files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own files" ON files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own files" ON files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own files" ON files FOR DELETE USING (auth.uid() = user_id);

-- Usage logs policies (users can only see their own)
CREATE POLICY "Users can view own usage logs" ON usage_logs FOR SELECT USING (auth.uid() = user_id);

-- Rate limits policies
CREATE POLICY "Users can view own rate limits" ON rate_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage rate limits" ON rate_limits FOR ALL USING (true);

-- API keys policies
CREATE POLICY "Users can manage own API keys" ON api_keys FOR ALL USING (auth.uid() = user_id);

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations FOR SELECT USING (
  id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage organizations" ON organizations FOR ALL USING (
  id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Organization members policies
CREATE POLICY "Users can view organization members" ON organization_members FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage organization members" ON organization_members FOR ALL USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Shared conversations policies
CREATE POLICY "Users can view shared conversations" ON shared_conversations FOR SELECT USING (
  shared_with = auth.uid() OR 
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own shared conversations" ON shared_conversations FOR ALL USING (
  shared_by = auth.uid()
);

-- Prompts policies
CREATE POLICY "Users can view public prompts" ON prompts FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view own prompts" ON prompts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view organization prompts" ON prompts FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own prompts" ON prompts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can manage organization prompts" ON prompts FOR ALL USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Audit logs policies (read-only for users, full access for admins)
CREATE POLICY "Users can view own audit logs" ON audit_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- =====================================================
-- STORAGE SETUP
-- =====================================================

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for uploads bucket
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample AI models
INSERT INTO ai_models (name, provider, model_id, display_name, description, is_active, supports_images, supports_functions, max_tokens, cost_per_1k_tokens) VALUES
('gpt-4', 'openai', 'gpt-4', 'GPT-4', 'Most capable GPT model for complex tasks', true, false, true, 8192, 0.03),
('gpt-4-turbo', 'openai', 'gpt-4-turbo-preview', 'GPT-4 Turbo', 'Latest GPT-4 model with improved performance', true, true, true, 128000, 0.01),
('gpt-3.5-turbo', 'openai', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Fast and efficient model for most tasks', true, false, true, 4096, 0.002),
('claude-3-sonnet', 'anthropic', 'claude-3-sonnet-20240229', 'Claude 3 Sonnet', 'Balanced performance and speed', true, true, true, 200000, 0.015),
('claude-3-haiku', 'anthropic', 'claude-3-haiku-20240307', 'Claude 3 Haiku', 'Fast and cost-effective model', true, true, false, 200000, 0.00025),
('gemini-pro', 'google', 'gemini-pro', 'Gemini Pro', 'Google''s most capable model', true, true, false, 32768, 0.0005),
('llama-3.1-70b', 'groq', 'llama-3.1-70b', 'Llama 3.1 70B', 'Fast inference with Groq', true, false, false, 8192, 0.0007)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE users IS 'User profiles with subscription and usage tracking';
COMMENT ON TABLE ai_models IS 'Available AI models with pricing and capabilities';
COMMENT ON TABLE conversations IS 'Chat conversations with enhanced metadata and sharing';
COMMENT ON TABLE messages IS 'Messages with token usage and cost tracking';
COMMENT ON TABLE files IS 'User uploaded files with processing status';
COMMENT ON TABLE usage_logs IS 'Detailed usage tracking for billing and analytics';
COMMENT ON TABLE rate_limits IS 'Rate limiting for API endpoints';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access';
COMMENT ON TABLE organizations IS 'Organizations for team collaboration';
COMMENT ON TABLE organization_members IS 'Organization membership and roles';
COMMENT ON TABLE shared_conversations IS 'Conversation sharing between users and teams';
COMMENT ON TABLE prompts IS 'Reusable prompt templates';
COMMENT ON TABLE audit_logs IS 'Audit trail for compliance and security';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

SELECT 'Production database setup complete!' as status; 