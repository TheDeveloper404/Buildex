import { Controller, Get, Post, Body, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
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
    @Query('supplierId') supplierId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (!materialId) {
      return { error: 'Material ID required' };
    }
    return this.priceEngineService.getPriceHistory(
      req.context.tenantId!,
      materialId,
      city,
      limit ? (parseInt(limit, 10) || 50) : 50,
      {
        supplierId: supplierId || undefined,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      },
    );
  }

  @Get('history/export')
  async exportHistoryCsv(
    @Req() req: Request & { context: RequestContext },
    @Res() res: Response,
    @Query('materialId') materialId: string,
    @Query('city') city?: string,
    @Query('supplierId') supplierId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (!materialId) {
      res.status(400).json({ error: 'Material ID required' });
      return;
    }
    const rows = await this.priceEngineService.getPriceHistory(
      req.context.tenantId!,
      materialId,
      city,
      10000,
      {
        supplierId: supplierId || undefined,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      },
    );

    const header = 'Data,Material,Furnizor,Oras,Pret Unitar,Moneda,Sursa';
    const csvRows = rows.map((r: any) => [
      new Date(r.observedAt).toISOString().slice(0, 10),
      `"${(r.materialName || '').replace(/"/g, '""')}"`,
      `"${(r.supplierName || '').replace(/"/g, '""')}"`,
      `"${(r.city || '').replace(/"/g, '""')}"`,
      r.unitPrice,
      r.currency || 'RON',
      r.source || '',
    ].join(','));

    const csv = [header, ...csvRows].join('\n');
    // BOM for Excel UTF-8 compatibility
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="istoric-preturi.csv"');
    res.send(bom + csv);
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
