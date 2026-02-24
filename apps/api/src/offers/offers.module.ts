import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { PublicSupplierController } from './public-supplier.controller';
import { OffersService } from './offers.service';

@Module({
  controllers: [OffersController, PublicSupplierController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
