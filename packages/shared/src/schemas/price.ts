import { z } from 'zod';

export const PriceSourceSchema = z.enum(['offer', 'import', 'manual']);
export type PriceSource = z.infer<typeof PriceSourceSchema>;

export const PriceHistorySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  materialId: z.string().uuid(),
  supplierId: z.string().uuid().nullable(),
  city: z.string().max(50).nullable(),
  unitPrice: z.number().min(0),
  currency: z.string().length(3),
  observedAt: z.date(),
  source: PriceSourceSchema,
  rfqId: z.string().uuid().nullable(),
  offerId: z.string().uuid().nullable(),
});

export type PriceHistory = z.infer<typeof PriceHistorySchema>;

export const MaterialPriceStatsSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  materialId: z.string().uuid(),
  city: z.string().max(50).nullable(),
  computedAt: z.date(),
  lastPrice: z.number().min(0).nullable(),
  avg30: z.number().min(0).nullable(),
  avg60: z.number().min(0).nullable(),
  avg90: z.number().min(0).nullable(),
  min90: z.number().min(0).nullable(),
  max90: z.number().min(0).nullable(),
  volatility90: z.number().min(0).nullable(),
  trend90: z.number().nullable(),
});

export type MaterialPriceStats = z.infer<typeof MaterialPriceStatsSchema>;

export const PriceStatsQuerySchema = z.object({
  materialId: z.string().uuid(),
  city: z.string().optional(),
});

export type PriceStatsQuery = z.infer<typeof PriceStatsQuerySchema>;

export const PriceHistoryQuerySchema = z.object({
  materialId: z.string().uuid(),
  city: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  from: z.date().optional(),
  to: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export type PriceHistoryQuery = z.infer<typeof PriceHistoryQuerySchema>;
