import { Body, Controller, ForbiddenException, Get, HttpCode, Param, ParseIntPipe, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Permissions } from '@core/decorators';
import { RbacGuard } from '@core/guards/rbac.guard';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { resolveTenant } from '../../../graphql/tenant';
import { ApprovalChainEngineService, ApprovalContext } from '../services/approval-chain-engine.service';
import { ApproveRequestDto, CreateApprovalRequestDto, RejectApprovalRequestDto } from '../dtos/approval-request.dto';

@Controller('api/automation/approval-requests')
@UseGuards(JwtAuthGuard, RbacGuard)
@Permissions('base_automation.approvals')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class ApprovalRequestsController {
  constructor(private approvals: ApprovalChainEngineService) {}

  private context(req: any): ApprovalContext {
    const companyId = resolveTenant(req);
    const userId = req.user?.sub ?? req.user?.id;
    if (companyId == null || !Number.isSafeInteger(userId) || userId < 1) {
      throw new ForbiddenException('Authenticated tenant and actor required');
    }
    return { companyId, userId };
  }

  @Post()
  async create(@Body() input: CreateApprovalRequestDto, @Req() req: any) {
    return { success: true, data: await this.approvals.createApprovalRequest(input, this.context(req)) };
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return { success: true, data: await this.approvals.getApprovalRequest(id, this.context(req)) };
  }

  @Post(':id/approve')
  @HttpCode(200)
  async approve(@Param('id', ParseIntPipe) id: number, @Body() input: ApproveRequestDto, @Req() req: any) {
    return { success: await this.approvals.approveStep(id, input.stepIndex, this.context(req)) };
  }

  @Post(':id/reject')
  @HttpCode(200)
  async reject(@Param('id', ParseIntPipe) id: number, @Body() input: RejectApprovalRequestDto, @Req() req: any) {
    return { success: await this.approvals.rejectApproval(id, input.stepIndex, input.reason, this.context(req)) };
  }
}
