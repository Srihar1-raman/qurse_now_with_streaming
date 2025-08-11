# Supabase + NextAuth.js Setup Guide for Qurse

This guide covers setting up Supabase as your database backend while using NextAuth.js for authentication.

## 🔧 Architecture Overview

- **Authentication**: NextAuth.js (JWT sessions, OAuth providers)
- **Database**: Supabase PostgreSQL 
- **Storage**: Supabase Storage
- **Security**: Application-level (API route protection)

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `qurse-ai-chat`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for setup (2-3 minutes)

## 2. Database Schema Setup

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. **Use `supabase-schema-nextauth.sql`** instead of the original schema
4. Copy and paste the entire NextAuth-compatible schema
5. Click "Run" to execute
6. Verify tables were created in **Table Editor**

### 🔴 **Important**: Use the NextAuth Schema

The original `supabase-schema.sql` won't work with NextAuth. Key differences:
- User IDs are `TEXT` (not UUID) to match NextAuth
- No `auth.users` table references
- RLS disabled (security handled in API routes)
- Custom functions updated for TEXT user IDs

## 3. Environment Variables

Update your `.env.local`:

```bash
# Supabase (Database Only)
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-nextauth-key

# OAuth Providers
GITHUB_ID=your-github-oauth-client-id
GITHUB_SECRET=your-github-oauth-client-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# AI APIs
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GROQ_API_KEY=your-groq-api-key
```

## 4. User Management with NextAuth

Since NextAuth doesn't auto-create users in your database, you need to handle this manually:

### 4.1 Create User Creation Utility

```typescript
// lib/create-user.ts
import { SupabaseService } from './supabase-service'

export async function ensureUserExists(session: any) {
  if (!session?.user?.id) return null
  
  // Check if user exists
  const existingUser = await SupabaseService.getUser(session.user.id)
  
  if (!existingUser) {
    // Create user in database
    await supabase.from('users').insert({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatar_url: session.user.image
    })
  }
  
  return session.user.id
}
```

### 4.2 Update API Routes

Add user creation to your API routes:

```typescript
// In any API route
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureUserExists } from '@/lib/create-user'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Ensure user exists in database
  const userId = await ensureUserExists(session)
  
  // Continue with your logic...
}
```

## 5. Storage Setup

1. Go to **Storage** in Supabase dashboard
2. Click "Create a new bucket"
3. Enter:
   - **Name**: `uploads`
   - **Public bucket**: ✅ Check this
   - **File size limit**: `10MB`
4. Click "Create bucket"

### Storage Security

Since we're not using Supabase Auth, handle file access through your API routes:

```typescript
// api/upload/route.ts
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({error: 'Unauthorized'}, {status: 401})
  
  // Handle file upload with user validation
  const userId = session.user.id
  const filePath = `${userId}/${Date.now()}-${file.name}`
  
  // Upload to Supabase Storage
  // Save metadata to database
}
```

## 6. Security Model

### ✅ **API Route Protection**
```typescript
// Every API route should check authentication
const session = await getServerSession(authOptions)
if (!session) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### ✅ **User Data Isolation**
```typescript
// Always filter by user ID
const conversations = await supabase
  .from('conversations')
  .select('*')
  .eq('user_id', session.user.id) // Critical!
```

### ❌ **No RLS Required**
Since authentication is handled by NextAuth and authorization by API routes, Supabase RLS is disabled.

## 7. What Supabase Contains & Does

### 🗄️ **Database Tables**

```sql
users (NextAuth compatible)
├── id (TEXT) - matches NextAuth user.id
├── email, name, avatar_url  
└── preferences (JSONB)

conversations
├── user_id (TEXT) - references users.id
├── title, model, created_at
└── is_archived

messages
├── conversation_id, content, role
├── created_at, metadata
└── linked to conversations

files  
├── user_id, conversation_id
├── filename, file_path, file_size
└── metadata tracking
```

### 🔧 **Core Functions**

1. **Data Storage**: Persistent conversation history
2. **File Management**: Upload/download with metadata
3. **User Preferences**: Themes, default models, settings
4. **Performance**: Optimized queries with indexes
5. **Data Integrity**: Foreign key constraints, transactions

### 🚀 **Integration Flow**

1. **User signs in** → NextAuth creates session
2. **First API call** → Auto-creates user in Supabase if needed  
3. **Conversations** → Stored with user_id relationship
4. **Messages** → Linked to conversations with metadata
5. **Files** → Uploaded to Storage + metadata in database
6. **Security** → Enforced at API level with session checks

## 8. Testing the Setup

```bash
# Start development server
npm run dev

# Test flow:
# 1. Sign in via NextAuth (/login)
# 2. Check user created in Supabase users table
# 3. Create conversation (should appear in conversations table)
# 4. Send messages (should appear in messages table)
# 5. Upload file (should appear in storage + files table)
```

## 9. Key Differences from Supabase Auth

| Feature | Supabase Auth | NextAuth.js |
|---------|---------------|-------------|
| User IDs | UUID | String (flexible) |
| Session | Server-side | JWT |
| RLS | Built-in | API-level |
| OAuth | Limited | Extensive |
| Customization | Moderate | High |

## 10. Deployment Notes

### Vercel Deployment
1. Add all environment variables to Vercel
2. Update `NEXTAUTH_URL` to production domain
3. Update OAuth provider redirect URLs

### Production Security
- Use strong `NEXTAUTH_SECRET`
- Rotate API keys regularly  
- Monitor Supabase usage/logs
- Set up database backups

This setup provides the flexibility of NextAuth.js with the power of Supabase's database and storage, giving you the best of both worlds! 