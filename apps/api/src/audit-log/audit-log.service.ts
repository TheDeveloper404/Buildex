import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { v4 as uuid } from 'uuid';

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadataJson: Record<string, any> | null;
  createdAt: Date;
}

@Injectable()
export class AuditLogService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async log(params: {
    tenantId: string;
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_log (id, tenant_id, actor_user_id, action, entity_type, entity_id, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuid(),
        params.tenantId,
        params.actorUserId || null,
        params.action,
        params.entityType,
        params.entityId,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ],
    );
  }

  async findByTenant(
    tenantId: string,
    options?: { entityType?: string; limit?: number; offset?: number },
  ): Promise<{ data: AuditLogEntry[]; total: number; limit: number; offset: number }> {
    const limit = Math.min(options?.limit || 50, 500);
    const offset = options?.offset || 0;

    let whereClause = `WHERE tenant_id = $1`;
    const params: any[] = [tenantId];

    if (options?.entityType) {
      params.push(options.entityType);
      whereClause += ` AND entity_type = $${params.length}`;
    }

    const countQuery = `SELECT COUNT(*) FROM audit_log ${whereClause}`;
    const dataQuery = `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const dataParams = [...params, limit, offset];

    const [countResult, dataResult] = await Promise.all([
      this.pool.query(countQuery, params),
      this.pool.query(dataQuery, dataParams),
    ]);

    return {
      data: dataResult.rows.map(this.mapRow),
      total: parseInt(countResult.rows[0].count, 10),
      limit,
      offset,
    };
  }

  private mapRow(row: any): AuditLogEntry {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      actorUserId: row.actor_user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadataJson: row.metadata_json
        ? typeof row.metadata_json === 'string'
          ? JSON.parse(row.metadata_json)
          : row.metadata_json
        : null,
      createdAt: new Date(row.created_at),
    };
  }
}
