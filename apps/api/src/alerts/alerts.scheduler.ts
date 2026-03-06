import { Injectable, OnApplicationBootstrap, OnApplicationShutdown, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, ConnectionOptions } from 'bullmq';

export const ALERTS_QUEUE = 'alerts-check';
export const ALERTS_CHECK_JOB = 'check-all-tenants';
const ALERTS_INTERVAL_MS = 5 * 60 * 1000;

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
export class AlertsScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(AlertsScheduler.name);
  private queue: Queue;

  constructor(private readonly configService: ConfigService) {}

  async onApplicationBootstrap() {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    const connection = parseRedisConnection(redisUrl);

    this.queue = new Queue(ALERTS_QUEUE, { connection });

    // Clear stale repeatable jobs from previous deployments
    const existing = await this.queue.getRepeatableJobs();
    for (const job of existing) {
      await this.queue.removeRepeatableByKey(job.key);
    }

    await this.queue.add(
      ALERTS_CHECK_JOB,
      {},
      { repeat: { every: ALERTS_INTERVAL_MS }, jobId: 'alerts-repeatable' },
    );

    this.logger.log(`Alerts scheduler started — interval: ${ALERTS_INTERVAL_MS / 1000}s`);
  }

  async onApplicationShutdown() {
    await this.queue?.close();
  }
}
