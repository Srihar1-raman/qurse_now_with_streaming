# Supabase Setup Guide for Qurse

This guide will walk you through setting up Supabase as your complete backend for the Qurse AI chat application.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `qurse-ai-chat`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be set up (2-3 minutes)

## 2. Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **Anon public key** (starts with `eyJ`)
   - **Service role key** (keep this secret!)

## 3. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click "Run" to execute the schema
5. Verify the tables were created in **Table Editor**

## 4. Set Up Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click "Create a new bucket"
3. Enter:
   - **Name**: `uploads`
   - **Public bucket**: ✅ Check this
   - **File size limit**: `10MB`
4. Click "Create bucket"
5. Go to **Storage** → **Policies**
6. Add the following policies for the `uploads` bucket:

### Policy 1: Allow authenticated users to upload files
```sql
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### Policy 2: Allow users to view their own files
```sql
CREATE POLICY "Allow users to view their own files" ON storage.objects
FOR SELECT USING (
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 3: Allow users to delete their own files
```sql
CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE USING (
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## 5. Configure Environment Variables

Create or update your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-nextauth-key

# OAuth Provider Credentials (optional)
GITHUB_ID=your-github-oauth-client-id
GITHUB_SECRET=your-github-oauth-client-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
TWITTER_CLIENT_ID=your-twitter-oauth-client-id
TWITTER_CLIENT_SECRET=your-twitter-oauth-client-secret

# AI API Keys
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key
GROQ_API_KEY=your-groq-api-key
```

## 6. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test authentication:
   - Go to `http://localhost:3000/login`
   - Try signing in with an OAuth provider
   - Check if a user record is created in Supabase

3. Test conversation creation:
   - Start a new conversation
   - Check if it appears in the Supabase `conversations` table

4. Test file upload:
   - Try uploading a file in a conversation
   - Check if it appears in Supabase Storage and the `files` table

## 7. Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

## 8. Database Schema Overview

### Tables Created:

1. **users** - User profiles and preferences
2. **conversations** - Chat conversations
3. **messages** - Individual messages in conversations
4. **files** - File uploads and metadata

### Key Features:

- **Row Level Security (RLS)** - Users can only access their own data
- **Automatic timestamps** - Created/updated timestamps
- **Cascade deletes** - Deleting a conversation deletes all messages
- **File storage** - Integrated with Supabase Storage
- **User preferences** - JSONB field for flexible user settings

### Functions Created:

- **get_conversations_with_message_count** - Get conversations with message counts
- **handle_new_user** - Auto-create user profile on signup
- **update_updated_at_column** - Auto-update timestamps

## 9. API Endpoints

### Conversations:
- `GET /api/conversations` - Get all user conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/[id]` - Get specific conversation
- `PUT /api/conversations/[id]` - Update conversation
- `DELETE /api/conversations/[id]` - Delete conversation

### Messages:
- `POST /api/conversations/[id]/messages` - Add message
- `GET /api/conversations/[id]/messages` - Get messages

### Files:
- `POST /api/upload` - Upload file
- `DELETE /api/upload?fileId=...` - Delete file

## 10. Troubleshooting

### Common Issues:

1. **"Unauthorized" errors**: Check if user is authenticated and session is valid
2. **"Conversation not found"**: Verify the conversation belongs to the user
3. **File upload fails**: Check storage bucket permissions and file size limits
4. **Database connection errors**: Verify Supabase URL and keys

### Debug Tips:

1. Check Supabase logs in the dashboard
2. Use browser dev tools to inspect network requests
3. Check console logs for detailed error messages
4. Verify RLS policies are working correctly

## 11. Next Steps

After setup, you can:

1. **Implement real-time features** using Supabase subscriptions
2. **Add analytics** by tracking usage in the database
3. **Implement search** using PostgreSQL full-text search
4. **Add file processing** for PDFs and images
5. **Set up backups** and monitoring

## Support

If you encounter issues:
1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review the [Next.js documentation](https://nextjs.org/docs)
3. Check the project's GitHub issues
4. Contact the maintainers 