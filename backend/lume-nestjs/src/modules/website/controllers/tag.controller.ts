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
import { Public, Permissions } from '@core/decorators';
import { TagService } from '../services/tag.service';
import { CreateTagDto, UpdateTagDto } from '../dtos';

@Controller('api/website')
export class TagController {
  constructor(private tagService: TagService) {}

  // Public - get all tags
  @Get('public/tags')
  @Public()
  async getPublic(@Query() query: any) {
    return this.tagService.findAll({ search: query.search });
  }

  // Public - get tag by slug
  @Get('public/tags/:slug')
  @Public()
  async getBySlug(@Param('slug') slug: string) {
    return this.tagService.findBySlug(slug);
  }

  // Public - get pages with tag
  @Get('public/tags/:slug/pages')
  @Public()
  async getPagesBySlug(@Param('slug') slug: string) {
    const tag = await this.tagService.findBySlug(slug);
    if (!tag.success) return tag;
    return this.tagService.findPagesByTag(tag.data.id);
  }

  // Admin - get all tags
  @Get('tags')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.tag.read')
  async findAll(@Query() query: any) {
    return this.tagService.findAll({ search: query.search });
  }

  // Admin - get single tag
  @Get('tags/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.tag.read')
  async findById(@Param('id') id: string) {
    return this.tagService.findById(parseInt(id));
  }

  // Admin - create tag
  @Post('tags')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.tag.manage')
  async create(@Body() dto: CreateTagDto) {
    return this.tagService.create(dto);
  }

  // Admin - update tag
  @Put('tags/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.tag.manage')
  async update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tagService.update(parseInt(id), dto);
  }

  // Admin - delete tag
  @Delete('tags/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.tag.manage')
  async delete(@Param('id') id: string) {
    return this.tagService.delete(parseInt(id));
  }
}
