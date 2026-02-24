import { z } from 'zod';

export const MaterialSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  canonicalName: z.string().min(1).max(200),
  unit: z.string().min(1).max(50),
  specJson: z.record(z.any()).nullable(),
  createdAt: z.date(),
});

export type Material = z.infer<typeof MaterialSchema>;

export const MaterialCreateSchema = z.object({
  canonicalName: z.string().min(1).max(200),
  unit: z.string().min(1).max(50),
  specJson: z.record(z.any()).optional(),
});

export type MaterialCreate = z.infer<typeof MaterialCreateSchema>;

export const MaterialUpdateSchema = z.object({
  canonicalName: z.string().min(1).max(200).optional(),
  unit: z.string().min(1).max(50).optional(),
  specJson: z.record(z.any()).optional(),
});

export type MaterialUpdate = z.infer<typeof MaterialUpdateSchema>;

export const MaterialAliasSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  aliasText: z.string().min(1).max(200),
  materialId: z.string().uuid(),
  createdAt: z.date(),
});

export type MaterialAlias = z.infer<typeof MaterialAliasSchema>;

export const MaterialAliasCreateSchema = z.object({
  aliasText: z.string().min(1).max(200),
  materialId: z.string().uuid(),
});

export type MaterialAliasCreate = z.infer<typeof MaterialAliasCreateSchema>;
