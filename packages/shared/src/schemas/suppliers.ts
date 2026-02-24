import { z } from 'zod';

export const SupplierSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email().nullable(),
  phone: z.string().max(50).nullable(),
  city: z.string().max(50).nullable(),
  createdAt: z.date(),
});

export type Supplier = z.infer<typeof SupplierSchema>;

export const SupplierCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  city: z.string().max(50).optional(),
});

export type SupplierCreate = z.infer<typeof SupplierCreateSchema>;

export const SupplierUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  city: z.string().max(50).nullable().optional(),
});

export type SupplierUpdate = z.infer<typeof SupplierUpdateSchema>;
