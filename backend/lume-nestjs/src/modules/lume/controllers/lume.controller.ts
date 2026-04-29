import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { LumeService } from '../services/lume.service';
import { Public, Permissions } from '@core/decorators';

@Controller('api/lume')
export class LumeController {
  constructor(private service: LumeService) {}

  @Get('health')
  @Public()
  async getHealth() {
    return this.service.getHealth();
  }

  @Get('version')
  @Public()
  async getVersion() {
    return this.service.getVersion();
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('lume.admin')
  async getStatus() {
    return this.service.getStatus();
  }

  @Get('system-info')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('lume.admin')
  async getSystemInfo() {
    return this.service.getSystemInfo();
  }

  @Get('dashboard-metrics')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('lume.admin')
  async getDashboardMetrics() {
    return this.service.getDashboardMetrics();
  }
}
