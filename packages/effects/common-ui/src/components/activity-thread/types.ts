/**
 * Activity Thread Type Definitions
 * Types for activity logging and message threading (like Odoo's mail.thread)
 */

export interface ActivityUser {
  id: number;
  full_name: string;
  avatar_url?: string;
}

export interface ActivityMessage {
  id: number;
  model_name: string;
  record_id: number;
  user_id: number | null;
  parent_id: number | null;
  subject: string | null;
  body: string;
  message_type: 'comment' | 'note' | 'system' | 'notification' | 'email' | 'log' | 'approval' | 'rejection' | 'assignment';
  level: 'info' | 'success' | 'warning' | 'error' | 'debug';
  is_internal: boolean;
  is_pinned: boolean;
  attachments: ActivityAttachment[];
  extra_data: Record<string, any>;
  created_at: string;
  updated_at: string | null;
  user: ActivityUser | null;
  replies: ActivityMessage[];
}

export interface ActivityAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface ActivityLog {
  id: number;
  event_id: string;
  user_id: number | null;
  company_id: number | null;
  action: string;
  category: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  entity_type: string;
  entity_id: number | null;
  entity_name: string | null;
  description: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_fields: string[] | null;
  ip_address: string | null;
  success: boolean;
  created_at: string;
  user?: ActivityUser;
}

export interface ActivityThreadProps {
  modelName: string;
  recordId: number;
  readonly?: boolean;
  showMessages?: boolean;
  showActivities?: boolean;
  maxHeight?: string | number;
  /** Access token for API authentication */
  accessToken?: string;
  /** API base URL (defaults to /api/v1) */
  apiBase?: string;
}

export const MESSAGE_TYPE_ICONS: Record<string, string> = {
  comment: 'lucide:message-circle',
  note: 'lucide:sticky-note',
  system: 'lucide:settings',
  notification: 'lucide:bell',
  email: 'lucide:mail',
  log: 'lucide:file-text',
  approval: 'lucide:check-circle',
  rejection: 'lucide:x-circle',
  assignment: 'lucide:user-plus',
};

export const MESSAGE_TYPE_COLORS: Record<string, string> = {
  comment: '#1890ff',
  note: '#faad14',
  system: '#722ed1',
  notification: '#13c2c2',
  email: '#eb2f96',
  log: '#8c8c8c',
  approval: '#52c41a',
  rejection: '#f5222d',
  assignment: '#fa8c16',
};

export const ACTIVITY_ACTION_ICONS: Record<string, string> = {
  create: 'lucide:plus-circle',
  read: 'lucide:eye',
  update: 'lucide:edit',
  delete: 'lucide:trash-2',
  view: 'lucide:eye',
  share: 'lucide:share-2',
  export: 'lucide:download',
  import: 'lucide:upload',
  approve: 'lucide:check',
  reject: 'lucide:x',
  submit: 'lucide:send',
  archive: 'lucide:archive',
  restore: 'lucide:rotate-ccw',
  comment: 'lucide:message-square',
  assign: 'lucide:user-plus',
  unassign: 'lucide:user-minus',
};

export const LEVEL_COLORS: Record<string, string> = {
  info: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#f5222d',
  debug: '#8c8c8c',
  critical: '#cf1322',
};
