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
import { Permissions } from '@core/decorators';
import { ThemeTemplateService } from '../services/theme-template.service';
import { CreateThemeTemplateDto, UpdateThemeTemplateDto } from '../dtos';

@Controller('api/website')
export class ThemeTemplateController {
  constructor(private themeTemplateService: ThemeTemplateService) {}

  // Admin - get all templates
  @Get('theme-templates')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.theme.read')
  async findAll(@Query('type') type?: string) {
    return this.themeTemplateService.findAll({ type });
  }

  // Admin - get single template
  @Get('theme-templates/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.theme.read')
  async findById(@Param('id') id: string) {
    return this.themeTemplateService.findById(parseInt(id));
  }

  // Admin - create template
  @Post('theme-templates')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.theme.create')
  async create(@Body() dto: CreateThemeTemplateDto) {
    return this.themeTemplateService.create(dto);
  }

  // Admin - update template
  @Put('theme-templates/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.theme.edit')
  async update(@Param('id') id: string, @Body() dto: UpdateThemeTemplateDto) {
    return this.themeTemplateService.update(parseInt(id), dto);
  }

  // Admin - delete template
  @Delete('theme-templates/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.theme.delete')
  async delete(@Param('id') id: string) {
    return this.themeTemplateService.delete(parseInt(id));
  }
}
