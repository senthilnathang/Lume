import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { PolicyGuard, RequireRoles } from '@core/permission/policy.guard';
import { AdminSettingsService } from '../services/admin-settings.service';
import { MenuInput, UpdateMenuInput, SequenceInput } from '../dtos/admin-settings.dto';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, PolicyGuard)
@RequireRoles('admin', 'super_admin')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdminSettingsController {
  constructor(private readonly settings: AdminSettingsService) {}
  @Get('menus') async menus() { return { success: true, data: await this.settings.menus() }; }
  @Post('menus') async createMenu(@Body() input: MenuInput) { return { success: true, data: await this.settings.saveMenu(input) }; }
  @Put('menus/:id') async updateMenu(@Param('id', ParseIntPipe) id: number, @Body() input: UpdateMenuInput) { return { success: true, data: await this.settings.saveMenu(input, id) }; }
  @Delete('menus/:id') async deleteMenu(@Param('id', ParseIntPipe) id: number) { return { success: true, data: await this.settings.deleteMenu(id) }; }
  @Get('sequences') async sequences() { return { success: true, data: await this.settings.sequences() }; }
  @Post('sequences') async createSequence(@Body() input: SequenceInput) { return { success: true, data: await this.settings.createSequence(input) }; }
  @Delete('sequences/:id') async deleteSequence(@Param('id', ParseIntPipe) id: number) { return { success: true, data: await this.settings.deleteSequence(id) }; }
  @Post('sequences/:code/next') async next(@Param('code') code: string) { return { success: true, data: await this.settings.nextSequence(code) }; }
}
