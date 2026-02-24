import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AlertsService } from './alerts.service';
import { AuthGuard } from '../auth/auth.guard';
import { RequestContext } from '../common/request-context';

@Controller('alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('rules')
  async getRules(@Req() req: Request & { context: RequestContext }) {
    return this.alertsService.findRules(req.context.tenantId!);
  }

  @Post('rules')
  async createRule(@Req() req: Request & { context: RequestContext }, @Body() body: any) {
    return this.alertsService.createRule(req.context.tenantId!, {
      materialId: body.materialId,
      ruleType: body.ruleType,
      params: body.params || {},
    });
  }

  @Delete('rules/:id')
  async deleteRule(@Req() req: Request & { context: RequestContext }, @Param('id') id: string) {
    await this.alertsService.deleteRule(id, req.context.tenantId!);
    return { deleted: true };
  }

  @Get()
  async getAlerts(@Req() req: Request & { context: RequestContext }) {
    return this.alertsService.findAlerts(req.context.tenantId!);
  }

  @Post(':id/ack')
  async acknowledgeAlert(@Req() req: Request & { context: RequestContext }, @Param('id') id: string) {
    return this.alertsService.acknowledgeAlert(id, req.context.tenantId!);
  }

  @Post('check')
  async checkAlerts(@Req() req: Request & { context: RequestContext }) {
    await this.alertsService.checkAndTriggerAlerts(req.context.tenantId!);
    return { checked: true };
  }
}
