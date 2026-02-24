import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { Rfq, RfqCreate, RfqUpdate, RfqItem, SupplierInvite, RfqStatus } from '@buildex/shared';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RfqService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(tenantId: string): Promise<Rfq[]> {
    const result = await this.pool.query(
      'SELECT * FROM rfqs WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    return result.rows.map(row => this.mapRfqRow(row));
  }

  async findById(id: string, tenantId: string): Promise<Rfq | null> {
    const result = await this.pool.query(
      'SELECT * FROM rfqs WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRfqRow(result.rows[0]);
  }

  async findItems(rfqId: string): Promise<RfqItem[]> {
    const result = await this.pool.query(
      `SELECT ri.*, m.canonical_name as material_name, m.unit 
       FROM rfq_items ri 
       JOIN materials m ON ri.material_id = m.id 
       WHERE ri.rfq_id = $1`,
      [rfqId]
    );
    return result.rows.map(row => ({
      id: row.id,
      rfqId: row.rfq_id,
      materialId: row.material_id,
      qty: parseFloat(row.qty),
      notes: row.notes,
      materialName: row.material_name,
      unit: row.unit,
    }));
  }

  async create(tenantId: string, data: RfqCreate): Promise<Rfq> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create RFQ
      const rfqResult = await client.query(
        'INSERT INTO rfqs (tenant_id, project_name, delivery_city, desired_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [tenantId, data.projectName, data.deliveryCity, data.desiredDate || null, 'draft']
      );
      const rfq = this.mapRfqRow(rfqResult.rows[0]);

      // Create items
      for (const item of data.items) {
        await client.query(
          'INSERT INTO rfq_items (rfq_id, material_id, qty, notes) VALUES ($1, $2, $3, $4)',
          [rfq.id, item.materialId, item.qty, item.notes || null]
        );
      }

      await client.query('COMMIT');
      return rfq;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: string, tenantId: string, data: RfqUpdate): Promise<Rfq> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundException('RFQ not found');
    }

    if (existing.status !== 'draft') {
      throw new BadRequestException('Can only edit draft RFQs');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.projectName !== undefined) {
      updates.push(`project_name = $${paramIndex++}`);
      values.push(data.projectName);
    }
    if (data.deliveryCity !== undefined) {
      updates.push(`delivery_city = $${paramIndex++}`);
      values.push(data.deliveryCity);
    }
    if (data.desiredDate !== undefined) {
      updates.push(`desired_date = $${paramIndex++}`);
      values.push(data.desiredDate);
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id, tenantId);
    const query = `UPDATE rfqs SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`;
    const result = await this.pool.query(query, values);
    return this.mapRfqRow(result.rows[0]);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundException('RFQ not found');
    }

    if (existing.status !== 'draft') {
      throw new BadRequestException('Can only delete draft RFQs');
    }

    await this.pool.query('DELETE FROM rfqs WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  }

  async sendRfq(id: string, tenantId: string, supplierIds: string[]): Promise<{ invites: SupplierInvite[] }> {
    const rfq = await this.findById(id, tenantId);
    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    if (rfq.status !== 'draft') {
      throw new BadRequestException('RFQ already sent');
    }

    // Verify suppliers exist and belong to tenant
    const suppliers: Array<{ id: string; email: string; name: string }> = [];
    for (const supplierId of supplierIds) {
      const supplierResult = await this.pool.query(
        'SELECT id, email, name FROM suppliers WHERE id = $1 AND tenant_id = $2',
        [supplierId, tenantId]
      );
      if (supplierResult.rows.length === 0) {
        throw new NotFoundException(`Supplier ${supplierId} not found`);
      }
      suppliers.push(supplierResult.rows[0]);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const invites: SupplierInvite[] = [];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14); // 14 days expiration

      const webUrl = this.configService.get('WEB_URL', 'http://localhost:3000');

      for (const supplier of suppliers) {
        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(token, 10);

        const result = await client.query(
          'INSERT INTO supplier_invites (rfq_id, supplier_id, token_hash, expires_at, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [id, supplier.id, tokenHash, expiresAt, 'pending']
        );
        invites.push(this.mapInviteRow(result.rows[0]));

        // Send email with token
        const tokenUrl = `${webUrl}/supplier/offer?token=${token}`;
        await this.emailService.sendRfqInvitation({
          to: supplier.email,
          supplierName: supplier.name,
          projectName: rfq.projectName,
          tokenUrl,
          expiresAt,
        });
      }

      // Update RFQ status to sent
      await client.query(
        'UPDATE rfqs SET status = $1 WHERE id = $2',
        ['sent', id]
      );

      await client.query('COMMIT');
      return { invites };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findInvites(rfqId: string): Promise<SupplierInvite[]> {
    const result = await this.pool.query(
      `SELECT si.*, s.name as supplier_name, s.email as supplier_email 
       FROM supplier_invites si 
       JOIN suppliers s ON si.supplier_id = s.id 
       WHERE si.rfq_id = $1`,
      [rfqId]
    );
    return result.rows.map(row => this.mapInviteRow(row));
  }

  private mapRfqRow(row: any): Rfq {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      projectName: row.project_name,
      deliveryCity: row.delivery_city,
      desiredDate: row.desired_date ? new Date(row.desired_date) : null,
      status: row.status as RfqStatus,
      createdAt: new Date(row.created_at),
    };
  }

  private mapInviteRow(row: any): SupplierInvite {
    return {
      id: row.id,
      rfqId: row.rfq_id,
      supplierId: row.supplier_id,
      tokenHash: row.token_hash,
      expiresAt: new Date(row.expires_at),
      status: row.status,
      createdAt: new Date(row.created_at),
      supplierName: row.supplier_name,
      supplierEmail: row.supplier_email,
    };
  }
}
