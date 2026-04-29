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
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto, UpdateCategoryDto, ReorderCategoriesDto } from '../dtos';

@Controller('api/website')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  // Public - get all categories
  @Get('public/categories')
  @Public()
  async getPublic(@Query() query: any) {
    return this.categoryService.findAll({ search: query.search });
  }

  // Public - get category by slug
  @Get('public/categories/:slug')
  @Public()
  async getBySlug(@Param('slug') slug: string) {
    return this.categoryService.findBySlug(slug);
  }

  // Public - get pages in category
  @Get('public/categories/:slug/pages')
  @Public()
  async getPagesBySlug(@Param('slug') slug: string) {
    const cat = await this.categoryService.findBySlug(slug);
    if (!cat.success) return cat;
    return this.categoryService.findPagesByCategory(cat.data.id);
  }

  // Admin - get all categories
  @Get('categories')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.category.read')
  async findAll(@Query() query: any) {
    return this.categoryService.findAll({ search: query.search });
  }

  // Admin - get single category
  @Get('categories/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.category.read')
  async findById(@Param('id') id: string) {
    return this.categoryService.findById(parseInt(id));
  }

  // Admin - create category
  @Post('categories')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.category.manage')
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  // Admin - update category
  @Put('categories/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.category.manage')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(parseInt(id), dto);
  }

  // Admin - delete category
  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.category.manage')
  async delete(@Param('id') id: string) {
    return this.categoryService.delete(parseInt(id));
  }

  // Admin - reorder categories
  @Put('categories/reorder')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.category.manage')
  async reorder(@Body() dto: ReorderCategoriesDto) {
    return this.categoryService.reorder(dto.items);
  }
}
