import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
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

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    const offer = await this.offersService.findById(id, req.context.tenantId!);
    if (!offer) {
      return { error: 'Offer not found' };
    }
    const items = await this.offersService.findItems(id);
    return { ...offer, items };
  }

  @Post(':id/win')
  async markWinning(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    return this.offersService.markWinningOffer(id, req.context.tenantId!);
  }
}
