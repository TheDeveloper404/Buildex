import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { OffersService } from './offers.service';

@Controller('supplier')
export class PublicSupplierController {
  constructor(private readonly offersService: OffersService) {}

  @Get('offer')
  async getOfferContext(@Query('token') token: string) {
    if (!token) {
      return { error: 'Token required' };
    }
    const context = await this.offersService.getRfqContextForToken(token);
    if (!context) {
      return { error: 'Invalid or expired token' };
    }
    return context;
  }

  @Post('offer')
  async submitOffer(
    @Body() data: {
      token: string;
      currency: string;
      transportCost?: number;
      paymentTerms?: string;
      leadTimeDays?: number;
      notes?: string;
      items: { rfqItemId: string; unitPrice: number; availableQty?: number; leadTimeDaysOverride?: number; notes?: string }[];
    },
  ) {
    if (!data.token) {
      return { error: 'Token required' };
    }

    try {
      const offer = await this.offersService.submitPublicOffer(data.token, {
        token: data.token,
        currency: data.currency || 'RON',
        transportCost: data.transportCost,
        paymentTerms: data.paymentTerms,
        leadTimeDays: data.leadTimeDays,
        notes: data.notes,
        items: data.items,
      });
      return { success: true, offerId: offer.id };
    } catch (error) {
      return { error: error.message || 'Failed to submit offer' };
    }
  }
}
