-- =====================================================
-- DELETE PREVIOUSLY ADDED MODELS
-- =====================================================
-- Remove the sample models that were added in the production setup

-- Delete the sample models that were added in supabase-setup-production.sql
DELETE FROM ai_models WHERE name IN (
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'claude-3-sonnet',
  'claude-3-haiku',
  'gemini-pro',
  'llama-3.1-70b'
);

-- Show remaining models
SELECT 
  name,
  display_name,
  provider,
  is_active
FROM ai_models 
ORDER BY provider, name;

SELECT 'Previous models deleted successfully!' as status; 