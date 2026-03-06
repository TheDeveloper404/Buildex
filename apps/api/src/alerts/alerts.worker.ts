import { Injectable, OnApplicationBootstrap, OnApplicationShutdown, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job, ConnectionOptions } from 'bullmq';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { AlertsService } from './alerts.service';
import { ALERTS_QUEUE, ALERTS_CHECK_JOB } from './alerts.scheduler';

function parseRedisConnection(url: string): ConnectionOptions {
  const parsed = new URL(url);
  const isTls = parsed.protocol === 'rediss:';
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || (isTls ? '6380' : '6379'), 10),
    password: parsed.password || undefined,
    ...(isTls ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  } as ConnectionOptions;
}

@Injectable()
export class AlertsWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(AlertsWorker.name);
  private worker: Worker;

  constructor(
    private readonly alertsService: AlertsService,
    private readonly configService: ConfigService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  async onApplicationBootstrap() {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    const connection = parseRedisConnection(redisUrl);

    this.worker = new Worker(
      ALERTS_QUEUE,
      async (job: Job) => {
        if (job.name === ALERTS_CHECK_JOB) {
          await this.checkAllTenants();
        }
      },
      { connection },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Alerts check completed (job ${job.id})`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Alerts check failed (job ${job?.id}): ${err.message}`);
    });

    this.logger.log('Alerts worker started');
  }

  private async checkAllTenants(): Promise<void> {
    const result = await this.pool.query('SELECT id FROM tenants ORDER BY created_at');

    let checked = 0;
    for (const row of result.rows) {
      try {
        await this.alertsService.checkAndTriggerAlerts(row.id);
        checked++;
      } catch (err) {
        this.logger.error(`Alert check failed for tenant ${row.id}: ${err.message}`);
      }
    }

    this.logger.log(`Alerts checked for ${checked}/${result.rows.length} tenant(s)`);
  }

  async onApplicationShutdown() {
    await this.worker?.close();
  }
}
