import { z } from 'zod';

// AI API request validation schema
export const aiRequestSchema = z.object({
  model: z.string().min(1, 'Model is required'),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1, 'Message content is required'),
    parts: z.array(z.any()).optional()
  })).min(1, 'At least one message is required'),
  maxTokens: z.number().min(1).max(32000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional().default(true)
});

// Conversation message validation schema
export const conversationMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  role: z.enum(['user', 'assistant']),
  metadata: z.record(z.any()).optional(),
  userId: z.string().uuid('Invalid user ID format')
});

// User profile validation schema
export const userProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  avatar_url: z.string().url('Invalid avatar URL').optional()
});

export type AIRequest = z.infer<typeof aiRequestSchema>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
