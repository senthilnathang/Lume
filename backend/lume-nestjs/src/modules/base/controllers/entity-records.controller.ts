import { resolveTenant } from '../../../graphql/tenant';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, ForbiddenException, HttpException, Req } from '@nestjs/common';
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

  private company(req: any): number {
    const companyId = resolveTenant(req);
    if (companyId == null) throw new ForbiddenException('Company ID required');
    return companyId;
  }

  private actor(req: any): number {
    const id = req.user?.sub ?? req.user?.id;
    if (!Number.isSafeInteger(id) || id < 1) throw new ForbiddenException('User identity required');
    return id;
  }

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
      const companyId = this.company(req);
      const userId = this.actor(req);

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
      if (error instanceof HttpException) throw error;
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
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('filters') filters: string | undefined,
    @Query('sort') sort: string | undefined,
    @Req() req: any,
  ) {
    try {
      const companyId = this.company(req);

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
          userId: this.actor(req),
        },
      );

      return {
        success: true,
        data: result.records,
        pagination: result.pagination,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get a record by ID
   */
  @Get(':recordId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.records.read')
  async getRecord(@Param('recordId') recordId: string, @Req() req: any, @Param('entityId') entityId: string) {
    try {
      const companyId = this.company(req);
      const record = await this.recordService.getRecord(parseInt(recordId), companyId, this.actor(req), Number(entityId));

      if (!record) {
        throw new BadRequestException('Record not found or access denied');
      }

      return {
        success: true,
        data: record,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
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
    @Param('entityId') entityId: string,
  ) {
    try {
      const companyId = this.company(req);
      const record = await this.recordService.updateRecord(
        parseInt(recordId),
        dto.data,
        companyId,
        this.actor(req),
        Number(entityId),
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
      if (error instanceof HttpException) throw error;
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
    @Query('hard') hard: string | undefined,
    @Req() req: any,
    @Param('entityId') entityId: string,
  ) {
    try {
      const companyId = this.company(req);
      const softDelete = hard !== 'true';

      const deleted = await this.recordService.deleteRecord(
        parseInt(recordId),
        softDelete,
        companyId,
        this.actor(req),
        Number(entityId),
      );

      if (!deleted) {
        throw new BadRequestException('Record not found or access denied');
      }

      return {
        success: true,
        message: 'Record deleted successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
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
    @Param('entityId') entityId: string,
    @Req() req: any,
  ) {
    try {
      if (!dto.relationshipId || !dto.targetRecordId) {
        throw new BadRequestException('relationshipId and targetRecordId are required');
      }

      const link = await this.relationshipService.linkRecords(
        dto.relationshipId,
        Number(recordId),
        dto.targetRecordId,
        { companyId: this.company(req), userId: this.actor(req), entityId: Number(entityId) },
      );

      return {
        success: true,
        data: link,
        message: 'Records linked successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
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
    @Param('entityId') entityId: string,
    @Req() req: any,
  ) {
    try {
      if (!dto.relationshipId || !dto.targetRecordId) {
        throw new BadRequestException('relationshipId and targetRecordId are required');
      }

      await this.relationshipService.unlinkRecords(
        dto.relationshipId,
        Number(recordId),
        dto.targetRecordId,
        { companyId: this.company(req), userId: this.actor(req), entityId: Number(entityId) },
      );

      return {
        success: true,
        message: 'Records unlinked successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(error.message);
    }
  }
}
