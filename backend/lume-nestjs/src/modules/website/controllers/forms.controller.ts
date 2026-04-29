import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { FormService, SubmissionService } from '../services/form.service';
import { CreateFormDto, UpdateFormDto } from '../dtos';

@Controller('api/website')
export class FormsController {
  constructor(
    private formService: FormService,
    private submissionService: SubmissionService,
  ) {}

  // Admin - get all forms
  @Get('forms')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.form.read')
  async findAll(@Query() query: any) {
    return this.formService.findAll({
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
      search: query.search,
    });
  }

  // Admin - get single form
  @Get('forms/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.form.read')
  async findById(@Param('id') id: string) {
    return this.formService.findById(parseInt(id));
  }

  // Admin - create form
  @Post('forms')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.form.create')
  async create(@Body() dto: CreateFormDto) {
    return this.formService.create(dto);
  }

  // Admin - update form
  @Put('forms/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.form.edit')
  async update(@Param('id') id: string, @Body() dto: UpdateFormDto) {
    return this.formService.update(parseInt(id), dto);
  }

  // Admin - delete form
  @Delete('forms/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.form.delete')
  async delete(@Param('id') id: string) {
    return this.formService.delete(parseInt(id));
  }

  // Admin - get form submissions
  @Get('forms/:id/submissions')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.submission.read')
  async getSubmissions(@Param('id') id: string, @Query() query: any) {
    return this.submissionService.findAll(parseInt(id), {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
    });
  }

  // Admin - mark submission as read
  @Post('forms/:id/submissions/:subId/read')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.submission.read')
  async markSubmissionRead(@Param('id') id: string, @Param('subId') subId: string) {
    return this.submissionService.markRead(parseInt(subId));
  }

  // Admin - delete submission
  @Delete('forms/:id/submissions/:subId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('website.submission.delete')
  async deleteSubmission(@Param('id') id: string, @Param('subId') subId: string) {
    return this.submissionService.delete(parseInt(subId));
  }
}
