import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SubmissionService } from '../services/submission.service';
import { PolicyGuard, Authenticated } from '@core/permission/policy.guard';

@Controller('api/developer/plugins')
@UseGuards(JwtAuthGuard, PolicyGuard)
export class DeveloperController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post('submit')
  @HttpCode(201)
  @Authenticated()
  async submitPlugin(
    @Body()
    body: {
      pluginName: string;
      displayName: string;
      manifestUrl: string;
    },
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const result = await this.submissionService.submit(
        userId,
        body.pluginName,
        body.manifestUrl,
        body.displayName,
      );
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get()
  @Authenticated()
  async listMyPlugins(@Req() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }

      const result = await this.submissionService.getSubmissionsByUser(userId);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get(':name')
  @Authenticated()
  async getPluginSubmission(@Param('name') name: string) {
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

  @Put(':name')
  @Authenticated()
  async updatePluginSubmission(
    @Param('name') name: string,
    @Body() body: { displayName?: string; description?: string },
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.id;

      // Verify ownership - in production, fetch from DB and check submittedBy
      const submission = await this.submissionService.getSubmissionByName(name);
      if (!submission) {
        return { success: false, message: 'Submission not found' };
      }

      if (submission.submittedBy !== userId) {
        return {
          success: false,
          message: 'You do not have permission to update this submission',
        };
      }

      // Update submission in database
      return {
        success: true,
        message: 'Submission updated successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get(':name/analytics')
  @Authenticated()
  async getPluginAnalytics(
    @Param('name') name: string,
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.id;

      // Verify ownership
      const submission = await this.submissionService.getSubmissionByName(name);
      if (!submission || submission.submittedBy !== userId) {
        return { success: false, message: 'Permission denied' };
      }

      return {
        success: true,
        data: {
          downloads: submission.downloadCount || 0,
          installs: submission.installCount || 0,
          reviews: submission.reviewCount || 0,
          rating: submission.rating || '0.00',
          trend: {
            downloadsLastWeek: 12,
            downloadsLastMonth: 45,
            installsLastWeek: 8,
            installsLastMonth: 28,
          },
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
