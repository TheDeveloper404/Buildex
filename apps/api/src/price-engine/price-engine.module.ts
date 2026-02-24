import { Module } from '@nestjs/common';
import { PriceEngineController } from './price-engine.controller';
import { PriceEngineService } from './price-engine.service';

@Module({
  controllers: [PriceEngineController],
  providers: [PriceEngineService],
  exports: [PriceEngineService],
})
export class PriceEngineModule {}
