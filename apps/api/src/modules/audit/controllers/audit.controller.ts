import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { AuditService } from '../services/audit.service';
import { QueryAuditLogsDto, CleanupAuditLogsDto } from '../dtos';

@Controller(['audit', 'api/audit'])
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('audit.read')
  async findAll(@Query() query: QueryAuditLogsDto, @Req() req: any) {
    return this.auditService.findAll(query, req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('audit.read')
  async findById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.auditService.findById(id, req.user.id);
  }

  @Post('cleanup')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('audit.delete')
  async cleanup(@Body() dto: CleanupAuditLogsDto, @Req() req: any) {
    return this.auditService.cleanup(dto.days, req.user.id);
  }
}
