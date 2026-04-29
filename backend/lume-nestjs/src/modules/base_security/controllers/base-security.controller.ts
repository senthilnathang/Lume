import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import { BaseSecurityService } from '../services/base-security.service';
import {
  CreateApiKeyDto,
  CreateIpAccessDto,
  UpdateIpAccessDto,
  Setup2faDto,
  Verify2faDto,
  Disable2faDto,
  RegenerateBackupCodesDto,
  GetSecurityLogsQuery,
} from '../dtos';
import { RbacGuard } from '@core/guards/rbac.guard';
import { ParseIntPipe } from '@core/pipes/parse-int.pipe';
import { CurrentUser } from '@core/decorators/current-user.decorator';

@Controller('base_security')
export class BaseSecurityController {
  constructor(private readonly service: BaseSecurityService) {}

  @Get('health')
  health() {
    return { success: true, message: 'Base Security module running' };
  }

  // ─── API Keys ─────────────────────────────────────────────

  @Get('api-keys')
  @UseGuards(RbacGuard)
  async getApiKeys(@CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    const keys = await this.service.getApiKeys(user.id);
    return { success: true, data: keys };
  }

  @Post('api-keys')
  @UseGuards(RbacGuard)
  async createApiKey(
    @CurrentUser() user: any,
    @Body() dto: CreateApiKeyDto,
  ) {
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    const key = await this.service.generateApiKey(
      dto.name,
      user.id,
      dto.scopes || [],
    );
    return { success: true, data: key };
  }

  @Delete('api-keys/:id')
  @UseGuards(RbacGuard)
  async revokeApiKey(@Param('id', ParseIntPipe) id: number) {
    await this.service.revokeApiKey(id);
    return { success: true, message: 'API key revoked' };
  }

  // ─── IP Access ────────────────────────────────────────────

  @Get('ip-access')
  @UseGuards(RbacGuard)
  async getIpAccessRules() {
    const rules = await this.service.getIpAccessRules();
    return { success: true, data: rules };
  }

  @Post('ip-access')
  @UseGuards(RbacGuard)
  async createIpAccessRule(@Body() dto: CreateIpAccessDto) {
    const rule = await this.service.createIpAccessRule(
      dto.ipAddress,
      dto.type,
      dto.description,
    );
    return { success: true, data: rule };
  }

  @Put('ip-access/:id')
  @UseGuards(RbacGuard)
  async updateIpAccessRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIpAccessDto,
  ) {
    const rule = await this.service.updateIpAccessRule(id, dto);
    return { success: true, data: rule };
  }

  @Delete('ip-access/:id')
  @UseGuards(RbacGuard)
  async deleteIpAccessRule(@Param('id', ParseIntPipe) id: number) {
    await this.service.deleteIpAccessRule(id);
    return { success: true, message: 'IP access rule deleted' };
  }

  // ─── Sessions ─────────────────────────────────────────────

  @Get('sessions')
  @UseGuards(RbacGuard)
  async getActiveSessions(@CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    const userSessions = await this.service.getActiveSessions(user.id);
    return { success: true, data: userSessions };
  }

  @Delete('sessions/:id')
  @UseGuards(RbacGuard)
  async terminateSession(@Param('id', ParseIntPipe) id: number) {
    await this.service.terminateSession(id);
    return { success: true, message: 'Session revoked' };
  }

  @Delete('sessions/all-other')
  @UseGuards(RbacGuard)
  async terminateAllOtherSessions(
    @CurrentUser() user: any,
    @Headers('authorization') authHeader?: string,
  ) {
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }

    const token = authHeader?.replace('Bearer ', '') || '';
    if (!token) {
      throw new BadRequestException('Authorization token required');
    }

    const result = await this.service.terminateAllOtherSessions(
      user.id,
      token,
    );
    return { success: true, data: result };
  }

  // ─── Security Logs ────────────────────────────────────────

  @Get('logs')
  @UseGuards(RbacGuard)
  async getSecurityLogs(@Query() query: GetSecurityLogsQuery) {
    const logs = await this.service.getSecurityLogs({
      userId: query.userId,
      event: query.event,
      status: query.status,
      limit: query.limit,
    });
    return { success: true, data: logs };
  }

  // ─── Two-Factor Authentication ────────────────────────────

  @Post('2fa/setup')
  @UseGuards(RbacGuard)
  async setup2FA(@CurrentUser() user: any) {
    if (!user || !user.id || !user.email) {
      throw new BadRequestException('User not authenticated');
    }
    const result = await this.service.setup2FA(user.id, user.email);
    return { success: true, data: result };
  }

  @Post('2fa/verify')
  @UseGuards(RbacGuard)
  async verify2FA(
    @CurrentUser() user: any,
    @Body() dto: Verify2faDto,
  ) {
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    if (!dto.token) {
      throw new BadRequestException('Token is required');
    }
    await this.service.verify2FA(user.id, dto.token);
    return { success: true, message: '2FA has been enabled' };
  }

  @Post('2fa/disable')
  @UseGuards(RbacGuard)
  async disable2FA(
    @CurrentUser() user: any,
    @Body() dto: Disable2faDto,
  ) {
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    if (!dto.token) {
      throw new BadRequestException('Token is required');
    }
    await this.service.disable2FA(user.id, dto.token);
    return { success: true, message: '2FA has been disabled' };
  }

  @Get('2fa/status')
  @UseGuards(RbacGuard)
  async get2FAStatus(@CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    const enabled = await this.service.is2FAEnabled(user.id);
    return { success: true, data: { enabled } };
  }

  @Get('2fa/backup-codes')
  @UseGuards(RbacGuard)
  async getBackupCodes(@CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    const backupCodes = await this.service.getBackupCodes(user.id);
    return { success: true, data: { backupCodes } };
  }

  @Post('2fa/backup-codes/regenerate')
  @UseGuards(RbacGuard)
  async regenerateBackupCodes(
    @CurrentUser() user: any,
    @Body() dto: RegenerateBackupCodesDto,
  ) {
    if (!user || !user.id) {
      throw new BadRequestException('User not authenticated');
    }
    if (!dto.token) {
      throw new BadRequestException('Token is required');
    }
    const backupCodes = await this.service.regenerateBackupCodes(
      user.id,
      dto.token,
    );
    return { success: true, data: { backupCodes } };
  }
}
