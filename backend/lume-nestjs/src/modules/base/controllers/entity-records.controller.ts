import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { RecordService } from '../services/record.service';
import { RelationshipService } from '../services/relationship.service';
import { CreateRecordDto, UpdateRecordDto, LinkRecordsDto } from '../dtos';

@Controller('api/entities/:entityId/records')
export class EntityRecordsController {
  constructor(
    private recordService: RecordService,
    private relationshipService: RelationshipService,
  ) {}

  /**
   * Create a record
   */
  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.records.write')
  async createRecord(
    @Param('entityId') entityId: string,
    @Body() dto: CreateRecordDto,
    @Req() req: any,
  ) {
    try {
      const companyId = req.user?.companyId || 1;
      const userId = req.user?.id || 1;

      const record = await this.recordService.createRecord(
        parseInt(entityId),
        dto.data,
        companyId,
        userId,
      );

      return {
        success: true,
        data: record,
        message: 'Record created successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * List records with pagination
   */
  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.records.read')
  async listRecords(
    @Param('entityId') entityId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('filters') filters?: string,
    @Query('sort') sort?: string,
    @Req() req: any,
  ) {
    try {
      const companyId = req.user?.companyId || 1;

      let parsedFilters = [];
      if (filters) {
        try {
          parsedFilters = JSON.parse(filters);
        } catch (e) {
          // Ignore invalid filters
        }
      }

      let parsedSort = {};
      if (sort) {
        try {
          parsedSort = JSON.parse(sort);
        } catch (e) {
          // Ignore invalid sort
        }
      }

      const result = await this.recordService.listRecords(
        parseInt(entityId),
        companyId,
        {
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 20,
          filters: parsedFilters,
          sort: parsedSort,
        },
      );

      return {
        success: true,
        data: result.records,
        pagination: result.pagination,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get a record by ID
   */
  @Get(':recordId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.records.read')
  async getRecord(@Param('recordId') recordId: string, @Req() req: any) {
    try {
      const companyId = req.user?.companyId || 1;
      const record = await this.recordService.getRecord(parseInt(recordId), companyId);

      if (!record) {
        throw new BadRequestException('Record not found or access denied');
      }

      return {
        success: true,
        data: record,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Update a record
   */
  @Put(':recordId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.records.write')
  async updateRecord(
    @Param('recordId') recordId: string,
    @Body() dto: UpdateRecordDto,
    @Req() req: any,
  ) {
    try {
      const companyId = req.user?.companyId || 1;
      const record = await this.recordService.updateRecord(
        parseInt(recordId),
        dto.data,
        companyId,
      );

      if (!record) {
        throw new BadRequestException('Record not found or access denied');
      }

      return {
        success: true,
        data: record,
        message: 'Record updated successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Delete a record
   */
  @Delete(':recordId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.records.write')
  async deleteRecord(
    @Param('recordId') recordId: string,
    @Query('hard') hard?: string,
    @Req() req: any,
  ) {
    try {
      const companyId = req.user?.companyId || 1;
      const softDelete = hard !== 'true';

      const deleted = await this.recordService.deleteRecord(
        parseInt(recordId),
        softDelete,
        companyId,
      );

      if (!deleted) {
        throw new BadRequestException('Record not found or access denied');
      }

      return {
        success: true,
        message: 'Record deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Link records together
   */
  @Post(':recordId/relationships')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.records.write')
  async linkRecords(
    @Param('recordId') recordId: string,
    @Body() dto: LinkRecordsDto,
  ) {
    try {
      if (!dto.relationshipId || !dto.targetRecordId) {
        throw new BadRequestException('relationshipId and targetRecordId are required');
      }

      const link = await this.relationshipService.linkRecords(
        dto.relationshipId,
        parseInt(recordId),
        dto.targetRecordId,
      );

      return {
        success: true,
        data: link,
        message: 'Records linked successfully',
      };
    } catch (error) {
      if (error.message.includes('circular')) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Unlink records
   */
  @Delete(':recordId/relationships')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.records.write')
  async unlinkRecords(
    @Param('recordId') recordId: string,
    @Body() dto: LinkRecordsDto,
  ) {
    try {
      if (!dto.relationshipId || !dto.targetRecordId) {
        throw new BadRequestException('relationshipId and targetRecordId are required');
      }

      await this.relationshipService.unlinkRecords(
        dto.relationshipId,
        parseInt(recordId),
        dto.targetRecordId,
      );

      return {
        success: true,
        message: 'Records unlinked successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
