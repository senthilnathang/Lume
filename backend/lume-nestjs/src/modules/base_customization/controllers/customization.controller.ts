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
import { CustomizationService } from '../services/customization.service';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CreateCustomViewDto,
  UpdateCustomViewDto,
  CreateFormLayoutDto,
  UpdateFormLayoutDto,
  CreateListConfigDto,
  UpdateListConfigDto,
  CreateDashboardWidgetDto,
  UpdateDashboardWidgetDto,
} from '../dtos';

@Controller('api/customization')
@UseGuards(JwtAuthGuard, RbacGuard)
export class CustomizationController {
  constructor(private customizationService: CustomizationService) {}

  // ── Custom Fields ─────────────────────────────────────────────

  @Get('fields')
  @Permissions('base_customization.fields')
  async getCustomFields(@Query('status') status?: string, @Query('model') model?: string) {
    return this.customizationService.getCustomFields({ status, model });
  }

  @Get('fields/model/:model')
  @Permissions('base_customization.fields')
  async getFieldsByModel(@Param('model') model: string) {
    return this.customizationService.getFieldsByModel(model);
  }

  @Get('fields/:id')
  @Permissions('base_customization.fields')
  async getCustomField(@Param('id') id: string) {
    return this.customizationService.getCustomField(parseInt(id, 10));
  }

  @Post('fields')
  @Permissions('base_customization.fields.manage')
  async createCustomField(@Body() dto: CreateCustomFieldDto) {
    return this.customizationService.createCustomField(dto);
  }

  @Put('fields/:id')
  @Permissions('base_customization.fields.manage')
  async updateCustomField(@Param('id') id: string, @Body() dto: UpdateCustomFieldDto) {
    return this.customizationService.updateCustomField(parseInt(id, 10), dto);
  }

  @Delete('fields/:id')
  @Permissions('base_customization.fields.manage')
  async deleteCustomField(@Param('id') id: string) {
    return this.customizationService.deleteCustomField(parseInt(id, 10));
  }

  // ── Custom Views ──────────────────────────────────────────────

  @Get('views')
  @Permissions('base_customization.views')
  async getCustomViews(
    @Query('status') status?: string,
    @Query('model') model?: string,
    @Query('viewType') viewType?: string,
  ) {
    return this.customizationService.getCustomViews({ status, model, viewType });
  }

  @Get('views/:id')
  @Permissions('base_customization.views')
  async getCustomView(@Param('id') id: string) {
    return this.customizationService.getCustomView(parseInt(id, 10));
  }

  @Post('views')
  @Permissions('base_customization.views.manage')
  async createCustomView(@Body() dto: CreateCustomViewDto) {
    return this.customizationService.createCustomView(dto);
  }

  @Put('views/:id')
  @Permissions('base_customization.views.manage')
  async updateCustomView(@Param('id') id: string, @Body() dto: UpdateCustomViewDto) {
    return this.customizationService.updateCustomView(parseInt(id, 10), dto);
  }

  @Delete('views/:id')
  @Permissions('base_customization.views.manage')
  async deleteCustomView(@Param('id') id: string) {
    return this.customizationService.deleteCustomView(parseInt(id, 10));
  }

  // ── Form Layouts ──────────────────────────────────────────────

  @Get('forms')
  @Permissions('base_customization.forms')
  async getFormLayouts(@Query('status') status?: string, @Query('model') model?: string) {
    return this.customizationService.getFormLayouts({ status, model });
  }

  @Get('forms/:id')
  @Permissions('base_customization.forms')
  async getFormLayout(@Param('id') id: string) {
    return this.customizationService.getFormLayout(parseInt(id, 10));
  }

  @Post('forms')
  @Permissions('base_customization.forms.manage')
  async createFormLayout(@Body() dto: CreateFormLayoutDto) {
    return this.customizationService.createFormLayout(dto);
  }

  @Put('forms/:id')
  @Permissions('base_customization.forms.manage')
  async updateFormLayout(@Param('id') id: string, @Body() dto: UpdateFormLayoutDto) {
    return this.customizationService.updateFormLayout(parseInt(id, 10), dto);
  }

  @Delete('forms/:id')
  @Permissions('base_customization.forms.manage')
  async deleteFormLayout(@Param('id') id: string) {
    return this.customizationService.deleteFormLayout(parseInt(id, 10));
  }

  // ── List Configurations ───────────────────────────────────────

  @Get('lists')
  @Permissions('base_customization.lists')
  async getListConfigs(@Query('status') status?: string, @Query('model') model?: string) {
    return this.customizationService.getListConfigs({ status, model });
  }

  @Get('lists/:id')
  @Permissions('base_customization.lists')
  async getListConfig(@Param('id') id: string) {
    return this.customizationService.getListConfig(parseInt(id, 10));
  }

  @Post('lists')
  @Permissions('base_customization.lists.manage')
  async createListConfig(@Body() dto: CreateListConfigDto) {
    return this.customizationService.createListConfig(dto);
  }

  @Put('lists/:id')
  @Permissions('base_customization.lists.manage')
  async updateListConfig(@Param('id') id: string, @Body() dto: UpdateListConfigDto) {
    return this.customizationService.updateListConfig(parseInt(id, 10), dto);
  }

  @Delete('lists/:id')
  @Permissions('base_customization.lists.manage')
  async deleteListConfig(@Param('id') id: string) {
    return this.customizationService.deleteListConfig(parseInt(id, 10));
  }

  // ── Dashboard Widgets ─────────────────────────────────────────

  @Get('widgets')
  @Permissions('base_customization.widgets')
  async getDashboardWidgets(@Query('status') status?: string) {
    return this.customizationService.getDashboardWidgets({ status });
  }

  @Get('widgets/:id')
  @Permissions('base_customization.widgets')
  async getDashboardWidget(@Param('id') id: string) {
    return this.customizationService.getDashboardWidget(parseInt(id, 10));
  }

  @Post('widgets')
  @Permissions('base_customization.widgets.manage')
  async createDashboardWidget(@Body() dto: CreateDashboardWidgetDto) {
    return this.customizationService.createDashboardWidget(dto);
  }

  @Put('widgets/:id')
  @Permissions('base_customization.widgets.manage')
  async updateDashboardWidget(@Param('id') id: string, @Body() dto: UpdateDashboardWidgetDto) {
    return this.customizationService.updateDashboardWidget(parseInt(id, 10), dto);
  }

  @Delete('widgets/:id')
  @Permissions('base_customization.widgets.manage')
  async deleteDashboardWidget(@Param('id') id: string) {
    return this.customizationService.deleteDashboardWidget(parseInt(id, 10));
  }
}
