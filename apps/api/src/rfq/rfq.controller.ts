import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { RfqService } from './rfq.service';
import { AuthGuard } from '../auth/auth.guard';
import { RequestContext } from '../common/request-context';

@Controller('rfqs')
@UseGuards(AuthGuard)
export class RfqController {
  constructor(private readonly rfqService: RfqService) {}

  @Get()
  async findAll(@Req() req: Request & { context: RequestContext }) {
    return this.rfqService.findAll(req.context.tenantId!);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    const rfq = await this.rfqService.findById(id, req.context.tenantId!);
    if (!rfq) {
      return { error: 'RFQ not found' };
    }
    const items = await this.rfqService.findItems(id);
    const invites = await this.rfqService.findInvites(id);
    return { ...rfq, items, invites };
  }

  @Post()
  async create(
    @Req() req: Request & { context: RequestContext },
    @Body() data: { 
      projectName: string; 
      deliveryCity: string; 
      desiredDate?: Date;
      items: { materialId: string; qty: number; notes?: string }[];
    },
  ) {
    return this.rfqService.create(req.context.tenantId!, {
      projectName: data.projectName,
      deliveryCity: data.deliveryCity,
      desiredDate: data.desiredDate,
      items: data.items,
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
    @Body() data: { projectName?: string; deliveryCity?: string; desiredDate?: Date | null },
  ) {
    return this.rfqService.update(id, req.context.tenantId!, data);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    await this.rfqService.delete(id, req.context.tenantId!);
    return { success: true };
  }

  @Post(':id/send')
  async sendRfq(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
    @Body() data: { supplierIds: string[] },
  ) {
    return this.rfqService.sendRfq(id, req.context.tenantId!, data.supplierIds);
  }
}
