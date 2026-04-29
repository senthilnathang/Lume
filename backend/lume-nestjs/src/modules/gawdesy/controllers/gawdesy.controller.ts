import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { GawdesyService } from '../services/gawdesy.service';
import { Permissions } from '@core/decorators';
import { CreateGawdesySettingDto, UpdateGawdesySettingDto } from '../dtos';

@Controller('api/gawdesy')
export class GawdesyController {
  constructor(private service: GawdesyService) {}

  @Get('settings')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('gawdesy.read')
  async getSettings() {
    return this.service.getSettings();
  }

  @Get('settings/:key')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('gawdesy.read')
  async getSetting(@Param('key') key: string) {
    return this.service.getSetting(key);
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('gawdesy.write')
  async createSetting(@Body() dto: CreateGawdesySettingDto) {
    return this.service.setSetting(dto.key, dto);
  }

  @Put('settings/:key')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('gawdesy.write')
  async updateSetting(@Param('key') key: string, @Body() dto: UpdateGawdesySettingDto) {
    return this.service.updateSetting(key, dto);
  }

  @Delete('settings/:key')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('gawdesy.write')
  async deleteSetting(@Param('key') key: string) {
    return this.service.deleteSetting(key);
  }

  @Post('initialize')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('gawdesy.write')
  async initialize() {
    return this.service.initializeDefaults();
  }
}
