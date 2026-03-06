import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { MaterialsService } from './materials.service';
import { AuthGuard } from '../auth/auth.guard';
import { RequestContext } from '../common/request-context';

@Controller('materials')
@UseGuards(AuthGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  async findAll(@Req() req: Request & { context: RequestContext }) {
    return this.materialsService.findAll(req.context.tenantId!);
  }

  @Get('search')
  async search(
    @Req() req: Request & { context: RequestContext },
    @Query('q') searchTerm: string,
  ) {
    return this.materialsService.searchByAlias(req.context.tenantId!, searchTerm);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    const material = await this.materialsService.findById(id, req.context.tenantId!);
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    return material;
  }

  @Post()
  async create(
    @Req() req: Request & { context: RequestContext },
    @Body() data: { canonicalName: string; unit: string; specJson?: Record<string, any> },
  ) {
    return this.materialsService.create(req.context.tenantId!, {
      canonicalName: data.canonicalName,
      unit: data.unit,
      specJson: data.specJson,
    }, req.context.userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
    @Body() data: { canonicalName?: string; unit?: string; specJson?: Record<string, any> },
  ) {
    return this.materialsService.update(id, req.context.tenantId!, data, req.context.userId);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    await this.materialsService.delete(id, req.context.tenantId!, req.context.userId);
    return { success: true };
  }

  @Get(':id/aliases')
  async findAliases(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    return this.materialsService.findAliases(id, req.context.tenantId!);
  }

  @Post(':id/aliases')
  async createAlias(
    @Param('id') id: string,
    @Req() req: Request & { context: RequestContext },
    @Body() data: { aliasText: string },
  ) {
    return this.materialsService.createAlias(req.context.tenantId!, {
      aliasText: data.aliasText,
      materialId: id,
    }, req.context.userId);
  }

  @Delete(':id/aliases/:aliasId')
  async deleteAlias(
    @Param('aliasId') aliasId: string,
    @Req() req: Request & { context: RequestContext },
  ) {
    await this.materialsService.deleteAlias(aliasId, req.context.tenantId!, req.context.userId);
    return { success: true };
  }
}
