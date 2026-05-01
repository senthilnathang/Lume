import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { PlatformConfigService } from '../services/platform-config.service';
import { Permissions } from '@core/decorators';
import { CreatePlatformConfigDto, UpdatePlatformConfigDto } from '../dtos';

@Controller('api/platform/config')
export class PlatformConfigController {
  constructor(private service: PlatformConfigService) {}

  @Get('settings')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('platform-config.read')
  async getSettings() {
    return this.service.getSettings();
  }

  @Get('settings/:key')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('platform-config.read')
  async getSetting(@Param('key') key: string) {
    return this.service.getSetting(key);
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('platform-config.write')
  async createSetting(@Body() dto: CreatePlatformConfigDto) {
    return this.service.setSetting(dto.key, dto);
  }

  @Put('settings/:key')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('platform-config.write')
  async updateSetting(@Param('key') key: string, @Body() dto: UpdatePlatformConfigDto) {
    return this.service.updateSetting(key, dto);
  }

  @Delete('settings/:key')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('platform-config.write')
  async deleteSetting(@Param('key') key: string) {
    return this.service.deleteSetting(key);
  }

  @Post('initialize')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('platform-config.write')
  async initialize() {
    return this.service.initializeDefaults();
  }
}
