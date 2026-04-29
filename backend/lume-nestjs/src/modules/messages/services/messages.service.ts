import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import {
  CreateMessageDto,
  UpdateMessageDto,
  QueryMessagesDto,
  ReplyMessageDto,
} from '../dtos';
import { eq, like, and, ilike } from 'drizzle-orm';

@Injectable()
export class MessagesService {
  private messages: any;

  constructor(private drizzle: DrizzleService) {
    this.initializeSchema();
  }

  private async initializeSchema() {
    try {
      const schema = await import('./models/schema');
      this.messages = schema.messages;
    } catch (error) {
      console.error('Failed to load messages schema:', error);
    }
  }

  async create(data: CreateMessageDto) {
    try {
      const db = this.drizzle.getDrizzle();
      const result = await db.insert(this.messages).values({
        ...data,
        status: data.status || 'new',
        priority: data.priority || 'normal',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        data: { id: result[0].insertId, ...data },
        message: 'Message created successfully',
      };
    } catch (error) {
      console.error('Create message error:', error);
      return {
        success: false,
        error: 'Failed to create message',
      };
    }
  }

  async findById(id: number) {
    try {
      const db = this.drizzle.getDrizzle();
      const result = await db
        .select()
        .from(this.messages)
        .where(eq(this.messages.id, id))
        .limit(1);

      if (!result || result.length === 0) {
        return {
          success: false,
          error: 'Message not found',
        };
      }

      return {
        success: true,
        data: result[0],
      };
    } catch (error) {
      console.error('Find message error:', error);
      return {
        success: false,
        error: 'Failed to fetch message',
      };
    }
  }

  async findAll(options: QueryMessagesDto) {
    try {
      const db = this.drizzle.getDrizzle();
      const {
        page = 1,
        limit = 20,
        status,
        type,
        priority,
        search,
        assignedTo,
      } = options;
      const offset = (page - 1) * limit;

      const conditions: any[] = [];

      if (status) {
        conditions.push(eq(this.messages.status, status));
      }
      if (type) {
        conditions.push(eq(this.messages.type, type));
      }
      if (priority) {
        conditions.push(eq(this.messages.priority, priority));
      }
      if (assignedTo !== undefined) {
        conditions.push(eq(this.messages.assignedTo, assignedTo));
      }
      if (search) {
        conditions.push(
          ilike(this.messages.subject, `%${search}%`)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(this.messages)
          .where(whereClause)
          .orderBy(this.messages.createdAt)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: this.messages.id })
          .from(this.messages)
          .where(whereClause),
      ]);

      const total = countResult[0]?.count || 0;

      return {
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Find all messages error:', error);
      return {
        success: false,
        error: 'Failed to fetch messages',
      };
    }
  }

  async update(id: number, data: UpdateMessageDto) {
    try {
      const db = this.drizzle.getDrizzle();
      const existing = await db
        .select()
        .from(this.messages)
        .where(eq(this.messages.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return {
          success: false,
          error: 'Message not found',
        };
      }

      await db
        .update(this.messages)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(this.messages.id, id));

      return {
        success: true,
        data: { id, ...data },
        message: 'Message updated successfully',
      };
    } catch (error) {
      console.error('Update message error:', error);
      return {
        success: false,
        error: 'Failed to update message',
      };
    }
  }

  async markAsRead(id: number) {
    try {
      const db = this.drizzle.getDrizzle();
      const existing = await db
        .select()
        .from(this.messages)
        .where(eq(this.messages.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return {
          success: false,
          error: 'Message not found',
        };
      }

      await db
        .update(this.messages)
        .set({
          status: 'read',
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(this.messages.id, id));

      return {
        success: true,
        data: { id, status: 'read' },
        message: 'Message marked as read',
      };
    } catch (error) {
      console.error('Mark as read error:', error);
      return {
        success: false,
        error: 'Failed to mark message as read',
      };
    }
  }

  async reply(id: number, data: ReplyMessageDto) {
    try {
      const db = this.drizzle.getDrizzle();
      const existing = await db
        .select()
        .from(this.messages)
        .where(eq(this.messages.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return {
          success: false,
          error: 'Message not found',
        };
      }

      await db
        .update(this.messages)
        .set({
          status: 'replied',
          repliedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(this.messages.id, id));

      return {
        success: true,
        data: { id, status: 'replied' },
        message: 'Message replied successfully',
      };
    } catch (error) {
      console.error('Reply to message error:', error);
      return {
        success: false,
        error: 'Failed to reply to message',
      };
    }
  }

  async delete(id: number) {
    try {
      const db = this.drizzle.getDrizzle();
      const existing = await db
        .select()
        .from(this.messages)
        .where(eq(this.messages.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return {
          success: false,
          error: 'Message not found',
        };
      }

      await db
        .delete(this.messages)
        .where(eq(this.messages.id, id));

      return {
        success: true,
        message: 'Message deleted successfully',
      };
    } catch (error) {
      console.error('Delete message error:', error);
      return {
        success: false,
        error: 'Failed to delete message',
      };
    }
  }

  async getStats() {
    try {
      const db = this.drizzle.getDrizzle();

      const counts = await Promise.all([
        db.select({ count: this.messages.id }).from(this.messages),
        db
          .select({ count: this.messages.id })
          .from(this.messages)
          .where(eq(this.messages.status, 'new')),
        db
          .select({ count: this.messages.id })
          .from(this.messages)
          .where(eq(this.messages.status, 'replied')),
        db
          .select({ count: this.messages.id })
          .from(this.messages)
          .where(eq(this.messages.status, 'archived')),
      ]);

      const total = counts[0][0]?.count || 0;
      const unread = counts[1][0]?.count || 0;
      const replied = counts[2][0]?.count || 0;
      const archived = counts[3][0]?.count || 0;

      return {
        success: true,
        data: {
          total,
          unread,
          read: total - unread,
          replied,
          archived,
        },
      };
    } catch (error) {
      console.error('Get message stats error:', error);
      return {
        success: false,
        error: 'Failed to fetch statistics',
      };
    }
  }

  async getByEmail(email: string) {
    try {
      const db = this.drizzle.getDrizzle();
      const result = await db
        .select()
        .from(this.messages)
        .where(eq(this.messages.senderEmail, email))
        .orderBy(this.messages.createdAt);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Get messages by email error:', error);
      return {
        success: false,
        error: 'Failed to fetch messages',
      };
    }
  }
}
