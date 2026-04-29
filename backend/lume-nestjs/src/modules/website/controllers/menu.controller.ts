import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { MenuService } from '../services/menu.service';
import {
  CreateMenuDto,
  UpdateMenuDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
  ReorderMenuItemsDto,
} from '../dtos';

@Controller('api/website')
export class MenuController {
  constructor(private menuService: MenuService) {}

  // Admin - get all menus
  @Get('menus')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.menu.read')
  async findAll() {
    return this.menuService.findAll();
  }

  // Admin - get menu with items
  @Get('menus/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.menu.read')
  async findWithItems(@Param('id') id: string) {
    return this.menuService.findWithItems(parseInt(id));
  }

  // Admin - create menu
  @Post('menus')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.menu.manage')
  async create(@Body() dto: CreateMenuDto) {
    return this.menuService.create(dto);
  }

  // Admin - update menu
  @Put('menus/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.menu.manage')
  async update(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.menuService.update(parseInt(id), dto);
  }

  // Admin - delete menu
  @Delete('menus/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.menu.manage')
  async delete(@Param('id') id: string) {
    return this.menuService.delete(parseInt(id));
  }

  // Admin - reorder menu items
  @Put('menus/:id/reorder')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.menu.manage')
  async reorderItems(@Param('id') id: string, @Body() dto: ReorderMenuItemsDto) {
    return this.menuService.reorderItems(parseInt(id), dto.items);
  }

  // Admin - add menu item
  @Post('menus/:id/items')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.menu.manage')
  async addItem(@Param('id') id: string, @Body() dto: CreateMenuItemDto) {
    return this.menuService.addItem(parseInt(id), dto);
  }

  // Admin - update menu item
  @Put('menu-items/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.menu.manage')
  async updateItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menuService.updateItem(parseInt(id), dto);
  }

  // Admin - delete menu item
  @Delete('menu-items/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.menu.manage')
  async deleteItem(@Param('id') id: string) {
    return this.menuService.deleteItem(parseInt(id));
  }
}
