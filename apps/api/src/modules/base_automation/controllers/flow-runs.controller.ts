import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { resolveTenant } from '../../../graphql/tenant';
import { FlowRunsService } from '../services/flow-runs.service';

class RunFlowDto {
  @IsInt() @Min(1) @Max(2147483647) recordId: number;
  @IsUUID('4') requestId: string;
}
@Controller(['automation/flows', 'base_automation/flows', 'api/automation/flows'])
@UseGuards(JwtAuthGuard, RbacGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class FlowRunsController {
  constructor(private runs: FlowRunsService) {}
  private actor(req: any) { return { userId: req.user.sub ?? req.user.id, companyId: resolveTenant(req) }; }
  @Post(':id/run') @Permissions('base_automation.flows.manage')
  run(@Param('id', ParseIntPipe) id: number, @Body() dto: RunFlowDto, @Req() req: any) { return this.runs.run(id, dto.recordId, dto.requestId, this.actor(req)); }
  @Get(':id/runs/:jobId') @Permissions('base_automation.flows')
  get(@Param('id', ParseIntPipe) id: number, @Param('jobId', ParseIntPipe) jobId: number, @Req() req: any) { return this.runs.get(id, jobId, this.actor(req)); }
  @Get(':id/runs') @Permissions('base_automation.flows')
  list(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.runs.list(id, this.actor(req)); }
}
