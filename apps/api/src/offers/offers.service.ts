import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { Offer, OfferItem, OfferCreate, PublicOfferSubmit, SupplierInvite } from '@buildex/shared';
import { AuditLogService } from '../audit-log/audit-log.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OffersService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly auditLog: AuditLogService,
  ) {}

  async findByRfqId(rfqId: string, tenantId: string): Promise<Offer[]> {
    const result = await this.pool.query(
      `SELECT o.*, s.name as supplier_name 
       FROM offers o 
       JOIN suppliers s ON o.supplier_id = s.id 
       WHERE o.rfq_id = $1 AND o.tenant_id = $2 
       ORDER BY o.created_at DESC`,
      [rfqId, tenantId]
    );
    return result.rows.map(row => this.mapOfferRow(row));
  }

  async findById(id: string, tenantId: string): Promise<Offer | null> {
    const result = await this.pool.query(
      'SELECT * FROM offers WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (result.rows.length === 0) return null;
    return this.mapOfferRow(result.rows[0]);
  }

  async findItems(offerId: string): Promise<OfferItem[]> {
    const result = await this.pool.query(
      `SELECT oi.*, ri.qty as requested_qty, m.canonical_name as material_name, m.unit 
       FROM offer_items oi 
       JOIN rfq_items ri ON oi.rfq_item_id = ri.id
       JOIN materials m ON ri.material_id = m.id
       WHERE oi.offer_id = $1`,
      [offerId]
    );
    return result.rows.map(row => this.mapOfferItemRow(row));
  }

  async getRfqContextForToken(token: string): Promise<{ rfq: any; items: any[]; supplier: any } | null> {
    // Use the token selector (first 16 chars) for an indexed DB lookup,
    // then bcrypt.compare only against the single matched row.
    const tokenSelector = token.slice(0, 16);

    const inviteResult = await this.pool.query(
      `SELECT si.*, s.name as supplier_name, s.email as supplier_email,
              r.id as rfq_id, r.project_name, r.delivery_city, r.desired_date
       FROM supplier_invites si
       JOIN suppliers s ON si.supplier_id = s.id
       JOIN rfqs r ON si.rfq_id = r.id
       WHERE si.token_selector = $1
         AND si.expires_at > NOW()
         AND si.status IN ('pending', 'opened')`,
      [tokenSelector]
    );

    if (inviteResult.rows.length === 0) return null;

    const invite = inviteResult.rows[0];
    const isMatch = await bcrypt.compare(token, invite.token_hash);
    if (!isMatch) return null;

    // Update invite status to opened
    await this.pool.query(
      'UPDATE supplier_invites SET status = $1 WHERE id = $2',
      ['opened', invite.id]
    );

    // Get RFQ items
    const itemsResult = await this.pool.query(
      `SELECT ri.*, m.canonical_name as material_name, m.unit
       FROM rfq_items ri
       JOIN materials m ON ri.material_id = m.id
       WHERE ri.rfq_id = $1`,
      [invite.rfq_id]
    );

    return {
      rfq: {
        id: invite.rfq_id,
        projectName: invite.project_name,
        deliveryCity: invite.delivery_city,
        desiredDate: invite.desired_date,
      },
      items: itemsResult.rows.map(row => ({
        id: row.id,
        materialId: row.material_id,
        materialName: row.material_name,
        unit: row.unit,
        qty: parseFloat(row.qty),
        notes: row.notes,
      })),
      supplier: {
        id: invite.supplier_id,
        name: invite.supplier_name,
        email: invite.supplier_email,
      },
    };
  }

  async submitPublicOffer(token: string, data: PublicOfferSubmit): Promise<Offer> {
    const context = await this.getRfqContextForToken(token);
    if (!context) {
      throw new NotFoundException('Invalid or expired token');
    }

    const { rfq, supplier } = context;

    // Get tenant_id from rfq
    const rfqResult = await this.pool.query(
      'SELECT tenant_id FROM rfqs WHERE id = $1',
      [rfq.id]
    );
    const tenantId = rfqResult.rows[0].tenant_id;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create offer
      const offerResult = await client.query(
        `INSERT INTO offers (tenant_id, rfq_id, supplier_id, currency, transport_cost, payment_terms, lead_time_days, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [tenantId, rfq.id, supplier.id, data.currency, data.transportCost || null, data.paymentTerms || null, data.leadTimeDays || null, data.notes || null]
      );
      const offer = this.mapOfferRow(offerResult.rows[0]);

      // Create offer items
      for (const item of data.items) {
        await client.query(
          `INSERT INTO offer_items (offer_id, rfq_item_id, unit_price, available_qty, lead_time_days_override, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [offer.id, item.rfqItemId, item.unitPrice, item.availableQty || null, item.leadTimeDaysOverride || null, item.notes || null]
        );
      }

      // Update invite status to submitted
      await client.query(
        `UPDATE supplier_invites SET status = 'submitted' 
         WHERE rfq_id = $1 AND supplier_id = $2`,
        [rfq.id, supplier.id]
      );

      // Add to price history for each item
      for (const item of data.items) {
        // Get material_id and city from rfq_item
        const itemResult = await client.query(
          `SELECT ri.material_id, r.delivery_city 
           FROM rfq_items ri 
           JOIN rfqs r ON ri.rfq_id = r.id 
           WHERE ri.id = $1`,
          [item.rfqItemId]
        );
        
        if (itemResult.rows.length > 0) {
          const { material_id, delivery_city } = itemResult.rows[0];
          await client.query(
            `INSERT INTO price_history (tenant_id, material_id, supplier_id, city, unit_price, currency, observed_at, source, rfq_id, offer_id)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'offer', $7, $8)`,
            [tenantId, material_id, supplier.id, delivery_city, item.unitPrice, data.currency, rfq.id, offer.id]
          );
        }
      }

      await client.query('COMMIT');
      return offer;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markWinningOffer(offerId: string, tenantId: string, actorUserId?: string): Promise<Offer> {
    const offer = await this.findById(offerId, tenantId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Unmark any existing winning offer for this RFQ
    await this.pool.query(
      'UPDATE offers SET is_winning_offer = FALSE WHERE rfq_id = $1 AND tenant_id = $2',
      [offer.rfqId, tenantId]
    );

    // Mark this offer as winning
    const result = await this.pool.query(
      'UPDATE offers SET is_winning_offer = TRUE WHERE id = $1 AND tenant_id = $2 RETURNING *',
      [offerId, tenantId]
    );
    const winning = this.mapOfferRow(result.rows[0]);
    this.auditLog.log({
      tenantId, actorUserId, action: 'mark_winner', entityType: 'offer', entityId: offerId,
      metadata: { rfqId: winning.rfqId, supplierId: winning.supplierId },
    }).catch(() => {});
    return winning;
  }

  async getComparisonData(rfqId: string, tenantId: string): Promise<any> {
    // Get all offers for this RFQ
    const offers = await this.findByRfqId(rfqId, tenantId);
    
    // Get all RFQ items
    const itemsResult = await this.pool.query(
      `SELECT ri.*, m.canonical_name as material_name, m.unit
       FROM rfq_items ri
       JOIN materials m ON ri.material_id = m.id
       WHERE ri.rfq_id = $1`,
      [rfqId]
    );
    const items = itemsResult.rows;

    // Get offer items for all offers in a single query
    const offerIds = offers.map(o => o.id);
    const allItemsResult = await this.pool.query(
      `SELECT oi.*, ri.qty as requested_qty, m.canonical_name as material_name, m.unit
       FROM offer_items oi
       JOIN rfq_items ri ON oi.rfq_item_id = ri.id
       JOIN materials m ON ri.material_id = m.id
       WHERE oi.offer_id = ANY($1)`,
      [offerIds]
    );

    const itemsByOfferId = new Map<string, OfferItem[]>();
    for (const row of allItemsResult.rows) {
      const item = this.mapOfferItemRow(row);
      if (!itemsByOfferId.has(row.offer_id)) {
        itemsByOfferId.set(row.offer_id, []);
      }
      itemsByOfferId.get(row.offer_id)!.push(item);
    }

    const comparisonData: Array<Offer & { items: OfferItem[] }> = offers.map(offer => ({
      ...offer,
      items: itemsByOfferId.get(offer.id) || [],
    }));

    return {
      items: items.map(row => ({
        id: row.id,
        materialId: row.material_id,
        materialName: row.material_name,
        unit: row.unit,
        qty: parseFloat(row.qty),
        notes: row.notes,
      })),
      offers: comparisonData,
    };
  }

  private mapOfferRow(row: any): Offer {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      rfqId: row.rfq_id,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      currency: row.currency,
      transportCost: row.transport_cost ? parseFloat(row.transport_cost) : null,
      paymentTerms: row.payment_terms,
      leadTimeDays: row.lead_time_days,
      notes: row.notes,
      isWinningOffer: row.is_winning_offer,
      createdAt: new Date(row.created_at),
    };
  }

  private mapOfferItemRow(row: any): OfferItem {
    return {
      id: row.id,
      offerId: row.offer_id,
      rfqItemId: row.rfq_item_id,
      unitPrice: parseFloat(row.unit_price),
      availableQty: row.available_qty ? parseFloat(row.available_qty) : null,
      leadTimeDaysOverride: row.lead_time_days_override,
      notes: row.notes,
      materialName: row.material_name,
      unit: row.unit,
      requestedQty: row.requested_qty ? parseFloat(row.requested_qty) : null,
    };
  }
}
