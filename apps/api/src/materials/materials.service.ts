import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { Material, MaterialCreate, MaterialUpdate, MaterialAlias, MaterialAliasCreate } from '@buildex/shared';

@Injectable()
export class MaterialsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(tenantId: string): Promise<Material[]> {
    const result = await this.pool.query(
      'SELECT * FROM materials WHERE tenant_id = $1 ORDER BY canonical_name',
      [tenantId]
    );
    return result.rows.map(row => this.mapMaterialRow(row));
  }

  async findById(id: string, tenantId: string): Promise<Material | null> {
    const result = await this.pool.query(
      'SELECT * FROM materials WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (result.rows.length === 0) return null;
    return this.mapMaterialRow(result.rows[0]);
  }

  async create(tenantId: string, data: MaterialCreate): Promise<Material> {
    const result = await this.pool.query(
      'INSERT INTO materials (tenant_id, canonical_name, unit, spec_json) VALUES ($1, $2, $3, $4) RETURNING *',
      [tenantId, data.canonicalName, data.unit, data.specJson ? JSON.stringify(data.specJson) : null]
    );
    return this.mapMaterialRow(result.rows[0]);
  }

  async update(id: string, tenantId: string, data: MaterialUpdate): Promise<Material> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundException('Material not found');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.canonicalName !== undefined) {
      updates.push(`canonical_name = $${paramIndex++}`);
      values.push(data.canonicalName);
    }
    if (data.unit !== undefined) {
      updates.push(`unit = $${paramIndex++}`);
      values.push(data.unit);
    }
    if (data.specJson !== undefined) {
      updates.push(`spec_json = $${paramIndex++}`);
      values.push(JSON.stringify(data.specJson));
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id, tenantId);
    const query = `UPDATE materials SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`;
    const result = await this.pool.query(query, values);
    return this.mapMaterialRow(result.rows[0]);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM materials WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (result.rowCount === 0) {
      throw new NotFoundException('Material not found');
    }
  }

  async findAliases(materialId: string, tenantId: string): Promise<MaterialAlias[]> {
    const result = await this.pool.query(
      'SELECT * FROM material_aliases WHERE material_id = $1 AND tenant_id = $2 ORDER BY alias_text',
      [materialId, tenantId]
    );
    return result.rows.map(row => this.mapAliasRow(row));
  }

  async createAlias(tenantId: string, data: MaterialAliasCreate): Promise<MaterialAlias> {
    const result = await this.pool.query(
      'INSERT INTO material_aliases (tenant_id, alias_text, material_id) VALUES ($1, $2, $3) RETURNING *',
      [tenantId, data.aliasText, data.materialId]
    );
    return this.mapAliasRow(result.rows[0]);
  }

  async deleteAlias(id: string, tenantId: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM material_aliases WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (result.rowCount === 0) {
      throw new NotFoundException('Alias not found');
    }
  }

  async searchByAlias(tenantId: string, searchTerm: string): Promise<Material[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT m.* FROM materials m 
       LEFT JOIN material_aliases ma ON m.id = ma.material_id 
       WHERE m.tenant_id = $1 
       AND (m.canonical_name ILIKE $2 OR ma.alias_text ILIKE $2)
       ORDER BY m.canonical_name`,
      [tenantId, `%${searchTerm}%`]
    );
    return result.rows.map(row => this.mapMaterialRow(row));
  }

  private mapMaterialRow(row: any): Material {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      canonicalName: row.canonical_name,
      unit: row.unit,
      specJson: row.spec_json,
      createdAt: new Date(row.created_at),
    };
  }

  private mapAliasRow(row: any): MaterialAlias {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      aliasText: row.alias_text,
      materialId: row.material_id,
      createdAt: new Date(row.created_at),
    };
  }
}
