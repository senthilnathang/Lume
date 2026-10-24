import { BadRequestException, Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { RecordRuleManagementService } from '../services/record-rule-management.service';
import { RecordRuleInput, UpdateRecordRuleInput } from '../dtos/admin-settings.dto';

@Controller('admin/record-rules')
@UseGuards(JwtAuthGuard, RbacGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class RecordRulesController {
  constructor(private readonly rules: RecordRuleManagementService) {}
  @Get()
  @Permissions('base.record_rules.read')
  async list(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number, @Query('modelName') modelName?: string) {
    if (page < 1 || limit < 1 || limit > 500) throw new BadRequestException('Invalid pagination');
    return { success: true, data: await this.rules.list(modelName, page, limit) };
  }
  @Post()
  @Permissions('base.record_rules.create')
  async create(@Body() input: RecordRuleInput, @Req() req: any) { return { success: true, data: await this.rules.create(input, req.user.id) }; }
  @Put(':id')
  @Permissions('base.record_rules.update')
  async update(@Param('id', ParseIntPipe) id: number, @Body() input: UpdateRecordRuleInput, @Req() req: any) { return { success: true, data: await this.rules.update(id, input, req.user.id) }; }
  @Delete(':id')
  @Permissions('base.record_rules.delete')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return { success: true, data: await this.rules.delete(id, req.user.id) }; }
}
