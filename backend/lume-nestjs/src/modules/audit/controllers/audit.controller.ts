import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { AuditService } from '../services/audit.service';
import { QueryAuditLogsDto, CleanupAuditLogsDto } from '../dtos';

@Controller('api/audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('audit.read')
  async findAll(@Query() query: QueryAuditLogsDto) {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('audit.read')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.auditService.findById(id);
  }

  @Post('cleanup')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('audit.delete')
  async cleanup(@Body() dto: CleanupAuditLogsDto) {
    return this.auditService.cleanup(dto.days);
  }
}
