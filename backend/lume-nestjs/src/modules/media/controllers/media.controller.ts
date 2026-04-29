import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { MediaService } from '../services/media.service';
import {
  CreateMediaDto,
  UpdateMediaDto,
  QueryMediaDto,
} from '../dtos';
import { Public, Permissions, CurrentUser } from '@core/decorators';

@Controller('api/media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('media.read')
  async getStats() {
    return this.mediaService.getStats();
  }

  @Get('featured')
  @Public()
  async getFeatured() {
    return this.mediaService.getFeatured();
  }

  @Get('category/:category')
  @Public()
  async getByCategory(@Param('category') category: string) {
    return this.mediaService.getByCategory(category);
  }

  @Get()
  @Public()
  async findAll(@Query() query: QueryMediaDto) {
    return this.mediaService.findAll(query);
  }

  @Get(':id')
  @Public()
  async findById(@Param('id') id: string) {
    return this.mediaService.findById(parseInt(id, 10));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('media.write')
  async create(@Body() dto: CreateMediaDto, @CurrentUser() user: any) {
    return this.mediaService.create({ ...dto, uploadedBy: user.id });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('media.write')
  async update(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.update(parseInt(id, 10), dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('media.delete')
  async delete(@Param('id') id: string) {
    return this.mediaService.delete(parseInt(id, 10));
  }

  @Post(':id/download')
  @Public()
  async incrementDownloads(@Param('id') id: string) {
    return this.mediaService.incrementDownloads(parseInt(id, 10));
  }
}
