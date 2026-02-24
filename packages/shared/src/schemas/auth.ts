import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  expiresAt: z.date(),
  createdAt: z.date(),
  lastSeenAt: z.date().optional(),
});

export type Session = z.infer<typeof SessionSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email().nullable(),
  name: z.string(),
  role: z.enum(['admin', 'user']),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const UserCreateSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'user']).default('user'),
});

export type UserCreate = z.infer<typeof UserCreateSchema>;
