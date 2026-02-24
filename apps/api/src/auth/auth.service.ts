import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { User, Session } from '@buildex/shared';

@Injectable()
export class AuthService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findUserById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    return this.mapUserRow(result.rows[0]);
  }

  async findUserByTenantAndEmail(tenantId: string, email: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE tenant_id = $1 AND email = $2',
      [tenantId, email]
    );
    if (result.rows.length === 0) return null;
    return this.mapUserRow(result.rows[0]);
  }

  async findSessionById(id: string): Promise<Session | null> {
    const result = await this.pool.query(
      'SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW()',
      [id]
    );
    if (result.rows.length === 0) return null;
    return this.mapSessionRow(result.rows[0]);
  }

  async createSession(userId: string, tenantId: string, expiresAt: Date): Promise<Session> {
    const result = await this.pool.query(
      'INSERT INTO sessions (user_id, tenant_id, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [userId, tenantId, expiresAt]
    );
    return this.mapSessionRow(result.rows[0]);
  }

  async deleteSession(id: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE id = $1', [id]);
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE expires_at <= NOW()');
  }

  async updateSessionLastSeen(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE sessions SET last_seen_at = NOW() WHERE id = $1',
      [id]
    );
  }

  private mapUserRow(row: any): User {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      name: row.name,
      role: row.role,
      createdAt: new Date(row.created_at),
    };
  }

  private mapSessionRow(row: any): Session {
    return {
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : undefined,
    };
  }
}
