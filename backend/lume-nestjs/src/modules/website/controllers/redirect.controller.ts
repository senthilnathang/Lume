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
import { RedirectService } from '../services/redirect.service';
import { CreateRedirectDto, UpdateRedirectDto } from '../dtos';

@Controller('api/website')
export class RedirectController {
  constructor(private redirectService: RedirectService) {}

  // Admin - get all redirects
  @Get('redirects')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.redirect.read')
  async findAll(@Query() query: any) {
    return this.redirectService.findAll({
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
      search: query.search,
    });
  }

  // Admin - get single redirect
  @Get('redirects/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.redirect.read')
  async findById(@Param('id') id: string) {
    return this.redirectService.findById(parseInt(id));
  }

  // Admin - create redirect
  @Post('redirects')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.redirect.manage')
  async create(@Body() dto: CreateRedirectDto) {
    return this.redirectService.create(dto);
  }

  // Admin - update redirect
  @Put('redirects/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.redirect.manage')
  async update(@Param('id') id: string, @Body() dto: UpdateRedirectDto) {
    return this.redirectService.update(parseInt(id), dto);
  }

  // Admin - delete redirect
  @Delete('redirects/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.redirect.manage')
  async delete(@Param('id') id: string) {
    return this.redirectService.delete(parseInt(id));
  }
}
