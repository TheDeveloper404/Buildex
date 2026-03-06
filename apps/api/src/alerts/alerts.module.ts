import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsScheduler } from './alerts.scheduler';
import { AlertsWorker } from './alerts.worker';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService, AlertsScheduler, AlertsWorker],
  exports: [AlertsService],
})
export class AlertsModule {}
