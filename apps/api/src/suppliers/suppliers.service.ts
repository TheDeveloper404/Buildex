import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { Supplier, SupplierCreate, SupplierUpdate } from '@buildex/shared';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class SuppliersService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(tenantId: string): Promise<Supplier[]> {
    const result = await this.pool.query(
      'SELECT * FROM suppliers WHERE tenant_id = $1 ORDER BY name',
      [tenantId]
    );
    return result.rows.map(row => this.mapSupplierRow(row));
  }

  async findById(id: string, tenantId: string): Promise<Supplier | null> {
    const result = await this.pool.query(
      'SELECT * FROM suppliers WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (result.rows.length === 0) return null;
    return this.mapSupplierRow(result.rows[0]);
  }

  async create(tenantId: string, data: SupplierCreate, actorUserId?: string): Promise<Supplier> {
    const result = await this.pool.query(
      'INSERT INTO suppliers (tenant_id, name, email, phone, city) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [tenantId, data.name, data.email || null, data.phone || null, data.city || null]
    );
    const supplier = this.mapSupplierRow(result.rows[0]);
    this.auditLog.log({
      tenantId, actorUserId, action: 'create', entityType: 'supplier', entityId: supplier.id,
      metadata: { name: supplier.name, email: supplier.email },
    }).catch(() => {});
    return supplier;
  }

  async update(id: string, tenantId: string, data: SupplierUpdate, actorUserId?: string): Promise<Supplier> {
    const existing = await this.findById(id, tenantId);
    if (!existing) throw new NotFoundException('Supplier not found');

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(data.name); }
    if (data.email !== undefined) { updates.push(`email = $${paramIndex++}`); values.push(data.email); }
    if (data.phone !== undefined) { updates.push(`phone = $${paramIndex++}`); values.push(data.phone); }
    if (data.city !== undefined) { updates.push(`city = $${paramIndex++}`); values.push(data.city); }

    if (updates.length === 0) return existing;

    values.push(id, tenantId);
    const query = `UPDATE suppliers SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`;
    const result = await this.pool.query(query, values);
    const supplier = this.mapSupplierRow(result.rows[0]);
    this.auditLog.log({
      tenantId, actorUserId, action: 'update', entityType: 'supplier', entityId: id,
      metadata: data,
    }).catch(() => {});
    return supplier;
  }

  async delete(id: string, tenantId: string, actorUserId?: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM suppliers WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (result.rowCount === 0) throw new NotFoundException('Supplier not found');
    this.auditLog.log({
      tenantId, actorUserId, action: 'delete', entityType: 'supplier', entityId: id,
    }).catch(() => {});
  }

  private mapSupplierRow(row: any): Supplier {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      city: row.city,
      createdAt: new Date(row.created_at),
    };
  }
}
