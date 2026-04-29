import { Controller, Get, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { ViewRendererService } from '../services/view-renderer.service';

@Controller('api/entities/:entityId/views')
export class EntityViewsController {
  constructor(private viewRendererService: ViewRendererService) {}

  /**
   * Render a view with metadata
   */
  @Get(':viewId/render')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.views.read')
  async renderView(@Param('entityId') entityId: string, @Param('viewId') viewId: string) {
    try {
      const result = await this.viewRendererService.renderView(parseInt(entityId), parseInt(viewId));
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * List all views for an entity
   */
  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.views.read')
  async listViews(@Param('entityId') entityId: string) {
    try {
      const result = await this.viewRendererService.listViewsByEntity(parseInt(entityId));
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
