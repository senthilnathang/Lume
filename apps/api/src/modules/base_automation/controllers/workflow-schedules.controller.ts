import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { resolveTenant } from '../../../graphql/tenant';
import { WorkflowSchedulesService } from '../services/workflow-schedules.service';
import { CreateWorkflowScheduleDto, UpdateWorkflowScheduleDto } from '../dtos/workflow-schedule.dto';

@Controller(['automation/scheduled', 'base_automation/scheduled', 'api/automation/scheduled'])
@UseGuards(JwtAuthGuard, RbacGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class WorkflowSchedulesController {
  constructor(private schedules: WorkflowSchedulesService) {}
  private actor(req: any) { return { userId: req.user.sub ?? req.user.id, companyId: resolveTenant(req) }; }
  @Get('workflows') @Permissions('base_automation.scheduled.manage')
  workflows() { return { success: true, data: this.schedules.workflows() }; }
  @Get() @Permissions('base_automation.scheduled')
  list(@Req() req: any) { return this.schedules.list(this.actor(req)); }
  @Get(':id') @Permissions('base_automation.scheduled')
  get(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.schedules.get(id, this.actor(req)); }
  @Post() @Permissions('base_automation.scheduled.manage')
  create(@Body() dto: CreateWorkflowScheduleDto, @Req() req: any) { return this.schedules.create(dto, this.actor(req)); }
  @Put(':id') @Permissions('base_automation.scheduled.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWorkflowScheduleDto, @Req() req: any) { return this.schedules.update(id, dto, this.actor(req)); }
  @Delete(':id') @Permissions('base_automation.scheduled.manage')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.schedules.remove(id, this.actor(req)); }
}
