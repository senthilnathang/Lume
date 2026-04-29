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
import { PopupService } from '../services/popup.service';
import { CreatePopupDto, UpdatePopupDto } from '../dtos';

@Controller('api/website')
export class PopupController {
  constructor(private popupService: PopupService) {}

  // Admin - get all popups
  @Get('popups')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.popup.read')
  async findAll(@Query() query: any) {
    return this.popupService.findAll({
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
      search: query.search,
    });
  }

  // Admin - get single popup
  @Get('popups/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.popup.read')
  async findById(@Param('id') id: string) {
    return this.popupService.findById(parseInt(id));
  }

  // Admin - create popup
  @Post('popups')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.popup.create')
  async create(@Body() dto: CreatePopupDto) {
    return this.popupService.create(dto);
  }

  // Admin - update popup
  @Put('popups/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.popup.edit')
  async update(@Param('id') id: string, @Body() dto: UpdatePopupDto) {
    return this.popupService.update(parseInt(id), dto);
  }

  // Admin - delete popup
  @Delete('popups/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.popup.delete')
  async delete(@Param('id') id: string) {
    return this.popupService.delete(parseInt(id));
  }
}
