import { webhooks, webhookLogs, notifications, notificationChannels, tags, taggings, comments, attachments } from '../models/schema';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { CreateWebhookDto, UpdateWebhookDto, CreateNotificationDto, CreateTagDto, CreateCommentDto, CreateAttachmentDto } from '../dtos';
import { eq, and, inArray, or, isNull, desc } from 'drizzle-orm';

@Injectable()
export class AdvancedFeaturesService {
  constructor(private drizzleService: DrizzleService) {}

  private getDb() {
    return this.drizzleService.getDrizzle();
  }

  // ── Webhooks ──────────────────────────────────────────────────

  async getWebhooks(filters: any = {}) {
    const db = this.getDb();
    let query = db.select().from(webhooks);

    if (filters.status) {
      query = query.where(eq(webhooks.status, filters.status));
    }
    if (filters.model) {
      query = query.where(eq(webhooks.model, filters.model));
    }

    const result = await query;
    return { success: true, data: result };
  }

  async getWebhook(id: number) {
    const db = this.getDb();
    const webhook = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
    if (!webhook.length) throw new NotFoundException('Webhook not found');
    return { success: true, data: webhook[0] };
  }

  async createWebhook(dto: CreateWebhookDto) {
    const db = this.getDb();
    const result = await db.insert(webhooks).values(dto);
    return { success: true, data: result, message: 'Webhook created' };
  }

  async updateWebhook(id: number, dto: UpdateWebhookDto) {
    const db = this.getDb();
    const existing = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Webhook not found');

    await db.update(webhooks).set(dto).where(eq(webhooks.id, id));
    return { success: true, data: dto, message: 'Webhook updated' };
  }

  async deleteWebhook(id: number) {
    const db = this.getDb();
    const existing = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Webhook not found');

    await db.delete(webhooks).where(eq(webhooks.id, id));
    return { success: true, message: 'Webhook deleted' };
  }

  async getWebhookLogs(webhookId: number, limit: number = 50) {
    const db = this.getDb();
    const logs = await db.select().from(webhookLogs)
      .where(eq(webhookLogs.webhookId, webhookId))
      .limit(limit);
    return { success: true, data: logs };
  }

  // ── Notifications ─────────────────────────────────────────────

  private notificationScope(userId: number, companyId: number) {
    if (![userId,companyId].every(id=>Number.isSafeInteger(id) && id>0)) throw new ForbiddenException('Notification owner and tenant required');
    return and(eq(notifications.userId,userId),or(isNull(notifications.companyId),eq(notifications.companyId,companyId)));
  }

  async getNotifications(userId: number, filters: any = {}, companyId: number) {
    const scope = this.notificationScope(userId,companyId);
    const limit = Number(filters.limit ?? 50);
    if (!['number','string'].includes(typeof (filters.limit ?? 50)) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('Notification limit must be 1–100');
    if (filters.status && !['unread','read','dismissed'].includes(filters.status)) throw new BadRequestException('Invalid notification status');
    if (filters.type && !['info','success','warning','error','action'].includes(filters.type)) throw new BadRequestException('Invalid notification type');
    const conditions = [scope];
    if (filters.status) conditions.push(eq(notifications.status,filters.status));
    if (filters.type) conditions.push(eq(notifications.type,filters.type));
    const result = await this.getDb().select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.id)).limit(limit);
    return { success: true, data: result };
  }

  async getUnreadCount(userId: number, companyId: number) {
    const result = await this.getDb().select().from(notifications)
      .where(and(this.notificationScope(userId,companyId),eq(notifications.status,'unread')));
    return { success: true, data: { count: result.length } };
  }

  async createNotification(dto: CreateNotificationDto) {
    const result = await this.getDb().insert(notifications).values(dto);
    return { success: true, data: result, message: 'Notification created' };
  }

  private async notification(id: number, userId: number, companyId: number) {
    if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestException('Invalid notification ID');
    const scope = and(eq(notifications.id,id),this.notificationScope(userId,companyId));
    const rows = await this.getDb().select().from(notifications).where(scope).limit(1);
    if (!rows.length) throw new NotFoundException('Notification not found');
    return scope;
  }

  async markAsRead(id: number, userId: number, companyId: number) {
    const scope = await this.notification(id,userId,companyId);
    await this.getDb().update(notifications).set({status:'read',readAt:new Date()}).where(scope);
    return { success: true, message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: number, companyId: number) {
    await this.getDb().update(notifications).set({status:'read',readAt:new Date()})
      .where(and(this.notificationScope(userId,companyId),eq(notifications.status,'unread')));
    return { success: true, message: 'All notifications marked as read' };
  }

  async dismissNotification(id: number, userId: number, companyId: number) {
    const scope = await this.notification(id,userId,companyId);
    await this.getDb().update(notifications).set({status:'dismissed'}).where(scope);
    return { success: true, message: 'Notification dismissed' };
  }

  // ── Notification Channels ─────────────────────────────────────

  async getNotificationChannels(filters: any = {}) {
    const db = this.getDb();
    let query = db.select().from(notificationChannels);

    if (filters.status) {
      query = query.where(eq(notificationChannels.status, filters.status));
    }

    const result = await query;
    return { success: true, data: result };
  }

  async getNotificationChannel(id: number) {
    const db = this.getDb();
    const channel = await db.select().from(notificationChannels)
      .where(eq(notificationChannels.id, id)).limit(1);
    if (!channel.length) throw new NotFoundException('Channel not found');
    return { success: true, data: channel[0] };
  }

  async createNotificationChannel(dto: any) {
    const db = this.getDb();
    const result = await db.insert(notificationChannels).values(dto);
    return { success: true, data: result, message: 'Channel created' };
  }

  async updateNotificationChannel(id: number, dto: any) {
    const db = this.getDb();
    const existing = await db.select().from(notificationChannels)
      .where(eq(notificationChannels.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Channel not found');

    await db.update(notificationChannels).set(dto).where(eq(notificationChannels.id, id));
    return { success: true, data: dto, message: 'Channel updated' };
  }

  async deleteNotificationChannel(id: number) {
    const db = this.getDb();
    const existing = await db.select().from(notificationChannels)
      .where(eq(notificationChannels.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Channel not found');

    await db.delete(notificationChannels).where(eq(notificationChannels.id, id));
    return { success: true, message: 'Channel deleted' };
  }

  // ── Tags ──────────────────────────────────────────────────────

  async getTags(filters: any = {}) {
    const db = this.getDb();
    let query = db.select().from(tags);

    if (filters.category) {
      query = query.where(eq(tags.category, filters.category));
    }

    const result = await query;
    return { success: true, data: result };
  }

  async getTag(id: number) {
    const db = this.getDb();
    const tag = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
    if (!tag.length) throw new NotFoundException('Tag not found');
    return { success: true, data: tag[0] };
  }

  async createTag(dto: CreateTagDto) {
    const db = this.getDb();
    const result = await db.insert(tags).values(dto);
    return { success: true, data: result, message: 'Tag created' };
  }

  async updateTag(id: number, dto: any) {
    const db = this.getDb();
    const existing = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Tag not found');

    await db.update(tags).set(dto).where(eq(tags.id, id));
    return { success: true, data: dto, message: 'Tag updated' };
  }

  async deleteTag(id: number) {
    const db = this.getDb();
    const existing = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Tag not found');

    // Remove all taggings for this tag
    await db.delete(taggings).where(eq(taggings.tagId, id));
    await db.delete(tags).where(eq(tags.id, id));

    return { success: true, message: 'Tag deleted' };
  }

  async getTagsForRecord(taggableType: string, taggableId: number) {
    const db = this.getDb();
    const taggingRecords = await db.select().from(taggings)
      .where(and(eq(taggings.taggableType, taggableType), eq(taggings.taggableId, taggableId)));

    if (!taggingRecords.length) {
      return { success: true, data: [] };
    }

    const tagIds = taggingRecords.map(t => t.tagId);
    const result = await db.select().from(tags).where(inArray(tags.id, tagIds));

    return { success: true, data: result };
  }

  async tagRecord(tagId: number, taggableType: string, taggableId: number) {
    const db = this.getDb();
    const existing = await db.select().from(taggings)
      .where(and(eq(taggings.tagId, tagId), eq(taggings.taggableType, taggableType), eq(taggings.taggableId, taggableId)))
      .limit(1);

    if (existing.length) {
      return { success: true, data: existing[0], message: 'Tagging already exists' };
    }

    const result = await db.insert(taggings).values({ tagId, taggableType, taggableId });
    return { success: true, data: result, message: 'Tag applied' };
  }

  async untagRecord(tagId: number, taggableType: string, taggableId: number) {
    const db = this.getDb();
    const existing = await db.select().from(taggings)
      .where(and(eq(taggings.tagId, tagId), eq(taggings.taggableType, taggableType), eq(taggings.taggableId, taggableId)))
      .limit(1);

    if (!existing.length) {
      return { success: false, error: 'Tagging not found' };
    }

    await db.delete(taggings).where(eq(taggings.id, existing[0].id));
    return { success: true, message: 'Tag removed' };
  }

  // ── Comments ──────────────────────────────────────────────────

  async getComments(commentableType: string, commentableId: number) {
    const db = this.getDb();
    const result = await db.select().from(comments)
      .where(and(eq(comments.commentableType, commentableType), eq(comments.commentableId, commentableId)));

    return { success: true, data: result };
  }

  async createComment(dto: CreateCommentDto) {
    const db = this.getDb();
    const result = await db.insert(comments).values(dto);
    return { success: true, data: result, message: 'Comment created' };
  }

  async updateComment(id: number, userId: number, dto: any) {
    const db = this.getDb();
    const existing = await db.select().from(comments)
      .where(and(eq(comments.id, id), eq(comments.userId, userId)))
      .limit(1);

    if (!existing.length) throw new NotFoundException('Comment not found');

    await db.update(comments).set({ body: dto.body }).where(eq(comments.id, id));
    return { success: true, data: { body: dto.body }, message: 'Comment updated' };
  }

  async deleteComment(id: number, userId: number) {
    const db = this.getDb();
    const existing = await db.select().from(comments)
      .where(and(eq(comments.id, id), eq(comments.userId, userId)))
      .limit(1);

    if (!existing.length) throw new NotFoundException('Comment not found');

    await db.delete(comments).where(eq(comments.id, id));
    return { success: true, message: 'Comment deleted' };
  }

  // ── Attachments ───────────────────────────────────────────────

  async getAttachments(attachableType: string, attachableId: number) {
    const db = this.getDb();
    const result = await db.select().from(attachments)
      .where(and(eq(attachments.attachableType, attachableType), eq(attachments.attachableId, attachableId)));

    return { success: true, data: result };
  }

  async createAttachment(dto: CreateAttachmentDto) {
    const db = this.getDb();
    const result = await db.insert(attachments).values(dto);
    return { success: true, data: result, message: 'Attachment created' };
  }

  async deleteAttachment(id: number) {
    const db = this.getDb();
    const existing = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Attachment not found');

    await db.delete(attachments).where(eq(attachments.id, id));
    return { success: true, message: 'Attachment deleted' };
  }
}
