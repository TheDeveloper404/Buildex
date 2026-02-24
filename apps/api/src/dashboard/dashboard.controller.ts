import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { AuthGuard } from '../auth/auth.guard';
import { RequestContext } from '../common/request-context';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get('stats')
  async getStats(@Req() req: Request & { context: RequestContext }) {
    const tenantId = req.context.tenantId;

    // Get counts
    const [materialsRes, suppliersRes, rfqsRes, offersRes, alertsRes] = await Promise.all([
      this.pool.query('SELECT COUNT(*) as count FROM materials WHERE tenant_id = $1', [tenantId]),
      this.pool.query('SELECT COUNT(*) as count FROM suppliers WHERE tenant_id = $1', [tenantId]),
      this.pool.query(
        'SELECT COUNT(*) FILTER (WHERE status = $2) as active, COUNT(*) as total FROM rfqs WHERE tenant_id = $1',
        [tenantId, 'sent']
      ),
      this.pool.query(
        'SELECT COUNT(*) as count FROM offers o JOIN rfqs r ON o.rfq_id = r.id WHERE r.tenant_id = $1',
        [tenantId]
      ),
      this.pool.query(
        "SELECT COUNT(*) FILTER (WHERE status = 'new') as unacknowledged FROM alerts WHERE tenant_id = $1",
        [tenantId],
      ),
    ]);

    // Get recent RFQs
    const recentRfqsRes = await this.pool.query(
      `SELECT r.id, r.project_name, r.status, r.created_at, 
              COUNT(si.id) FILTER (WHERE si.status = 'submitted') as offers_received
       FROM rfqs r
       LEFT JOIN supplier_invites si ON si.rfq_id = r.id
       WHERE r.tenant_id = $1
       GROUP BY r.id
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [tenantId]
    );

    // Get price trends (last 30 days)
    const priceTrendsRes = await this.pool.query(
      `SELECT m.canonical_name as material_name, 
              ph.city,
              AVG(ph.unit_price) as avg_price,
              MIN(ph.unit_price) as min_price,
              MAX(ph.unit_price) as max_price
       FROM price_history ph
       JOIN materials m ON m.id = ph.material_id
       WHERE m.tenant_id = $1 
         AND ph.observed_at >= NOW() - INTERVAL '30 days'
       GROUP BY m.canonical_name, ph.city
       ORDER BY COUNT(*) DESC
       LIMIT 10`,
      [tenantId]
    );

    return {
      counts: {
        materials: parseInt(materialsRes.rows[0].count),
        suppliers: parseInt(suppliersRes.rows[0].count),
        rfqs: parseInt(rfqsRes.rows[0].total),
        activeRfqs: parseInt(rfqsRes.rows[0].active),
        offers: parseInt(offersRes.rows[0].count),
        unacknowledgedAlerts: parseInt(alertsRes.rows[0].unacknowledged),
      },
      recentRfqs: recentRfqsRes.rows.map(row => ({
        id: row.id,
        projectName: row.project_name,
        status: row.status,
        createdAt: row.created_at,
        offersReceived: parseInt(row.offers_received) || 0,
      })),
      priceTrends: priceTrendsRes.rows.map(row => ({
        materialName: row.material_name,
        city: row.city,
        avgPrice: parseFloat(row.avg_price).toFixed(2),
        minPrice: parseFloat(row.min_price).toFixed(2),
        maxPrice: parseFloat(row.max_price).toFixed(2),
      })),
    };
  }
}
