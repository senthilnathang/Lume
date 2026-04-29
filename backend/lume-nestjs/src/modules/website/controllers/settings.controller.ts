import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { SettingsService } from '../services/settings.service';

@Controller('api/website')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  // Admin - get all settings
  @Get('settings')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.settings.read')
  async getAll() {
    return this.settingsService.getAll();
  }

  // Admin - update settings (bulk)
  @Put('settings')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.settings.edit')
  async update(@Body() body: Record<string, any>) {
    return this.settingsService.bulkSet(body);
  }
}
