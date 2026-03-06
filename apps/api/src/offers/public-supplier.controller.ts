import { Controller, Get, Post, Body, Query, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OffersService } from './offers.service';

@Controller('supplier')
@Throttle({ default: { ttl: 60000, limit: 10 } })
export class PublicSupplierController {
  constructor(private readonly offersService: OffersService) {}

  @Get('offer')
  async getOfferContext(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token required');
    }
    const context = await this.offersService.getRfqContextForToken(token);
    if (!context) {
      throw new NotFoundException('Invalid or expired token');
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
      throw new BadRequestException('Token required');
    }
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one item is required');
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
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to submit offer');
    }
  }
}
