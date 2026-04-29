import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { AdvancedFeaturesService } from '../services/advanced-features.service';
import { Permissions } from '@core/decorators';
import { CreateWebhookDto, UpdateWebhookDto, CreateNotificationDto, CreateTagDto, CreateCommentDto, CreateAttachmentDto } from '../dtos';

@Controller('api/advanced-features')
export class AdvancedFeaturesController {
  constructor(private service: AdvancedFeaturesService) {}

  // ── Webhooks ──────────────────────────────────────────────────

  @Get('webhooks')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.webhooks')
  async getWebhooks(@Query() filters: any) {
    return this.service.getWebhooks(filters);
  }

  @Get('webhooks/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.webhooks')
  async getWebhook(@Param('id') id: string) {
    return this.service.getWebhook(parseInt(id));
  }

  @Post('webhooks')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.webhooks.manage')
  async createWebhook(@Body() dto: CreateWebhookDto) {
    return this.service.createWebhook(dto);
  }

  @Put('webhooks/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.webhooks.manage')
  async updateWebhook(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.service.updateWebhook(parseInt(id), dto);
  }

  @Delete('webhooks/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.webhooks.manage')
  async deleteWebhook(@Param('id') id: string) {
    return this.service.deleteWebhook(parseInt(id));
  }

  @Get('webhooks/:id/logs')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.webhooks')
  async getWebhookLogs(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.service.getWebhookLogs(parseInt(id), limit ? parseInt(limit) : 50);
  }

  // ── Notifications ─────────────────────────────────────────────

  @Get('notifications')
  @UseGuards(JwtAuthGuard, RbacGuard)
  async getNotifications(@Req() req: any, @Query() filters: any) {
    return this.service.getNotifications(req.user.id, filters);
  }

  @Get('notifications/unread-count')
  @UseGuards(JwtAuthGuard, RbacGuard)
  async getUnreadCount(@Req() req: any) {
    return this.service.getUnreadCount(req.user.id);
  }

  @Post('notifications/:id/read')
  @UseGuards(JwtAuthGuard, RbacGuard)
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.service.markAsRead(parseInt(id), req.user.id);
  }

  @Post('notifications/read-all')
  @UseGuards(JwtAuthGuard, RbacGuard)
  async markAllAsRead(@Req() req: any) {
    return this.service.markAllAsRead(req.user.id);
  }

  @Post('notifications/:id/dismiss')
  @UseGuards(JwtAuthGuard, RbacGuard)
  async dismissNotification(@Param('id') id: string, @Req() req: any) {
    return this.service.dismissNotification(parseInt(id), req.user.id);
  }

  // ── Notification Channels ─────────────────────────────────────

  @Get('notification-channels')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.notifications.manage')
  async getNotificationChannels(@Query() filters: any) {
    return this.service.getNotificationChannels(filters);
  }

  @Get('notification-channels/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.notifications.manage')
  async getNotificationChannel(@Param('id') id: string) {
    return this.service.getNotificationChannel(parseInt(id));
  }

  @Post('notification-channels')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.notifications.manage')
  async createNotificationChannel(@Body() dto: any) {
    return this.service.createNotificationChannel(dto);
  }

  @Put('notification-channels/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.notifications.manage')
  async updateNotificationChannel(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateNotificationChannel(parseInt(id), dto);
  }

  @Delete('notification-channels/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.notifications.manage')
  async deleteNotificationChannel(@Param('id') id: string) {
    return this.service.deleteNotificationChannel(parseInt(id));
  }

  // ── Tags ──────────────────────────────────────────────────────

  @Get('tags')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.tags')
  async getTags(@Query() filters: any) {
    return this.service.getTags(filters);
  }

  @Get('tags/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.tags')
  async getTag(@Param('id') id: string) {
    return this.service.getTag(parseInt(id));
  }

  @Post('tags')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.tags.manage')
  async createTag(@Body() dto: CreateTagDto) {
    return this.service.createTag(dto);
  }

  @Put('tags/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.tags.manage')
  async updateTag(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateTag(parseInt(id), dto);
  }

  @Delete('tags/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.tags.manage')
  async deleteTag(@Param('id') id: string) {
    return this.service.deleteTag(parseInt(id));
  }

  // ── Tag Records ───────────────────────────────────────────────

  @Get('tags/record/:type/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.tags')
  async getTagsForRecord(@Param('type') type: string, @Param('id') id: string) {
    return this.service.getTagsForRecord(type, parseInt(id));
  }

  @Post('tags/record/:type/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.tags.manage')
  async tagRecord(@Param('type') type: string, @Param('id') id: string, @Body('tagId') tagId: number) {
    return this.service.tagRecord(tagId, type, parseInt(id));
  }

  @Delete('tags/record/:type/:id/:tagId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.tags.manage')
  async untagRecord(@Param('tagId') tagId: string, @Param('type') type: string, @Param('id') id: string) {
    return this.service.untagRecord(parseInt(tagId), type, parseInt(id));
  }

  // ── Comments ──────────────────────────────────────────────────

  @Get('comments/:type/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.comments')
  async getComments(@Param('type') type: string, @Param('id') id: string) {
    return this.service.getComments(type, parseInt(id));
  }

  @Post('comments/:type/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.comments.manage')
  async createComment(@Param('type') type: string, @Param('id') id: string, @Body() dto: CreateCommentDto, @Req() req: any) {
    return this.service.createComment({
      ...dto,
      commentableType: type,
      commentableId: parseInt(id),
      userId: req.user.id
    });
  }

  @Put('comments/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.comments.manage')
  async updateComment(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.service.updateComment(parseInt(id), req.user.id, dto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.comments.manage')
  async deleteComment(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteComment(parseInt(id), req.user.id);
  }

  // ── Attachments ───────────────────────────────────────────────

  @Get('attachments/:type/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.attachments')
  async getAttachments(@Param('type') type: string, @Param('id') id: string) {
    return this.service.getAttachments(type, parseInt(id));
  }

  @Post('attachments/:type/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.attachments.manage')
  async createAttachment(@Param('type') type: string, @Param('id') id: string, @Body() dto: CreateAttachmentDto, @Req() req: any) {
    return this.service.createAttachment({
      ...dto,
      attachableType: type,
      attachableId: parseInt(id),
      uploadedBy: req.user.id
    });
  }

  @Delete('attachments/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('advanced_features.attachments.manage')
  async deleteAttachment(@Param('id') id: string) {
    return this.service.deleteAttachment(parseInt(id));
  }
}
