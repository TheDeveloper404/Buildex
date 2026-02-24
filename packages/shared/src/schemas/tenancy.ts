import { z } from 'zod';

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  createdAt: z.date(),
});

export type Tenant = z.infer<typeof TenantSchema>;

export const TenantCreateSchema = z.object({
  name: z.string().min(1).max(100),
});

export type TenantCreate = z.infer<typeof TenantCreateSchema>;
