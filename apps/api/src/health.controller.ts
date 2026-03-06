import { Controller, Get, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './database/database.module';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  root() {
    return {
      name: 'Buildex API',
      version: '0.1.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('healthz')
  async health() {
    const [dbOk, redisOk] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const healthy = dbOk && redisOk;
    return {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? 'connected' : 'disconnected',
        redis: redisOk ? 'connected' : 'disconnected',
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (err) {
      this.logger.error(`Database health check failed: ${err.message}`);
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:6379');
    const client = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 2000, maxRetriesPerRequest: 0 });
    try {
      await client.connect();
      await client.ping();
      return true;
    } catch (err) {
      this.logger.error(`Redis health check failed: ${err.message}`);
      return false;
    } finally {
      await client.quit().catch(() => {});
    }
  }
}
