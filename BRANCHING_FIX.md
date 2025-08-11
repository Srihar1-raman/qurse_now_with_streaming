# Branching Conversation History Fix

## Issue
Child conversations (branches) were appearing in the main history sidebar as well as inside their parent conversations when expanded. This created duplicate entries and confusion in the UI.

## Root Cause
The `get_conversations_with_message_count` database function was returning ALL conversations for a user, including branch conversations (those with `parent_conversation_id`). The function should only return parent conversations (where `parent_conversation_id` is NULL).

## Solution
Updated the database function to filter out branch conversations by adding the condition:
```sql
AND c.parent_conversation_id IS NULL
```

## Files Modified

### Database Schema Files
- `supabase-schema.sql` - Updated function for Supabase Auth (UUID user_id)
- `supabase-schema-nextauth.sql` - Updated function for NextAuth (TEXT user_id)

### Application Files
- `src/lib/supabase-service.ts` - Added `clearConversationCache` method
- `src/components/HistorySidebar.tsx` - Added cache clearing on load

### Migration File
- `branching-migration.sql` - SQL migration to apply the fix

## How to Apply the Fix

1. **Run the database migration:**
   ```sql
   -- Execute the contents of branching-migration.sql in your Supabase SQL editor
   ```

2. **Deploy the updated application code** - The cache will be automatically cleared on the next load.

## Result
- Only parent conversations appear in the main history sidebar
- Branch conversations only appear when their parent conversation is expanded
- No more duplicate entries in the history
- Cleaner, more intuitive conversation hierarchy

## Testing
After applying the fix:
1. Create a parent conversation
2. Create several branch conversations from it
3. Verify that only the parent appears in the main history
4. Expand the parent to see the branches
5. Verify no duplicates appear 