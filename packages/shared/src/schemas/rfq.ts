import { z } from 'zod';

export const RfqStatusSchema = z.enum(['draft', 'sent', 'closed']);
export type RfqStatus = z.infer<typeof RfqStatusSchema>;

export const RfqSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  projectName: z.string().min(1).max(200),
  deliveryCity: z.string().max(50),
  desiredDate: z.date().nullable(),
  status: RfqStatusSchema,
  createdAt: z.date(),
});

export type Rfq = z.infer<typeof RfqSchema>;

export const RfqCreateSchema = z.object({
  projectName: z.string().min(1).max(200),
  deliveryCity: z.string().max(50),
  desiredDate: z.date().optional(),
  items: z.array(z.object({
    materialId: z.string().uuid(),
    qty: z.number().positive(),
    notes: z.string().max(500).optional(),
  })).min(1),
});

export type RfqCreate = z.infer<typeof RfqCreateSchema>;

export const RfqUpdateSchema = z.object({
  projectName: z.string().min(1).max(200).optional(),
  deliveryCity: z.string().max(50).optional(),
  desiredDate: z.date().nullable().optional(),
});

export type RfqUpdate = z.infer<typeof RfqUpdateSchema>;

export const RfqItemSchema = z.object({
  id: z.string().uuid(),
  rfqId: z.string().uuid(),
  materialId: z.string().uuid(),
  qty: z.number().positive(),
  notes: z.string().max(500).nullable(),
});

export type RfqItem = z.infer<typeof RfqItemSchema>;

export const SupplierInviteStatusSchema = z.enum(['pending', 'opened', 'submitted']);
export type SupplierInviteStatus = z.infer<typeof SupplierInviteStatusSchema>;

export const SupplierInviteSchema = z.object({
  id: z.string().uuid(),
  rfqId: z.string().uuid(),
  supplierId: z.string().uuid(),
  expiresAt: z.date(),
  status: SupplierInviteStatusSchema,
  createdAt: z.date(),
  supplierName: z.string().optional(),
  supplierEmail: z.string().optional(),
});

export type SupplierInvite = z.infer<typeof SupplierInviteSchema>;

export const SendRfqSchema = z.object({
  supplierIds: z.array(z.string().uuid()).min(1),
});

export type SendRfq = z.infer<typeof SendRfqSchema>;
