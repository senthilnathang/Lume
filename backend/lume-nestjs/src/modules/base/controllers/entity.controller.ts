import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { EntityService } from '../services/entity.service';
import { CreateEntityDto, UpdateEntityDto, CreateFieldDto, UpdateFieldDto, CreateViewDto } from '../dtos';

@Controller('api/entities')
export class EntityController {
  constructor(private entityService: EntityService) {}

  /**
   * Create a new entity
   */
  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.write')
  async createEntity(@Body() dto: CreateEntityDto) {
    try {
      const entity = await this.entityService.createEntity(dto);
      return {
        success: true,
        data: entity,
        message: 'Entity created successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * List entities with pagination
   */
  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.read')
  async listEntities(@Query('page') page?: string, @Query('limit') limit?: string) {
    try {
      const result = await this.entityService.listEntities({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      });

      return {
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get entity by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.read')
  async getEntity(@Param('id') id: string) {
    try {
      const entity = await this.entityService.getEntity(parseInt(id));
      return {
        success: true,
        data: entity,
        message: 'Entity retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Update entity
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.write')
  async updateEntity(@Param('id') id: string, @Body() dto: UpdateEntityDto) {
    try {
      const entity = await this.entityService.updateEntity(parseInt(id), dto);
      return {
        success: true,
        data: entity,
        message: 'Entity updated successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Delete entity
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.write')
  async deleteEntity(@Param('id') id: string) {
    try {
      const entity = await this.entityService.deleteEntity(parseInt(id));
      return {
        success: true,
        data: entity,
        message: 'Entity deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Publish entity
   */
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.write')
  async publishEntity(@Param('id') id: string) {
    try {
      const entity = await this.entityService.publishEntity(parseInt(id));
      return {
        success: true,
        data: entity,
        message: 'Entity published successfully',
      };
    } catch (error) {
      if ((error as any).code === 'NOT_PUBLISHABLE') {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Unpublish entity
   */
  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.write')
  async unpublishEntity(@Param('id') id: string) {
    try {
      const entity = await this.entityService.unpublishEntity(parseInt(id));
      return {
        success: true,
        data: entity,
        message: 'Entity unpublished successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Create a field for an entity
   */
  @Post(':entityId/fields')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.write')
  async createField(@Param('entityId') entityId: string, @Body() dto: CreateFieldDto) {
    try {
      const field = await this.entityService.createField(parseInt(entityId), dto);
      return {
        success: true,
        data: field,
        message: 'Field created successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get fields for an entity
   */
  @Get(':entityId/fields')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.read')
  async getFields(@Param('entityId') entityId: string) {
    try {
      const fields = await this.entityService.getFieldsByEntity(parseInt(entityId));
      return {
        success: true,
        data: fields,
        message: 'Fields retrieved successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Update a field
   */
  @Put('fields/:fieldId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.write')
  async updateField(@Param('fieldId') fieldId: string, @Body() dto: UpdateFieldDto) {
    try {
      const field = await this.entityService.updateField(parseInt(fieldId), dto);
      return {
        success: true,
        data: field,
        message: 'Field updated successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Delete a field
   */
  @Delete('fields/:fieldId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.write')
  async deleteField(@Param('fieldId') fieldId: string) {
    try {
      const result = await this.entityService.deleteField(parseInt(fieldId));
      return {
        success: true,
        data: result,
        message: 'Field deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Create a view for an entity
   */
  @Post(':entityId/views')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.write')
  async createView(@Param('entityId') entityId: string, @Body() dto: CreateViewDto) {
    try {
      const view = await this.entityService.createView(parseInt(entityId), dto);
      return {
        success: true,
        data: view,
        message: 'View created successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get views for an entity
   */
  @Get(':entityId/views')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.entities.read')
  async getViews(@Param('entityId') entityId: string) {
    try {
      const views = await this.entityService.getViewsByEntity(parseInt(entityId));
      return {
        success: true,
        data: views,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
