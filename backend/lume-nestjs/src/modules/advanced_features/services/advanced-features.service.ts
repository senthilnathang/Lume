import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { CreateWebhookDto, UpdateWebhookDto, CreateNotificationDto, CreateTagDto, CreateCommentDto, CreateAttachmentDto } from '../dtos';
import { eq, and, inArray } from 'drizzle-orm';

@Injectable()
export class AdvancedFeaturesService {
  constructor(private drizzleService: DrizzleService) {}

  private getDb() {
    return this.drizzleService.getDrizzle();
  }

  // ── Webhooks ──────────────────────────────────────────────────

  async getWebhooks(filters: any = {}) {
    const db = this.getDrizzle();
    let query = db.select().from(db.webhooks);

    if (filters.status) {
      query = query.where(eq(db.webhooks.status, filters.status));
    }
    if (filters.model) {
      query = query.where(eq(db.webhooks.model, filters.model));
    }

    const result = await query;
    return { success: true, data: result };
  }

  async getWebhook(id: number) {
    const db = this.getDrizzle();
    const webhook = await db.select().from(db.webhooks).where(eq(db.webhooks.id, id)).limit(1);
    if (!webhook.length) throw new NotFoundException('Webhook not found');
    return { success: true, data: webhook[0] };
  }

  async createWebhook(dto: CreateWebhookDto) {
    const db = this.getDrizzle();
    const result = await db.insert(db.webhooks).values(dto);
    return { success: true, data: result, message: 'Webhook created' };
  }

  async updateWebhook(id: number, dto: UpdateWebhookDto) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.webhooks).where(eq(db.webhooks.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Webhook not found');

    await db.update(db.webhooks).set(dto).where(eq(db.webhooks.id, id));
    return { success: true, data: dto, message: 'Webhook updated' };
  }

  async deleteWebhook(id: number) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.webhooks).where(eq(db.webhooks.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Webhook not found');

    await db.delete(db.webhooks).where(eq(db.webhooks.id, id));
    return { success: true, message: 'Webhook deleted' };
  }

  async getWebhookLogs(webhookId: number, limit: number = 50) {
    const db = this.getDrizzle();
    const logs = await db.select().from(db.webhookLogs)
      .where(eq(db.webhookLogs.webhookId, webhookId))
      .limit(limit);
    return { success: true, data: logs };
  }

  // ── Notifications ─────────────────────────────────────────────

  async getNotifications(userId: number, filters: any = {}) {
    const db = this.getDrizzle();
    let query = db.select().from(db.notifications)
      .where(eq(db.notifications.userId, userId));

    if (filters.status) {
      query = query.where(eq(db.notifications.status, filters.status));
    }
    if (filters.type) {
      query = query.where(eq(db.notifications.type, filters.type));
    }

    const result = await query.limit(filters.limit || 50);
    return { success: true, data: result };
  }

  async getUnreadCount(userId: number) {
    const db = this.getDrizzle();
    const result = await db.select().from(db.notifications)
      .where(and(eq(db.notifications.userId, userId), eq(db.notifications.status, 'unread')));
    return { success: true, data: { count: result.length } };
  }

  async createNotification(dto: CreateNotificationDto) {
    const db = this.getDrizzle();
    const result = await db.insert(db.notifications).values(dto);
    return { success: true, data: result, message: 'Notification created' };
  }

  async markAsRead(id: number, userId: number) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.notifications)
      .where(and(eq(db.notifications.id, id), eq(db.notifications.userId, userId)))
      .limit(1);

    if (!existing.length) throw new NotFoundException('Notification not found');

    const readAt = new Date();
    await db.update(db.notifications)
      .set({ status: 'read', readAt })
      .where(eq(db.notifications.id, id));

    return { success: true, message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: number) {
    const db = this.getDrizzle();
    const readAt = new Date();
    await db.update(db.notifications)
      .set({ status: 'read', readAt })
      .where(and(eq(db.notifications.userId, userId), eq(db.notifications.status, 'unread')));

    return { success: true, message: 'All notifications marked as read' };
  }

  async dismissNotification(id: number, userId: number) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.notifications)
      .where(and(eq(db.notifications.id, id), eq(db.notifications.userId, userId)))
      .limit(1);

    if (!existing.length) throw new NotFoundException('Notification not found');

    await db.update(db.notifications)
      .set({ status: 'dismissed' })
      .where(eq(db.notifications.id, id));

    return { success: true, message: 'Notification dismissed' };
  }

  // ── Notification Channels ─────────────────────────────────────

  async getNotificationChannels(filters: any = {}) {
    const db = this.getDrizzle();
    let query = db.select().from(db.notificationChannels);

    if (filters.status) {
      query = query.where(eq(db.notificationChannels.status, filters.status));
    }

    const result = await query;
    return { success: true, data: result };
  }

  async getNotificationChannel(id: number) {
    const db = this.getDrizzle();
    const channel = await db.select().from(db.notificationChannels)
      .where(eq(db.notificationChannels.id, id)).limit(1);
    if (!channel.length) throw new NotFoundException('Channel not found');
    return { success: true, data: channel[0] };
  }

  async createNotificationChannel(dto: any) {
    const db = this.getDrizzle();
    const result = await db.insert(db.notificationChannels).values(dto);
    return { success: true, data: result, message: 'Channel created' };
  }

  async updateNotificationChannel(id: number, dto: any) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.notificationChannels)
      .where(eq(db.notificationChannels.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Channel not found');

    await db.update(db.notificationChannels).set(dto).where(eq(db.notificationChannels.id, id));
    return { success: true, data: dto, message: 'Channel updated' };
  }

  async deleteNotificationChannel(id: number) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.notificationChannels)
      .where(eq(db.notificationChannels.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Channel not found');

    await db.delete(db.notificationChannels).where(eq(db.notificationChannels.id, id));
    return { success: true, message: 'Channel deleted' };
  }

  // ── Tags ──────────────────────────────────────────────────────

  async getTags(filters: any = {}) {
    const db = this.getDrizzle();
    let query = db.select().from(db.tags);

    if (filters.category) {
      query = query.where(eq(db.tags.category, filters.category));
    }

    const result = await query;
    return { success: true, data: result };
  }

  async getTag(id: number) {
    const db = this.getDrizzle();
    const tag = await db.select().from(db.tags).where(eq(db.tags.id, id)).limit(1);
    if (!tag.length) throw new NotFoundException('Tag not found');
    return { success: true, data: tag[0] };
  }

  async createTag(dto: CreateTagDto) {
    const db = this.getDrizzle();
    const result = await db.insert(db.tags).values(dto);
    return { success: true, data: result, message: 'Tag created' };
  }

  async updateTag(id: number, dto: any) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.tags).where(eq(db.tags.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Tag not found');

    await db.update(db.tags).set(dto).where(eq(db.tags.id, id));
    return { success: true, data: dto, message: 'Tag updated' };
  }

  async deleteTag(id: number) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.tags).where(eq(db.tags.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Tag not found');

    // Remove all taggings for this tag
    await db.delete(db.taggings).where(eq(db.taggings.tagId, id));
    await db.delete(db.tags).where(eq(db.tags.id, id));

    return { success: true, message: 'Tag deleted' };
  }

  async getTagsForRecord(taggableType: string, taggableId: number) {
    const db = this.getDrizzle();
    const taggingRecords = await db.select().from(db.taggings)
      .where(and(eq(db.taggings.taggableType, taggableType), eq(db.taggings.taggableId, taggableId)));

    if (!taggingRecords.length) {
      return { success: true, data: [] };
    }

    const tagIds = taggingRecords.map(t => t.tagId);
    const result = await db.select().from(db.tags).where(inArray(db.tags.id, tagIds));

    return { success: true, data: result };
  }

  async tagRecord(tagId: number, taggableType: string, taggableId: number) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.taggings)
      .where(and(eq(db.taggings.tagId, tagId), eq(db.taggings.taggableType, taggableType), eq(db.taggings.taggableId, taggableId)))
      .limit(1);

    if (existing.length) {
      return { success: true, data: existing[0], message: 'Tagging already exists' };
    }

    const result = await db.insert(db.taggings).values({ tagId, taggableType, taggableId });
    return { success: true, data: result, message: 'Tag applied' };
  }

  async untagRecord(tagId: number, taggableType: string, taggableId: number) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.taggings)
      .where(and(eq(db.taggings.tagId, tagId), eq(db.taggings.taggableType, taggableType), eq(db.taggings.taggableId, taggableId)))
      .limit(1);

    if (!existing.length) {
      return { success: false, error: 'Tagging not found' };
    }

    await db.delete(db.taggings).where(eq(db.taggings.id, existing[0].id));
    return { success: true, message: 'Tag removed' };
  }

  // ── Comments ──────────────────────────────────────────────────

  async getComments(commentableType: string, commentableId: number) {
    const db = this.getDrizzle();
    const result = await db.select().from(db.comments)
      .where(and(eq(db.comments.commentableType, commentableType), eq(db.comments.commentableId, commentableId)));

    return { success: true, data: result };
  }

  async createComment(dto: CreateCommentDto) {
    const db = this.getDrizzle();
    const result = await db.insert(db.comments).values(dto);
    return { success: true, data: result, message: 'Comment created' };
  }

  async updateComment(id: number, userId: number, dto: any) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.comments)
      .where(and(eq(db.comments.id, id), eq(db.comments.userId, userId)))
      .limit(1);

    if (!existing.length) throw new NotFoundException('Comment not found');

    await db.update(db.comments).set({ body: dto.body }).where(eq(db.comments.id, id));
    return { success: true, data: { body: dto.body }, message: 'Comment updated' };
  }

  async deleteComment(id: number, userId: number) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.comments)
      .where(and(eq(db.comments.id, id), eq(db.comments.userId, userId)))
      .limit(1);

    if (!existing.length) throw new NotFoundException('Comment not found');

    await db.delete(db.comments).where(eq(db.comments.id, id));
    return { success: true, message: 'Comment deleted' };
  }

  // ── Attachments ───────────────────────────────────────────────

  async getAttachments(attachableType: string, attachableId: number) {
    const db = this.getDrizzle();
    const result = await db.select().from(db.attachments)
      .where(and(eq(db.attachments.attachableType, attachableType), eq(db.attachments.attachableId, attachableId)));

    return { success: true, data: result };
  }

  async createAttachment(dto: CreateAttachmentDto) {
    const db = this.getDrizzle();
    const result = await db.insert(db.attachments).values(dto);
    return { success: true, data: result, message: 'Attachment created' };
  }

  async deleteAttachment(id: number) {
    const db = this.getDrizzle();
    const existing = await db.select().from(db.attachments).where(eq(db.attachments.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Attachment not found');

    await db.delete(db.attachments).where(eq(db.attachments.id, id));
    return { success: true, message: 'Attachment deleted' };
  }
}
