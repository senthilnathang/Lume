import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SubmissionService } from '../services/submission.service';
import { PolicyGuard, Policy } from '@core/permission/policy.guard';

@Controller('api/admin/marketplace')
@UseGuards(PolicyGuard)
export class AdminMarketplaceController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Get('submissions')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async getPendingSubmissions() {
    try {
      const result = await this.submissionService.getSubmissionsByStatus('pending');
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('submissions/:status')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async getSubmissionsByStatus(@Param('status') status: string) {
    try {
      const validStatuses = ['pending', 'active', 'rejected'];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          message: 'Invalid status. Must be pending, active, or rejected',
        };
      }

      const result = await this.submissionService.getSubmissionsByStatus(status);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('submissions/:name/approve')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async approveSubmission(@Param('name') name: string, @Req() req: any) {
    try {
      const adminId = req.user?.sub;
      if (!adminId) {
        return { success: false, message: 'Admin not authenticated' };
      }

      const result = await this.submissionService.approve(name, adminId);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('submissions/:name/reject')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async rejectSubmission(
    @Param('name') name: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    try {
      const adminId = req.user?.sub;
      if (!adminId) {
        return { success: false, message: 'Admin not authenticated' };
      }

      const reason = body.reason || 'Rejected by admin';
      const result = await this.submissionService.reject(name, adminId, reason);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('submissions/:name')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async getSubmissionDetail(@Param('name') name: string) {
    try {
      const submission = await this.submissionService.getSubmissionByName(name);
      if (!submission) {
        return { success: false, message: 'Submission not found' };
      }
      return { success: true, data: submission };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
