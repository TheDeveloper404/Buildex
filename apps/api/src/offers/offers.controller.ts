import { Controller, Get, Post, Body, Param, Query, Req, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { OffersService } from './offers.service';
import { AuthGuard } from '../auth/auth.guard';
import { RequestContext } from '../common/request-context';

@Controller('offers')
@UseGuards(AuthGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get('rfq/:rfqId')
  async findByRfq(
    @Param('rfqId') rfqId: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    return this.offersService.findByRfqId(rfqId, req.context.tenantId!);
  }

  @Get('rfq/:rfqId/compare')
  async getComparison(
    @Param('rfqId') rfqId: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    return this.offersService.getComparisonData(rfqId, req.context.tenantId!);
  }

  @Get('rfq/:rfqId/export')
  async exportComparisonCsv(
    @Param('rfqId') rfqId: string,
    @Req() req: Request & { context: RequestContext },
    @Res() res: Response,
  ) {
    const data = await this.offersService.getComparisonData(rfqId, req.context.tenantId!);
    if (!data || !data.offers || data.offers.length === 0) {
      res.status(404).json({ message: 'No offers found for this RFQ' });
      return;
    }

    // Build CSV: first column is material, then one column per supplier
    const supplierNames = data.offers.map((o: any) => o.supplierName || 'Furnizor');
    const header = ['Material', 'Cantitate', 'Unitate', ...supplierNames.map((n: string) => `${n} (Pret Unitar)`), ...supplierNames.map((n: string) => `${n} (Total)`)];

    const csvRows: string[] = [];
    for (const item of data.items) {
      const row: string[] = [
        `"${item.materialName.replace(/"/g, '""')}"`,
        String(item.qty),
        item.unit,
      ];
      // Unit prices
      for (const offer of data.offers) {
        const oi = offer.items.find((i: any) => i.rfqItemId === item.id);
        row.push(oi ? String(oi.unitPrice) : '');
      }
      // Totals
      for (const offer of data.offers) {
        const oi = offer.items.find((i: any) => i.rfqItemId === item.id);
        row.push(oi ? (oi.unitPrice * item.qty).toFixed(2) : '');
      }
      csvRows.push(row.join(','));
    }

    // Transport row
    const transportRow = ['Transport', '', '', ...data.offers.map((o: any) => o.transportCost != null ? String(o.transportCost) : ''), ...data.offers.map(() => '')];
    csvRows.push(transportRow.join(','));

    // Payment terms row
    const paymentRow = ['Conditii Plata', '', '', ...data.offers.map((o: any) => `"${(o.paymentTerms || '').replace(/"/g, '""')}"`), ...data.offers.map(() => '')];
    csvRows.push(paymentRow.join(','));

    const csv = [header.join(','), ...csvRows].join('\n');
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="comparatie-oferte-${rfqId.slice(0, 8)}.csv"`);
    res.send(bom + csv);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    const offer = await this.offersService.findById(id, req.context.tenantId!);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    const items = await this.offersService.findItems(id);
    return { ...offer, items };
  }

  @Post(':id/win')
  async markWinning(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    return this.offersService.markWinningOffer(id, req.context.tenantId!, req.context.userId);
  }
}
