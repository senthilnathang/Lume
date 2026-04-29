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
  Response,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions, Public } from '@core/decorators';
import { FeaturesDataService } from '../services/features-data.service';
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  ImportPreviewDto,
  ImportValidateDto,
  ImportExecuteDto,
  ExportPreviewDto,
  ExportDownloadDto,
} from '../dtos';

@Controller('api/features-data')
export class FeaturesDataController {
  constructor(private featuresDataService: FeaturesDataService) {}

  // ── Feature Flags ──────────────────────────────────────────────

  @Get('flags')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base_features_data.export.view')
  async getFeatureFlags(@Query('enabled') enabled?: boolean) {
    return this.featuresDataService.getFeatureFlags({
      enabled: enabled !== undefined ? enabled === true || enabled === 'true' : undefined,
    });
  }

  @Get('flags/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base_features_data.export.view')
  async getFeatureFlag(@Param('id') id: string) {
    return this.featuresDataService.getFeatureFlag(parseInt(id, 10));
  }

  @Post('flags')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base_features_data.export.template_manage')
  async createFeatureFlag(@Body() dto: CreateFeatureFlagDto) {
    return this.featuresDataService.createFeatureFlag(dto);
  }

  @Put('flags/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base_features_data.export.template_manage')
  async updateFeatureFlag(@Param('id') id: string, @Body() dto: UpdateFeatureFlagDto) {
    return this.featuresDataService.updateFeatureFlag(parseInt(id, 10), dto);
  }

  @Delete('flags/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base_features_data.export.template_manage')
  async deleteFeatureFlag(@Param('id') id: string) {
    return this.featuresDataService.deleteFeatureFlag(parseInt(id, 10));
  }

  @Post('flags/:key/toggle')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base_features_data.export.template_manage')
  async toggleFeatureFlag(@Param('key') key: string, @Body('enabled') enabled: boolean) {
    return this.featuresDataService.toggleFeatureFlag(key, enabled);
  }

  // ── Import: Preview ───────────────────────────────────────────

  @Post('import/preview')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base_features_data.import.view')
  async importPreview(@Body() dto: ImportPreviewDto) {
    try {
      const { has_header = true, delimiter = ',' } = dto;
      const buffer = Buffer.from(dto.file_content, 'base64');
      const content = buffer.toString('utf-8');

      const { columns, rows } = this.featuresDataService.parseCSV(content, has_header, delimiter);
      const preview_data = rows.slice(0, 10);

      return {
        success: true,
        data: {
          columns,
          preview_data,
          total_rows: rows.length,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Import: Download Template ──────────────────────────────────

  @Get('import/template/:model')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base_features_data.import.view')
  async importTemplate(
    @Param('model') model: string,
    @Response() res: ExpressResponse,
  ) {
    try {
      const templateData = [
        {
          name: `${model}_field_1`,
          description: 'Field 1',
          value: '<value>',
        },
      ];

      const csv = this.featuresDataService.exportToCSV(templateData);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${model}_template.csv"`);
      res.send(csv);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // ── Export: Preview ───────────────────────────────────────────

  @Post('export/preview')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base_features_data.export.view')
  async exportPreview(@Body() dto: ExportPreviewDto) {
    try {
      const mockData = [
        {
          id: 1,
          name: 'Sample Item 1',
          description: 'Test description',
          status: 'active',
        },
      ];

      return {
        success: true,
        data: {
          data: mockData,
          total_records: 1,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Export: Download ───────────────────────────────────────────

  @Post('export/download')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base_features_data.export.execute')
  async exportDownload(
    @Body() dto: ExportDownloadDto,
    @Response() res: ExpressResponse,
  ) {
    try {
      const mockData = [
        {
          id: 1,
          name: 'Sample Item 1',
          description: 'Test description',
        },
      ];

      const { format = 'csv' } = dto;

      if (format === 'json') {
        const jsonContent = this.featuresDataService.exportToJSON(mockData, dto.fields);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${dto.model_name}_export.json"`);
        res.send(jsonContent);
      } else {
        const csvContent = this.featuresDataService.exportToCSV(mockData, dto.fields);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${dto.model_name}_export.csv"`);
        res.send(csvContent);
      }
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
