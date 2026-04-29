import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { SettingsService } from '../services/settings.service';
import { CreateSettingDto, UpdateSettingDto } from '../dtos';
import { Public, Permissions } from '@core/decorators';

@Controller('api/settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('public')
  @Public()
  async getPublic() {
    return this.settingsService.getPublic();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('settings.read')
  async getAll() {
    return this.settingsService.getAll();
  }

  @Get('category/:category')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('settings.read')
  async getByCategory(@Param('category') category: string) {
    return this.settingsService.getByCategory(category);
  }

  @Get(':key')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('settings.read')
  async getSingle(@Param('key') key: string) {
    const value = await this.settingsService.get(key);
    if (value === null) {
      return { success: false, error: 'Setting not found' };
    }
    return { success: true, data: { key, value } };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('settings.write')
  async create(@Body() dto: CreateSettingDto) {
    const result = await this.settingsService.set(dto.key, dto.value, dto);
    return result;
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('settings.write')
  async update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.settingsService.set(key, dto.value, dto);
  }

  @Delete(':key')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('settings.write')
  async delete(@Param('key') key: string) {
    return this.settingsService.delete(key);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('settings.write')
  async bulkSet(@Body('settings') settings: CreateSettingDto[]) {
    return this.settingsService.bulkSet(settings);
  }

  @Post('initialize')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('settings.write')
  async initialize() {
    return this.settingsService.initializeDefaults();
  }
}
