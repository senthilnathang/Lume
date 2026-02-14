import { get, post, put, del } from '@/api/request';

const BASE = '/advanced_features';

// Webhooks
export const getWebhooks = (params) => get(`${BASE}/webhooks`, { params });
export const getWebhook = (id) => get(`${BASE}/webhooks/${id}`);
export const createWebhook = (data) => post(`${BASE}/webhooks`, data);
export const updateWebhook = (id, data) => put(`${BASE}/webhooks/${id}`, data);
export const deleteWebhook = (id) => del(`${BASE}/webhooks/${id}`);
export const getWebhookLogs = (id, limit) => get(`${BASE}/webhooks/${id}/logs`, { params: { limit } });

// Notifications
export const getNotifications = (params) => get(`${BASE}/notifications`, { params });
export const getUnreadCount = () => get(`${BASE}/notifications/unread-count`);
export const markAsRead = (id) => post(`${BASE}/notifications/${id}/read`);
export const markAllAsRead = () => post(`${BASE}/notifications/read-all`);
export const dismissNotification = (id) => post(`${BASE}/notifications/${id}/dismiss`);

// Notification Channels
export const getNotificationChannels = (params) => get(`${BASE}/notification-channels`, { params });
export const getNotificationChannel = (id) => get(`${BASE}/notification-channels/${id}`);
export const createNotificationChannel = (data) => post(`${BASE}/notification-channels`, data);
export const updateNotificationChannel = (id, data) => put(`${BASE}/notification-channels/${id}`, data);
export const deleteNotificationChannel = (id) => del(`${BASE}/notification-channels/${id}`);

// Tags
export const getTags = (params) => get(`${BASE}/tags`, { params });
export const getTag = (id) => get(`${BASE}/tags/${id}`);
export const createTag = (data) => post(`${BASE}/tags`, data);
export const updateTag = (id, data) => put(`${BASE}/tags/${id}`, data);
export const deleteTag = (id) => del(`${BASE}/tags/${id}`);
export const getTagsForRecord = (type, id) => get(`${BASE}/tags/record/${type}/${id}`);
export const tagRecord = (type, id, tagId) => post(`${BASE}/tags/record/${type}/${id}`, { tagId });
export const untagRecord = (type, id, tagId) => del(`${BASE}/tags/record/${type}/${id}/${tagId}`);

// Comments
export const getComments = (type, id) => get(`${BASE}/comments/${type}/${id}`);
export const createComment = (type, id, data) => post(`${BASE}/comments/${type}/${id}`, data);
export const updateComment = (id, data) => put(`${BASE}/comments/${id}`, data);
export const deleteComment = (id) => del(`${BASE}/comments/${id}`);

// Attachments
export const getAttachments = (type, id) => get(`${BASE}/attachments/${type}/${id}`);
export const createAttachment = (type, id, data) => post(`${BASE}/attachments/${type}/${id}`, data);
export const deleteAttachment = (id) => del(`${BASE}/attachments/${id}`);
