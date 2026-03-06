import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuditLogService } from './audit-log.service';
import { AuthGuard } from '../auth/auth.guard';
import { RequestContext } from '../common/request-context';

@Controller('audit-log')
@UseGuards(AuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async getAuditLog(
    @Req() req: Request & { context: RequestContext },
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditLogService.findByTenant(req.context.tenantId!, {
      entityType,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
