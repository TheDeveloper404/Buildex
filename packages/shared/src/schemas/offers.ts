import { z } from 'zod';

export const OfferSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  rfqId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string().optional(),
  currency: z.string().length(3).default('RON'),
  transportCost: z.number().min(0).nullable(),
  paymentTerms: z.string().max(100).nullable(),
  leadTimeDays: z.number().int().min(0).nullable(),
  notes: z.string().max(1000).nullable(),
  isWinningOffer: z.boolean().optional(),
  createdAt: z.date(),
});

export type Offer = z.infer<typeof OfferSchema>;

export const OfferItemSchema = z.object({
  id: z.string().uuid(),
  offerId: z.string().uuid(),
  rfqItemId: z.string().uuid(),
  unitPrice: z.number().min(0),
  availableQty: z.number().min(0).nullable(),
  leadTimeDaysOverride: z.number().int().min(0).nullable(),
  notes: z.string().max(500).nullable(),
  materialName: z.string().optional(),
  unit: z.string().optional(),
  requestedQty: z.number().nullable().optional(),
});

export type OfferItem = z.infer<typeof OfferItemSchema>;

export const OfferCreateSchema = z.object({
  currency: z.string().length(3).default('RON'),
  transportCost: z.number().min(0).optional(),
  paymentTerms: z.string().max(100).optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(z.object({
    rfqItemId: z.string().uuid(),
    unitPrice: z.number().min(0),
    availableQty: z.number().min(0).optional(),
    leadTimeDaysOverride: z.number().int().min(0).optional(),
    notes: z.string().max(500).optional(),
  })).min(1),
});

export type OfferCreate = z.infer<typeof OfferCreateSchema>;

export const PublicOfferSubmitSchema = z.object({
  token: z.string(),
  currency: z.string().length(3).default('RON'),
  transportCost: z.number().min(0).optional(),
  paymentTerms: z.string().max(100).optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(z.object({
    rfqItemId: z.string().uuid(),
    unitPrice: z.number().min(0),
    availableQty: z.number().min(0).optional(),
    leadTimeDaysOverride: z.number().int().min(0).optional(),
    notes: z.string().max(500).optional(),
  })).min(1),
});

export type PublicOfferSubmit = z.infer<typeof PublicOfferSubmitSchema>;
