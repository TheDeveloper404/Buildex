import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { MaterialPriceStats, PriceHistory } from '@buildex/shared';

@Injectable()
export class PriceEngineService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async computeStats(tenantId: string, materialId: string, city?: string): Promise<MaterialPriceStats> {
    const cityFilter = city || null;
    
    // Get price history for the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.pool.query(
      `SELECT unit_price, observed_at 
       FROM price_history 
       WHERE tenant_id = $1 
       AND material_id = $2 
       AND (city = $3 OR ($3 IS NULL AND city IS NULL))
       AND observed_at >= $4
       ORDER BY observed_at DESC`,
      [tenantId, materialId, cityFilter, ninetyDaysAgo]
    );

    const prices = result.rows.map(row => ({
      price: parseFloat(row.unit_price),
      date: new Date(row.observed_at),
    }));

    if (prices.length === 0) {
      return {
        id: '',
        tenantId,
        materialId,
        city: cityFilter,
        computedAt: new Date(),
        lastPrice: null,
        avg30: null,
        avg60: null,
        avg90: null,
        min90: null,
        max90: null,
        volatility90: null,
        trend90: null,
      };
    }

    // Calculate statistics
    const lastPrice = prices[0].price;
    const allPrices = prices.map(p => p.price);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const prices30 = prices.filter(p => p.date >= thirtyDaysAgo).map(p => p.price);
    const prices60 = prices.filter(p => p.date >= sixtyDaysAgo).map(p => p.price);
    
    const avg30 = prices30.length > 0 ? this.mean(prices30) : null;
    const avg60 = prices60.length > 0 ? this.mean(prices60) : null;
    const avg90 = this.mean(allPrices);
    const min90 = Math.min(...allPrices);
    const max90 = Math.max(...allPrices);
    const volatility90 = this.standardDeviation(allPrices);
    
    // Simple trend: compare avg30 vs avg of days 31-60
    const prices31to60 = prices.filter(p => p.date < thirtyDaysAgo && p.date >= sixtyDaysAgo).map(p => p.price);
    const avg31to60 = prices31to60.length > 0 ? this.mean(prices31to60) : avg90;
    const trend90 = avg30 && avg31to60 ? ((avg30 - avg31to60) / avg31to60) * 100 : null;

    const stats: MaterialPriceStats = {
      id: '',
      tenantId,
      materialId,
      city: cityFilter,
      computedAt: new Date(),
      lastPrice,
      avg30,
      avg60,
      avg90,
      min90,
      max90,
      volatility90,
      trend90,
    };

    // Store stats in database
    await this.pool.query(
      `INSERT INTO material_price_stats 
       (tenant_id, material_id, city, computed_at, last_price, avg_30, avg_60, avg_90, min_90, max_90, volatility_90, trend_90)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (tenant_id, material_id, city) 
       DO UPDATE SET 
         computed_at = $4,
         last_price = $5,
         avg_30 = $6,
         avg_60 = $7,
         avg_90 = $8,
         min_90 = $9,
         max_90 = $10,
         volatility_90 = $11,
         trend_90 = $12`,
      [tenantId, materialId, cityFilter, stats.computedAt, stats.lastPrice, stats.avg30, stats.avg60, stats.avg90, stats.min90, stats.max90, stats.volatility90, stats.trend90]
    );

    return stats;
  }

  async getStats(tenantId: string, materialId: string, city?: string): Promise<MaterialPriceStats | null> {
    const cityFilter = city || null;
    
    const result = await this.pool.query(
      'SELECT * FROM material_price_stats WHERE tenant_id = $1 AND material_id = $2 AND (city = $3 OR ($3 IS NULL AND city IS NULL))',
      [tenantId, materialId, cityFilter]
    );

    if (result.rows.length === 0) {
      // Compute on the fly if not found
      return this.computeStats(tenantId, materialId, city);
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      materialId: row.material_id,
      city: row.city,
      computedAt: new Date(row.computed_at),
      lastPrice: row.last_price ? parseFloat(row.last_price) : null,
      avg30: row.avg_30 ? parseFloat(row.avg_30) : null,
      avg60: row.avg_60 ? parseFloat(row.avg_60) : null,
      avg90: row.avg_90 ? parseFloat(row.avg_90) : null,
      min90: row.min_90 ? parseFloat(row.min_90) : null,
      max90: row.max_90 ? parseFloat(row.max_90) : null,
      volatility90: row.volatility_90 ? parseFloat(row.volatility_90) : null,
      trend90: row.trend_90 ? parseFloat(row.trend_90) : null,
    };
  }

  async getPriceHistory(tenantId: string, materialId: string, city?: string, limit: number = 50, options?: { supplierId?: string; dateFrom?: Date; dateTo?: Date }): Promise<PriceHistory[]> {
    const cityFilter = city || null;
    
    const params: any[] = [tenantId, materialId, cityFilter];
    let whereClauses = `ph.tenant_id = $1 AND ph.material_id = $2 AND (ph.city = $3 OR ($3 IS NULL AND ph.city IS NULL))`;

    if (options?.supplierId) {
      params.push(options.supplierId);
      whereClauses += ` AND ph.supplier_id = $${params.length}`;
    }
    if (options?.dateFrom) {
      params.push(options.dateFrom);
      whereClauses += ` AND ph.observed_at >= $${params.length}`;
    }
    if (options?.dateTo) {
      params.push(options.dateTo);
      whereClauses += ` AND ph.observed_at <= $${params.length}`;
    }

    params.push(limit);

    const result = await this.pool.query(
      `SELECT ph.*, s.name as supplier_name, m.canonical_name as material_name, m.unit
       FROM price_history ph
       LEFT JOIN suppliers s ON ph.supplier_id = s.id
       LEFT JOIN materials m ON ph.material_id = m.id
       WHERE ${whereClauses}
       ORDER BY ph.observed_at DESC
       LIMIT $${params.length}`,
      params
    );

    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      materialId: row.material_id,
      materialName: row.material_name,
      unit: row.unit,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      city: row.city,
      unitPrice: parseFloat(row.unit_price),
      currency: row.currency,
      observedAt: new Date(row.observed_at),
      source: row.source,
      rfqId: row.rfq_id,
      offerId: row.offer_id,
    }));
  }

  async recomputeAllStats(): Promise<void> {
    // Get all tenant/material/city combinations
    const result = await this.pool.query(
      `SELECT DISTINCT tenant_id, material_id, city 
       FROM price_history 
       WHERE observed_at >= NOW() - INTERVAL '90 days'`
    );

    for (const row of result.rows) {
      await this.computeStats(row.tenant_id, row.material_id, row.city);
    }
  }

  async addPriceEntry(params: {
    tenantId: string;
    materialId: string;
    supplierId?: string;
    city?: string;
    unitPrice: number;
    currency: string;
    observedAt: Date;
    source: string;
  }): Promise<{ id: string }> {
    const result = await this.pool.query(
      `INSERT INTO price_history (tenant_id, material_id, supplier_id, city, unit_price, currency, observed_at, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        params.tenantId,
        params.materialId,
        params.supplierId || null,
        params.city || null,
        params.unitPrice,
        params.currency,
        params.observedAt,
        params.source,
      ]
    );

    // Recompute stats for this material/city
    await this.computeStats(params.tenantId, params.materialId, params.city);

    return { id: result.rows[0].id };
  }

  private mean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    const avg = this.mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
}
