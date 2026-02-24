import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PriceEngineService } from './price-engine.service';
import { AuthGuard } from '../auth/auth.guard';
import { RequestContext } from '../common/request-context';

@Controller('price')
@UseGuards(AuthGuard)
export class PriceEngineController {
  constructor(private readonly priceEngineService: PriceEngineService) {}

  @Get('stats')
  async getStats(
    @Req() req: Request & { context: RequestContext },
    @Query('materialId') materialId: string,
    @Query('city') city?: string,
  ) {
    if (!materialId) {
      return { error: 'Material ID required' };
    }
    return this.priceEngineService.getStats(req.context.tenantId!, materialId, city);
  }

  @Get('history')
  async getHistory(
    @Req() req: Request & { context: RequestContext },
    @Query('materialId') materialId: string,
    @Query('city') city?: string,
    @Query('limit') limit?: string,
  ) {
    if (!materialId) {
      return { error: 'Material ID required' };
    }
    return this.priceEngineService.getPriceHistory(
      req.context.tenantId!,
      materialId,
      city,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('history')
  async addPriceEntry(
    @Req() req: Request & { context: RequestContext },
    @Body() body: {
      materialId: string;
      supplierId?: string;
      city?: string;
      unitPrice: number;
      currency?: string;
      observedAt?: string;
    },
  ) {
    if (!body.materialId || !body.unitPrice) {
      return { error: 'Material ID and unit price are required' };
    }

    return this.priceEngineService.addPriceEntry({
      tenantId: req.context.tenantId!,
      materialId: body.materialId,
      supplierId: body.supplierId,
      city: body.city,
      unitPrice: body.unitPrice,
      currency: body.currency || 'RON',
      observedAt: body.observedAt ? new Date(body.observedAt) : new Date(),
      source: 'manual',
    });
  }
}
