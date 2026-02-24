import { z } from 'zod';

export const AlertRuleTypeSchema = z.enum(['threshold', 'volatility']);
export type AlertRuleType = z.infer<typeof AlertRuleTypeSchema>;

export const AlertRuleSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  materialId: z.string().uuid().nullable(),
  ruleType: AlertRuleTypeSchema,
  paramsJson: z.record(z.any()),
  createdAt: z.date(),
});

export type AlertRule = z.infer<typeof AlertRuleSchema>;

export const AlertRuleCreateSchema = z.object({
  materialId: z.string().uuid().optional(),
  ruleType: AlertRuleTypeSchema,
  params: z.object({
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    volatilityThreshold: z.number().optional(),
  }),
});

export type AlertRuleCreate = z.infer<typeof AlertRuleCreateSchema>;

export const AlertStatusSchema = z.enum(['new', 'ack']);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

export const AlertSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  ruleId: z.string().uuid().nullable(),
  materialId: z.string().uuid().nullable(),
  triggeredAt: z.date(),
  payloadJson: z.record(z.any()),
  status: AlertStatusSchema,
});

export type Alert = z.infer<typeof AlertSchema>;
