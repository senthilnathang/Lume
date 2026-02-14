/**
 * Messages API
 * API for message/inbox management
 */
import { get, post, put, del } from '@/api/request';

export interface Message {
  id: number;
  subject?: string;
  content: string;
  sender_name?: string;
  sender_email: string;
  sender_phone?: string;
  recipient_email?: string;
  type: 'contact' | 'inquiry' | 'support' | 'feedback' | 'other';
  status: 'new' | 'read' | 'replied' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_starred: boolean;
  metadata?: Record<string, any>;
  read_at?: string;
  replied_at?: string;
  assigned_to?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MessageStats {
  total: number;
  unread: number;
  replied: number;
  archived: number;
}

export interface ReplyData {
  content: string;
  recipient_email?: string;
}

export function getMessages(params?: Record<string, any>): Promise<any> {
  return get('/messages', params);
}

export function getMessage(id: number): Promise<Message> {
  return get<Message>(`/messages/${id}`);
}

export function getMessageStats(): Promise<MessageStats> {
  return get<MessageStats>('/messages/stats');
}

export function updateMessage(id: number, data: Partial<Message>): Promise<Message> {
  return put<Message>(`/messages/${id}`, data);
}

export function markAsRead(id: number): Promise<void> {
  return post(`/messages/${id}/read`);
}

export function replyToMessage(id: number, data: ReplyData): Promise<void> {
  return post(`/messages/${id}/reply`, data);
}

export function deleteMessage(id: number): Promise<void> {
  return del(`/messages/${id}`);
}
