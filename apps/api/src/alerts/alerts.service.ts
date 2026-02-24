import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { AlertRule, Alert } from '@buildex/shared';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AlertsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findRules(tenantId: string): Promise<AlertRule[]> {
    const result = await this.pool.query(
      `SELECT * FROM alert_rules WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return result.rows.map(this.mapRuleRow);
  }

  async createRule(
    tenantId: string,
    data: { materialId?: string; ruleType: string; params: Record<string, any> },
  ): Promise<AlertRule> {
    const id = uuid();
    const result = await this.pool.query(
      `INSERT INTO alert_rules (id, tenant_id, material_id, rule_type, params_json)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, tenantId, data.materialId || null, data.ruleType, JSON.stringify(data.params)],
    );
    return this.mapRuleRow(result.rows[0]);
  }

  async deleteRule(ruleId: string, tenantId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM alert_rules WHERE id = $1 AND tenant_id = $2`,
      [ruleId, tenantId],
    );
  }

  async findAlerts(tenantId: string): Promise<Alert[]> {
    const result = await this.pool.query(
      `SELECT * FROM alerts WHERE tenant_id = $1 ORDER BY triggered_at DESC LIMIT 100`,
      [tenantId],
    );
    return result.rows.map(this.mapAlertRow);
  }

  async acknowledgeAlert(alertId: string, tenantId: string): Promise<Alert> {
    const result = await this.pool.query(
      `UPDATE alerts SET status = 'ack' WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [alertId, tenantId],
    );
    return this.mapAlertRow(result.rows[0]);
  }

  async checkAndTriggerAlerts(tenantId: string): Promise<void> {
    const rules = await this.findRules(tenantId);

    for (const rule of rules) {
      if (rule.ruleType === 'threshold') {
        await this.checkThresholdRule(rule, tenantId);
      } else if (rule.ruleType === 'volatility') {
        await this.checkVolatilityRule(rule, tenantId);
      }
    }
  }

  private async checkThresholdRule(rule: AlertRule, tenantId: string): Promise<void> {
    if (!rule.materialId) return;
    const params = rule.paramsJson as { minPrice?: number; maxPrice?: number };

    const result = await this.pool.query(
      `SELECT unit_price FROM price_history
       WHERE material_id = $1 AND tenant_id = $2
       ORDER BY observed_at DESC LIMIT 1`,
      [rule.materialId, tenantId],
    );

    if (result.rows.length === 0) return;
    const latestPrice = parseFloat(result.rows[0].unit_price);

    let triggered = false;
    const payload: Record<string, any> = { latestPrice };

    if (params.minPrice != null && latestPrice < params.minPrice) {
      triggered = true;
      payload.reason = `Price ${latestPrice} below minimum ${params.minPrice}`;
    }
    if (params.maxPrice != null && latestPrice > params.maxPrice) {
      triggered = true;
      payload.reason = `Price ${latestPrice} above maximum ${params.maxPrice}`;
    }

    if (triggered) {
      await this.pool.query(
        `INSERT INTO alerts (id, tenant_id, rule_id, material_id, payload_json, status)
         VALUES ($1, $2, $3, $4, $5, 'new')`,
        [uuid(), tenantId, rule.id, rule.materialId, JSON.stringify(payload)],
      );
    }
  }

  private async checkVolatilityRule(rule: AlertRule, tenantId: string): Promise<void> {
    if (!rule.materialId) return;
    const params = rule.paramsJson as { volatilityThreshold?: number };
    if (!params.volatilityThreshold) return;

    const result = await this.pool.query(
      `SELECT unit_price FROM price_history
       WHERE material_id = $1 AND tenant_id = $2
         AND observed_at >= NOW() - INTERVAL '30 days'
       ORDER BY observed_at`,
      [rule.materialId, tenantId],
    );

    if (result.rows.length < 3) return;

    const prices = result.rows.map((r: any) => parseFloat(r.unit_price));
    const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum: number, p: number) => sum + Math.pow(p - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const volatility = stdDev / avg;

    if (volatility > params.volatilityThreshold) {
      await this.pool.query(
        `INSERT INTO alerts (id, tenant_id, rule_id, material_id, payload_json, status)
         VALUES ($1, $2, $3, $4, $5, 'new')`,
        [
          uuid(),
          tenantId,
          rule.id,
          rule.materialId,
          JSON.stringify({
            volatility: Math.round(volatility * 10000) / 100,
            threshold: params.volatilityThreshold * 100,
            reason: `Volatility ${(volatility * 100).toFixed(1)}% exceeds threshold ${(params.volatilityThreshold * 100).toFixed(1)}%`,
          }),
        ],
      );
    }
  }

  private mapRuleRow(row: any): AlertRule {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      materialId: row.material_id,
      ruleType: row.rule_type,
      paramsJson: typeof row.params_json === 'string' ? JSON.parse(row.params_json) : row.params_json,
      createdAt: row.created_at,
    };
  }

  private mapAlertRow(row: any): Alert {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      ruleId: row.rule_id,
      materialId: row.material_id,
      triggeredAt: row.triggered_at,
      payloadJson: typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : row.payload_json,
      status: row.status,
    };
  }
}
