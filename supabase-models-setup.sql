-- =====================================================
-- AI MODELS SETUP FOR QURSE CHAT APPLICATION
-- =====================================================
-- Populate the ai_models table with your specific models

-- Clear existing models (optional - remove if you want to keep existing ones)
-- DELETE FROM ai_models;

-- =====================================================
-- GROQ MODELS
-- =====================================================

INSERT INTO ai_models (name, provider, model_id, display_name, description, is_active, is_available, supports_images, supports_functions, max_tokens, cost_per_1k_tokens) VALUES
-- GROQ Models
('deepseek-r1-distill-llama-70b', 'groq', 'deepseek-r1-distill-llama-70b', 'DeepSeek R1 Distill Llama 70B', 'Fast and efficient 70B parameter model optimized for speed', true, true, false, false, 32768, 0.0007),
('qwen3-32b', 'groq', 'qwen/qwen3-32b', 'Qwen 3 32B', 'Alibaba Cloud''s Qwen 3 model with 32B parameters', true, true, false, false, 32768, 0.0005),
('gemma2-9b-it', 'groq', 'gemma2-9b-it', 'Gemma 2 9B IT', 'Google''s Gemma 2 9B instruction-tuned model', true, true, false, false, 8192, 0.0003),
('llama3-70b-8192', 'groq', 'llama3-70b-8192', 'Llama 3 70B 8K', 'Meta''s Llama 3 70B model with 8K context', true, true, false, false, 8192, 0.0007),
('kimi-k2-instruct', 'groq', 'moonshotai/kimi-k2-instruct', 'Kimi K2 Instruct', 'Moonshot AI''s Kimi K2 instruction-tuned model', true, true, false, false, 32768, 0.0006),
('mistral-saba-24b', 'groq', 'mistral-saba-24b', 'Mistral Saba 24B', 'Mistral AI''s Saba 24B parameter model', true, true, false, false, 32768, 0.0004),
('llama-3.3-70b-versatile', 'groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B Versatile', 'Meta''s latest Llama 3.3 70B versatile model', true, true, false, false, 32768, 0.0008),
('llama-4-scout-17b', 'groq', 'meta-llama/llama-4-scout-17b-16e-instruct', 'Llama 4 Scout 17B', 'Meta''s Llama 4 Scout 17B instruction model', true, true, false, false, 32768, 0.0004)

ON CONFLICT (name) DO UPDATE SET
  model_id = EXCLUDED.model_id,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  is_available = EXCLUDED.is_available,
  supports_images = EXCLUDED.supports_images,
  supports_functions = EXCLUDED.supports_functions,
  max_tokens = EXCLUDED.max_tokens,
  cost_per_1k_tokens = EXCLUDED.cost_per_1k_tokens,
  updated_at = NOW();

-- =====================================================
-- XAI (X.AI) MODELS
-- =====================================================

INSERT INTO ai_models (name, provider, model_id, display_name, description, is_active, is_available, supports_images, supports_functions, max_tokens, cost_per_1k_tokens) VALUES
-- XAI Models
('grok-3-mini', 'xai', 'grok-3-mini', 'Grok 3 Mini', 'X.AI''s Grok 3 Mini model for fast responses', true, true, false, false, 8192, 0.001),
('grok-2-vision-1212', 'xai', 'grok-2-vision-1212', 'Grok 2 Vision 1212', 'X.AI''s Grok 2 Vision model with image input support', true, true, true, false, 32768, 0.002),
('grok-3', 'xai', 'grok-3', 'Grok 3', 'X.AI''s flagship Grok 3 model', true, true, false, false, 32768, 0.003),
('grok-4-0709', 'xai', 'grok-4-0709', 'Grok 4 0709', 'X.AI''s latest Grok 4 model from July 2024', true, true, false, false, 32768, 0.004)

ON CONFLICT (name) DO UPDATE SET
  model_id = EXCLUDED.model_id,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  is_available = EXCLUDED.is_available,
  supports_images = EXCLUDED.supports_images,
  supports_functions = EXCLUDED.supports_functions,
  max_tokens = EXCLUDED.max_tokens,
  cost_per_1k_tokens = EXCLUDED.cost_per_1k_tokens,
  updated_at = NOW();

-- =====================================================
-- OPENAI MODELS
-- =====================================================

INSERT INTO ai_models (name, provider, model_id, display_name, description, is_active, is_available, supports_images, supports_functions, max_tokens, cost_per_1k_tokens) VALUES
-- OpenAI Models
('o4-mini-2025-04-16', 'openai', 'o4-mini-2025-04-16', 'O4 Mini (2025-04-16)', 'OpenAI''s O4 Mini model with image input support', true, true, true, true, 128000, 0.005),
('gpt-4.1-2025-04-14', 'openai', 'gpt-4.1-2025-04-14', 'GPT-4.1 (2025-04-14)', 'OpenAI''s GPT-4.1 model with image input support', true, true, true, true, 128000, 0.01)

ON CONFLICT (name) DO UPDATE SET
  model_id = EXCLUDED.model_id,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  is_available = EXCLUDED.is_available,
  supports_images = EXCLUDED.supports_images,
  supports_functions = EXCLUDED.supports_functions,
  max_tokens = EXCLUDED.max_tokens,
  cost_per_1k_tokens = EXCLUDED.cost_per_1k_tokens,
  updated_at = NOW();

-- =====================================================
-- ANTHROPIC MODELS
-- =====================================================

INSERT INTO ai_models (name, provider, model_id, display_name, description, is_active, is_available, supports_images, supports_functions, max_tokens, cost_per_1k_tokens) VALUES
-- Anthropic Models
('claude-sonnet-4-20250514', 'anthropic', 'claude-sonnet-4-20250514', 'Claude Sonnet 4 (2025-05-14)', 'Anthropic''s Claude Sonnet 4 model', true, true, false, true, 200000, 0.015),
('claude-3-haiku-20240307', 'anthropic', 'claude-3-haiku-20240307', 'Claude 3 Haiku (2024-03-07)', 'Anthropic''s fast and cost-effective Claude 3 Haiku model', true, true, true, false, 200000, 0.00025)

ON CONFLICT (name) DO UPDATE SET
  model_id = EXCLUDED.model_id,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  is_available = EXCLUDED.is_available,
  supports_images = EXCLUDED.supports_images,
  supports_functions = EXCLUDED.supports_functions,
  max_tokens = EXCLUDED.max_tokens,
  cost_per_1k_tokens = EXCLUDED.cost_per_1k_tokens,
  updated_at = NOW();

-- =====================================================
-- ADD MISSING COLUMNS
-- =====================================================

-- Add metadata column if it doesn't exist
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- =====================================================
-- MODEL CATEGORIES AND TAGS
-- =====================================================

-- Add metadata for model categorization
UPDATE ai_models SET metadata = jsonb_build_object(
  'category', 
  CASE 
    WHEN provider = 'groq' THEN 'fast-inference'
    WHEN provider = 'xai' THEN 'conversational'
    WHEN provider = 'openai' THEN 'premium'
    WHEN provider = 'anthropic' THEN 'reliable'
  END,
  'tags', 
  CASE 
    WHEN name IN ('deepseek-r1-distill-llama-70b', 'qwen3-32b', 'grok-3', 'grok-4-0709', 'grok-3-mini', 'o4-mini-2025-04-16', 'claude-sonnet-4-20250514') THEN 
      CASE 
        WHEN supports_images THEN ARRAY['reasoning', 'vision', 'multimodal']
        WHEN supports_functions THEN ARRAY['reasoning', 'function-calling', 'tools']
        ELSE ARRAY['reasoning', 'text-only']
      END
    WHEN supports_images THEN ARRAY['vision', 'multimodal']
    WHEN supports_functions THEN ARRAY['function-calling', 'tools']
    ELSE ARRAY['text-only']
  END,
  'speed_tier',
  CASE 
    WHEN provider = 'groq' THEN 'ultra-fast'
    WHEN provider = 'xai' THEN 'fast'
    WHEN provider = 'openai' THEN 'standard'
    WHEN provider = 'anthropic' THEN 'standard'
  END,
  'cost_tier',
  CASE 
    WHEN cost_per_1k_tokens <= 0.0005 THEN 'budget'
    WHEN cost_per_1k_tokens <= 0.002 THEN 'standard'
    WHEN cost_per_1k_tokens <= 0.01 THEN 'premium'
    ELSE 'enterprise'
  END,
  'reasoning_capability',
  CASE 
    WHEN name IN ('deepseek-r1-distill-llama-70b', 'qwen3-32b', 'grok-3', 'grok-4-0709', 'grok-3-mini', 'o4-mini-2025-04-16', 'claude-sonnet-4-20250514') THEN 'advanced'
    ELSE 'standard'
  END
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show all models by provider
SELECT 
  provider,
  COUNT(*) as model_count,
  COUNT(*) FILTER (WHERE supports_images) as vision_models,
  COUNT(*) FILTER (WHERE supports_functions) as function_models,
  AVG(cost_per_1k_tokens) as avg_cost_per_1k
FROM ai_models 
WHERE is_active = true 
GROUP BY provider 
ORDER BY provider;

-- Show models with image support
SELECT 
  name,
  display_name,
  provider,
  supports_images,
  supports_functions,
  max_tokens,
  cost_per_1k_tokens
FROM ai_models 
WHERE supports_images = true AND is_active = true
ORDER BY cost_per_1k_tokens;

-- Show models with function calling
SELECT 
  name,
  display_name,
  provider,
  supports_images,
  supports_functions,
  max_tokens,
  cost_per_1k_tokens
FROM ai_models 
WHERE supports_functions = true AND is_active = true
ORDER BY cost_per_1k_tokens;

-- Show all active models
SELECT 
  name,
  display_name,
  provider,
  supports_images,
  supports_functions,
  max_tokens,
  cost_per_1k_tokens,
  metadata->>'category' as category,
  metadata->>'speed_tier' as speed_tier,
  metadata->>'cost_tier' as cost_tier,
  metadata->>'reasoning_capability' as reasoning_capability,
  metadata->>'tags' as tags
FROM ai_models 
WHERE is_active = true 
ORDER BY provider, cost_per_1k_tokens;

-- Show reasoning models specifically
SELECT 
  name,
  display_name,
  provider,
  supports_images,
  supports_functions,
  max_tokens,
  cost_per_1k_tokens,
  metadata->>'reasoning_capability' as reasoning_capability
FROM ai_models 
WHERE metadata->>'reasoning_capability' = 'advanced' AND is_active = true
ORDER BY cost_per_1k_tokens;

SELECT 'AI Models setup complete!' as status; 