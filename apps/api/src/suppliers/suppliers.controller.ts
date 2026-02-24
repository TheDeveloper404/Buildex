import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SuppliersService } from './suppliers.service';
import { AuthGuard } from '../auth/auth.guard';
import { RequestContext } from '../common/request-context';

@Controller('suppliers')
@UseGuards(AuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async findAll(@Req() req: Request & { context: RequestContext }) {
    return this.suppliersService.findAll(req.context.tenantId!);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    const supplier = await this.suppliersService.findById(id, req.context.tenantId!);
    if (!supplier) {
      return { error: 'Supplier not found' };
    }
    return supplier;
  }

  @Post()
  async create(
    @Req() req: Request & { context: RequestContext },
    @Body() data: { name: string; email?: string; phone?: string; city?: string },
  ) {
    return this.suppliersService.create(req.context.tenantId!, data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
    @Body() data: { name?: string; email?: string | null; phone?: string | null; city?: string | null },
  ) {
    return this.suppliersService.update(id, req.context.tenantId!, data);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    await this.suppliersService.delete(id, req.context.tenantId!);
    return { success: true };
  }
}
