/**
 * Advanced Features Models
 */

import { DataTypes } from 'sequelize';

export const WebhookModel = (sequelize) => {
  const Webhook = sequelize.define('Webhook', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    events: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    headers: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    secret: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      field: 'retry_count'
    },
    lastTriggeredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_triggered_at'
    },
    lastStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'last_status'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'error'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'webhooks',
    timestamps: true,
    underscored: true
  });

  return Webhook;
};

export const WebhookLogModel = (sequelize) => {
  const WebhookLog = sequelize.define('WebhookLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    webhookId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'webhook_id'
    },
    event: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    payload: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    responseStatus: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'response_status'
    },
    responseBody: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'response_body'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('success', 'failed', 'pending'),
      defaultValue: 'pending'
    }
  }, {
    tableName: 'webhook_logs',
    timestamps: true,
    underscored: true
  });

  return WebhookLog;
};

export const NotificationModel = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('info', 'success', 'warning', 'error', 'action'),
      defaultValue: 'info'
    },
    channel: {
      type: DataTypes.ENUM('in_app', 'email', 'sms', 'push'),
      defaultValue: 'in_app'
    },
    relatedModel: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'related_model'
    },
    relatedId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'related_id'
    },
    actionUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'action_url'
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'read_at'
    },
    status: {
      type: DataTypes.ENUM('unread', 'read', 'dismissed'),
      defaultValue: 'unread'
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true
  });

  return Notification;
};

export const NotificationChannelModel = (sequelize) => {
  const NotificationChannel = sequelize.define('NotificationChannel', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    channelType: {
      type: DataTypes.ENUM('email', 'sms', 'push', 'slack', 'webhook'),
      allowNull: false,
      field: 'channel_type'
    },
    config: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_default'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'notification_channels',
    timestamps: true,
    underscored: true
  });

  return NotificationChannel;
};

export const TagModel = (sequelize) => {
  const Tag = sequelize.define('Tag', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    color: {
      type: DataTypes.STRING(20),
      defaultValue: '#1890ff'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    tableName: 'tags',
    timestamps: true,
    underscored: true
  });

  return Tag;
};

export const TaggingModel = (sequelize) => {
  const Tagging = sequelize.define('Tagging', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'tag_id'
    },
    taggableType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'taggable_type'
    },
    taggableId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'taggable_id'
    }
  }, {
    tableName: 'taggings',
    timestamps: true,
    underscored: true
  });

  return Tagging;
};

export const CommentModel = (sequelize) => {
  const Comment = sequelize.define('Comment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    commentableType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'commentable_type'
    },
    commentableId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'commentable_id'
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'parent_id'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id'
    }
  }, {
    tableName: 'comments',
    timestamps: true,
    underscored: true
  });

  return Comment;
};

export const AttachmentModel = (sequelize) => {
  const Attachment = sequelize.define('Attachment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'file_name'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'file_path'
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'file_size'
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'mime_type'
    },
    attachableType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'attachable_type'
    },
    attachableId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'attachable_id'
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'uploaded_by'
    }
  }, {
    tableName: 'attachments',
    timestamps: true,
    underscored: true
  });

  return Attachment;
};

export default {
  WebhookModel,
  WebhookLogModel,
  NotificationModel,
  NotificationChannelModel,
  TagModel,
  TaggingModel,
  CommentModel,
  AttachmentModel
};
